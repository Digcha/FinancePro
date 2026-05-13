import { NextResponse } from "next/server";
import { invoiceAIService } from "@/lib/ai/invoice-ai-service";
import { AIInvoiceExtractionError } from "@/lib/ai/types";
import { documentProcessingService, type StoredInvoicePage } from "@/lib/documents/document-processing-service";
import { prisma } from "@/lib/prisma";
import { getInvoiceById } from "@/server/repositories/invoiceRepository";
import { invoiceAIPersistenceService } from "@/server/services/invoiceAiPersistenceService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function toStoredPages(invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>): StoredInvoicePage[] {
  return invoice.pages.map((page) => ({
    fileName: page.fileName,
    originalFilePath: page.originalFilePath,
    previewImagePath: page.previewImagePath,
    pageNumberDetected: page.pageNumberDetected,
    totalPagesDetected: page.totalPagesDetected,
    qualityStatus: page.qualityStatus,
    sharpnessScore: page.sharpnessScore,
    completenessScore: page.completenessScore,
    perspectiveScore: page.perspectiveScore,
    extractedText: page.extractedText
  }));
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const providerStatus = invoiceAIService.getProviderStatus();
  const pages = toStoredPages(invoice);

  try {
    await prisma.auditLog.create({
      data: {
        invoiceId: invoice.id,
        action: "AI_ANALYSIS_STARTED",
        description: "Analyse wurde manuell erneut gestartet. Kann API-Kosten verursachen.",
        actor: "Demo User"
      }
    });

    const aiInput = await documentProcessingService.buildAIInputFromStoredPages({
      invoiceId: invoice.id,
      originalFileName: invoice.pages.map((page) => page.fileName).join(", "),
      mimeType: invoice.pages[0]?.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      pages
    });
    const aiResult = await invoiceAIService.extractInvoice(aiInput);
    await invoiceAIPersistenceService.replaceAnalysis(invoice.id, aiResult, providerStatus, pages);

    return NextResponse.json({
      invoiceId: invoice.id,
      status: "review_required",
      aiMode: providerStatus.mode,
      aiMessage: providerStatus.message
    });
  } catch (error) {
    const aiError =
      error instanceof AIInvoiceExtractionError
        ? error
        : new AIInvoiceExtractionError("AI_PROVIDER_ERROR", "Analyse konnte nicht abgeschlossen werden.", error);

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        aiProvider: providerStatus.providerName,
        aiModel: providerStatus.modelName,
        aiMode: providerStatus.mode,
        aiStatus: "failed",
        aiErrorCode: aiError.code,
        aiErrorMessage: aiError.message,
        status: "review_required",
        auditLogs: {
          create: {
            action: "AI_ANALYSIS_FAILED",
            description: `${aiError.code}: ${aiError.message}`,
            actor: providerStatus.mode === "mock" ? "MockInvoiceProvider" : "OpenAIInvoiceProvider"
          }
        }
      }
    });

    return NextResponse.json(
      {
        error: aiError.message,
        code: aiError.code,
        aiMode: providerStatus.mode,
        aiMessage: providerStatus.message
      },
      { status: 200 }
    );
  }
}

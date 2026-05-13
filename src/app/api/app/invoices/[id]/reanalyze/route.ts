import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/session";
import { canReviewInvoice } from "@/lib/auth/permissions";
import { assertInvoiceAccess } from "@/lib/db/tenant-scope";
import { forbidden, jsonError } from "@/lib/http/api-errors";
import { documentProcessingService, type StoredInvoicePage } from "@/lib/documents/document-processing-service";
import { invoiceAIService } from "@/lib/ai/invoice-ai-service";
import { prisma } from "@/lib/prisma";
import { invoiceAIPersistenceService } from "@/server/services/invoiceAiPersistenceService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function toStoredPages(invoice: NonNullable<Awaited<ReturnType<typeof assertInvoiceAccess>>>): StoredInvoicePage[] {
  return invoice.pages.map((page) => ({
    fileName: page.fileName,
    mimeType: page.mimeType,
    originalFilePath: page.originalFilePath,
    previewImagePath: page.previewImagePath,
    pageImagePath: page.pageImagePath,
    thumbnailPath: page.thumbnailPath,
    originalPageFilePath: page.originalPageFilePath,
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
  const apiSession = await getApiSession();
  if (!apiSession.ok) {
    return jsonError(apiSession.message, apiSession.status, apiSession.code);
  }
  if (!canReviewInvoice(apiSession.session)) {
    return forbidden("Ihre Rolle darf keine erneute Analyse starten.");
  }

  const { id } = await context.params;
  const invoice = await assertInvoiceAccess(id, apiSession.session);
  if (!invoice) {
    return jsonError("Rechnung wurde nicht gefunden.", 404, "INVOICE_NOT_FOUND");
  }

  const pages = toStoredPages(invoice);
  const providerStatus = invoiceAIService.getProviderStatus();

  await prisma.invoice.update({
    where: { id },
    data: {
      aiStatus: "processing",
      status: "analyzing",
      currentWorkflowStep: "analysis",
      auditLogs: {
        create: {
          tenantId: invoice.tenantId,
          actorUserId: apiSession.session.userId,
          action: "AI_ANALYSIS_STARTED",
          actionType: "AI_ANALYSIS_STARTED",
          description: "Analyse wurde erneut gestartet.",
          actor: apiSession.session.username
        }
      }
    }
  });

  try {
    const aiInput = await documentProcessingService.buildAIInputFromStoredPages({
      invoiceId: id,
      originalFileName: invoice.originalFileName ?? invoice.pages[0]?.fileName ?? "invoice",
      mimeType: invoice.originalMimeType ?? "application/octet-stream",
      pages
    });
    const aiResult = await invoiceAIService.extractInvoice(aiInput);
    await invoiceAIPersistenceService.replaceAnalysis(id, aiResult, providerStatus, pages);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await prisma.invoice.update({
      where: { id },
      data: {
        aiStatus: "failed",
        status: "review_required",
        currentWorkflowStep: "review",
        aiErrorCode: error instanceof Error ? error.name : "AI_PROVIDER_ERROR",
        aiErrorMessage: "Analyse konnte nicht abgeschlossen werden.",
        auditLogs: {
          create: {
            tenantId: invoice.tenantId,
            actorUserId: apiSession.session.userId,
            action: "AI_ANALYSIS_FAILED",
            actionType: "AI_ANALYSIS_FAILED",
            description: "Analyse konnte nicht abgeschlossen werden.",
            actor: apiSession.session.username
          }
        }
      }
    });

    return jsonError("Analyse konnte nicht abgeschlossen werden. Die Rechnung bleibt zur Prüfung offen.", 500, "AI_PROVIDER_ERROR");
  }
}

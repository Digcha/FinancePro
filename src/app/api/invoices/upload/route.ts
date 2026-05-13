import { NextResponse } from "next/server";
import { invoiceAIService } from "@/lib/ai/invoice-ai-service";
import { AIInvoiceExtractionError } from "@/lib/ai/types";
import {
  documentProcessingService,
  DocumentProcessingError,
  type UploadedDocumentFile
} from "@/lib/documents/document-processing-service";
import { invoiceAIPersistenceService } from "@/server/services/invoiceAiPersistenceService";

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

async function uploadedFileFromFormFile(file: File): Promise<UploadedDocumentFile> {
  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    buffer: Buffer.from(await file.arrayBuffer())
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const formFiles = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (formFiles.length === 0) {
      return jsonError("Keine Dateien im Upload gefunden.", 400, "DOC_NO_READABLE_PAGES");
    }

    const files = await Promise.all(formFiles.map(uploadedFileFromFormFile));
    const processed = await documentProcessingService.processUploadedFiles(files);
    const providerStatus = invoiceAIService.getProviderStatus();

    try {
      const aiResult = await invoiceAIService.extractInvoice(processed.aiInput);
      const invoice = await invoiceAIPersistenceService.createFromAIResult({
        pages: processed.pages,
        aiResult,
        providerStatus
      });

      return NextResponse.json({
        invoiceId: invoice.id,
        status: invoice.status,
        aiMode: providerStatus.mode,
        aiMessage: providerStatus.message
      });
    } catch (error) {
      const invoice = await invoiceAIPersistenceService.createFailedAnalysis({
        pages: processed.pages,
        providerStatus,
        error
      });
      const aiError =
        error instanceof AIInvoiceExtractionError
          ? error
          : new AIInvoiceExtractionError("AI_PROVIDER_ERROR", "Analyse konnte nicht abgeschlossen werden.", error);

      return NextResponse.json({
        invoiceId: invoice.id,
        status: invoice.status,
        aiMode: providerStatus.mode,
        aiMessage: providerStatus.message,
        warning: aiError.message,
        code: aiError.code
      });
    }
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      return jsonError(error.message, error.status, error.code);
    }

    return jsonError("Upload konnte nicht verarbeitet werden. Bitte erneut versuchen.", 500, "DATABASE_OR_UPLOAD_ERROR");
  }
}

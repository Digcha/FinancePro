import { financeProConfig } from "@/lib/config";
import type { InvoiceAIInput } from "@/lib/ai/types";
import type { StoredInvoicePage } from "@/lib/documents/document-processing-service";

export class DocumentPreparationService {
  buildInput(params: {
    invoiceId: string;
    originalFileName: string;
    mimeType: string;
    pages: StoredInvoicePage[];
    sourceFiles?: InvoiceAIInput["sourceFiles"];
  }): InvoiceAIInput {
    if (params.pages.length > financeProConfig.aiMaxPagesPerAnalysis) {
      throw new Error("AI_TOO_MANY_PAGES");
    }

    return {
      invoiceId: params.invoiceId,
      originalFileName: params.originalFileName,
      mimeType: params.mimeType,
      pageCount: params.pages.length,
      pages: params.pages.map((page, index) => ({
        pageNumber: page.pageNumberDetected ?? index + 1,
        mimeType: page.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        fileName: page.fileName,
        text: page.extractedText,
        qualityWarnings: page.qualityStatus === "accepted" ? [] : [`Seitenstatus ${page.qualityStatus}`]
      })),
      sourceFiles: params.sourceFiles,
      locale: "de-AT",
      currencyHint: "EUR"
    };
  }
}

export const documentPreparationService = new DocumentPreparationService();

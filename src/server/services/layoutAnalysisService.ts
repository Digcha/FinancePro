import type { InvoicePageInput } from "@/server/domain/types";
import type { LayoutAnalysisService } from "./interfaces";

export class MockLayoutAnalysisService implements LayoutAnalysisService {
  extractFooterSignals(pages: InvoicePageInput[]) {
    for (const page of [...pages].reverse()) {
      const iban = page.extractedText.match(/\bAT\d{18}\b/);
      const bic = page.extractedText.match(/\b[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/);
      const uid = page.extractedText.match(/\bATU\d{8}\b/);
      const companyRegisterNumber = page.extractedText.match(/\bFN\s?\d+[a-z]\b/i);

      if (iban || bic || uid || companyRegisterNumber) {
        return {
          iban: iban?.[0],
          bic: bic?.[0],
          uid: uid?.[0],
          companyRegisterNumber: companyRegisterNumber?.[0],
          sourcePageNumber: page.pageNumberDetected ?? undefined
        };
      }
    }

    return {};
  }
}

export const layoutAnalysisService = new MockLayoutAnalysisService();

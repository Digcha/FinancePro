import type { InvoicePageInput } from "@/server/domain/types";
import type { PageGroupingService } from "./interfaces";

export class DefaultPageGroupingService implements PageGroupingService {
  detectMissingPages(pages: InvoicePageInput[]): number[] {
    const totals = pages
      .map((page) => page.totalPagesDetected)
      .filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value > 0);
    const detectedTotal = totals.length > 0 ? Math.max(...totals) : pages.length;
    const seen = new Set(
      pages
        .map((page) => page.pageNumberDetected)
        .filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value > 0)
    );

    const missing: number[] = [];
    for (let pageNumber = 1; pageNumber <= detectedTotal; pageNumber += 1) {
      if (!seen.has(pageNumber)) {
        missing.push(pageNumber);
      }
    }

    return missing;
  }

  isLikelySingleInvoice(pages: InvoicePageInput[]): boolean {
    if (pages.length <= 1) {
      return true;
    }

    const invoiceNumbers = new Set<string>();
    const supplierHints = new Set<string>();

    for (const page of pages) {
      const invoiceNumber = page.extractedText.match(/(?:rechnung|rechnungsnr\.?|nr\.)\s*:?\s*([A-Z0-9-]{4,})/i);
      if (invoiceNumber?.[1]) {
        invoiceNumbers.add(invoiceNumber[1]);
      }

      const supplier = page.extractedText.match(/([A-ZÄÖÜ][A-Za-zÄÖÜäöüß &.-]+(?:GmbH|KG|AG|e\.U\.))/);
      if (supplier?.[1]) {
        supplierHints.add(supplier[1].toLowerCase());
      }
    }

    return invoiceNumbers.size <= 1 && supplierHints.size <= 1;
  }
}

export const pageGroupingService = new DefaultPageGroupingService();

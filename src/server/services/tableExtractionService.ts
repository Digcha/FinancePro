import type { InvoiceLineItemInput } from "@/server/domain/types";
import type { TableExtractionService } from "./interfaces";

export class MockTableExtractionService implements TableExtractionService {
  mergeLineItemsAcrossPages(items: InvoiceLineItemInput[]): InvoiceLineItemInput[] {
    return [...items].sort((a, b) => {
      const pageA = a.sourcePageNumber ?? 0;
      const pageB = b.sourcePageNumber ?? 0;
      if (pageA !== pageB) {
        return pageA - pageB;
      }

      return (a.positionNumber ?? "").localeCompare(b.positionNumber ?? "", "de-AT", {
        numeric: true
      });
    });
  }
}

export const tableExtractionService = new MockTableExtractionService();

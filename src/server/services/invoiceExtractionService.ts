import type { DocumentType } from "@/server/domain/types";
import type { InvoiceExtractionService } from "./interfaces";

export class MockInvoiceExtractionService implements InvoiceExtractionService {
  inferDocumentType(text: string): DocumentType {
    const normalized = text.toLowerCase();

    if (normalized.includes("kostenvorschreibung") || normalized.includes("gebührenvorschreibung")) {
      return "cost_assessment";
    }

    if (normalized.includes("mietrechnung") || normalized.includes("mietdauer")) {
      return "rental_invoice";
    }

    if (normalized.includes("gutschrift")) {
      return "credit_note";
    }

    if (normalized.includes("beleg") || normalized.includes("quittung")) {
      return "receipt";
    }

    if (normalized.includes("rechnung")) {
      return "invoice";
    }

    return "unknown";
  }
}

export const invoiceExtractionService = new MockInvoiceExtractionService();

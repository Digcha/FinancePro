import type { InvoiceValidationInput } from "@/server/domain/types";

export class DefaultAuditLogService {
  describeSystemAction(action: string, invoice: InvoiceValidationInput): string {
    const number = invoice.invoiceNumber ?? "ohne Rechnungsnummer";

    switch (action) {
      case "DOCUMENT_UPLOADED":
        return `Dokumentgruppe für ${number} wurde hochgeladen.`;
      case "QUALITY_CHECK_COMPLETED":
        return `Dokumentqualität für ${number} wurde geprüft.`;
      case "EXTRACTION_COMPLETED":
        return `Mockbasierte Extraktion für ${number} wurde gespeichert.`;
      case "RULE_CHECK_COMPLETED":
        return `§ 11 UStG-Prüfung für ${number} wurde ausgeführt.`;
      case "BOOKING_SUGGESTION_CREATED":
        return `Buchungsvorschlag für ${number} wurde erzeugt.`;
      default:
        return `${action} für ${number}.`;
    }
  }
}

export const auditLogService = new DefaultAuditLogService();

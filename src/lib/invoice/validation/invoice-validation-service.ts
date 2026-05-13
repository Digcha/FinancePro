import type { AnalysisContext, InvoiceValidationInput, ValidationResultInput } from "@/server/domain/types";
import { pageGroupingService } from "@/server/services/pageGroupingService";
import { validateAmountConsistency } from "./amount-validation";
import { validateAustrianUid, validateIban } from "./austrian-vat-validation";
import { validateMandatoryInvoiceFields } from "./mandatory-fields-validation";

function sourcePageForText(invoice: InvoiceValidationInput, value: unknown): number | null {
  if (!value) {
    return null;
  }

  const text = String(value);
  const page = invoice.pages?.find((candidate) => candidate.extractedText.includes(text));
  return page?.pageNumberDetected ?? null;
}

function result(
  field: string,
  status: ValidationResultInput["status"],
  severity: ValidationResultInput["severity"],
  explanation: string,
  sourcePageNumber: number | null = null
): ValidationResultInput {
  return {
    field,
    status,
    severity,
    explanation,
    sourcePageNumber
  };
}

export class DeterministicInvoiceValidationService {
  validate(invoice: InvoiceValidationInput, context: AnalysisContext = {}): ValidationResultInput[] {
    const results: ValidationResultInput[] = validateMandatoryInvoiceFields(invoice).map((check) => ({
      ...check,
      sourcePageNumber: check.sourcePageNumber ?? sourcePageForText(invoice, invoice[check.field as keyof InvoiceValidationInput])
    }));

    const amount = validateAmountConsistency({
      netAmount: invoice.netAmount,
      taxAmount: invoice.taxAmount,
      grossAmount: invoice.grossAmount,
      taxRate: invoice.taxRate,
      zeroTaxReason: invoice.zeroTaxReason
    });
    results.push(result("grossAmount", amount.status, amount.severity, amount.message, sourcePageForText(invoice, invoice.grossAmount)));

    const uid = validateAustrianUid(invoice.supplierUid);
    results.push(result("supplierUid", uid.status, uid.severity, uid.message, sourcePageForText(invoice, invoice.supplierUid)));

    const iban = validateIban(invoice.supplierIban);
    results.push(result("supplierIban", iban.status, iban.severity, iban.message, sourcePageForText(invoice, invoice.supplierIban)));

    const customerUidRequired = (invoice.grossAmount ?? 0) > 10000;
    if (customerUidRequired) {
      const customerUid = validateAustrianUid(invoice.customerUid);
      results.push(
        result(
          "customerUid",
          invoice.customerUid ? customerUid.status : "warning",
          invoice.customerUid ? customerUid.severity : "warning",
          invoice.customerUid
            ? customerUid.message
            : "Empfaenger-UID sollte bei hohen Bruttobetraegen geprueft oder ergaenzt werden.",
          sourcePageForText(invoice, invoice.customerUid)
        )
      );
    } else {
      results.push(result("customerUid", "not_applicable", "info", "Empfaenger-UID ist anhand des erkannten Betrags nicht zwingend erforderlich."));
    }

    const missingPages = pageGroupingService.detectMissingPages(invoice.pages ?? []);
    results.push(
      result(
        "pages",
        missingPages.length === 0 ? "pass" : "warning",
        missingPages.length === 0 ? "info" : "warning",
        missingPages.length === 0
          ? "Seitennummern wirken vollstaendig."
          : `Moeglicherweise fehlen Seite(n): ${missingPages.join(", ")}.`
      )
    );

    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : null;
    const today = context.today ?? new Date();
    if (invoiceDate && !Number.isNaN(invoiceDate.getTime()) && invoiceDate.getTime() > today.getTime()) {
      results.push(result("invoiceDate", "warning", "warning", "Rechnungsdatum liegt in der Zukunft.", sourcePageForText(invoice, invoice.invoiceDate)));
    }

    const duplicate = context.duplicateCandidates?.find(
      (candidate) =>
        candidate.id !== invoice.id &&
        candidate.invoiceNumber &&
        invoice.invoiceNumber &&
        candidate.invoiceNumber === invoice.invoiceNumber &&
        candidate.supplierName?.toLowerCase() === invoice.supplierName?.toLowerCase()
    );
    if (duplicate) {
      results.push(
        result(
          "invoiceNumber",
          "error",
          "error",
          "Gleiche Rechnungsnummer wurde bereits beim selben Lieferanten gefunden.",
          sourcePageForText(invoice, invoice.invoiceNumber)
        )
      );
    }

    const knownSupplier = context.knownSuppliers?.find(
      (supplier) => supplier.name.toLowerCase() === invoice.supplierName?.toLowerCase()
    );
    if (
      knownSupplier?.knownIban &&
      invoice.supplierIban &&
      knownSupplier.knownIban.replace(/\s/g, "") !== invoice.supplierIban.replace(/\s/g, "")
    ) {
      results.push(result("supplierIban", "warning", "warning", "IBAN weicht von bekannten Lieferantendaten ab.", sourcePageForText(invoice, invoice.supplierIban)));
    }

    return results;
  }
}

export const deterministicInvoiceValidationService = new DeterministicInvoiceValidationService();

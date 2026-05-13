import type { InvoiceValidationInput, ValidationResultInput } from "@/server/domain/types";

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

function required(field: string, label: string, value: unknown): ValidationResultInput {
  return {
    field,
    status: hasValue(value) ? "pass" : "error",
    severity: hasValue(value) ? "info" : "error",
    explanation: hasValue(value) ? `${label} wurde erkannt.` : `${label} wurde nicht erkannt.`,
    sourcePageNumber: null
  };
}

export function validateMandatoryInvoiceFields(invoice: InvoiceValidationInput): ValidationResultInput[] {
  const hasServiceDate = hasValue(invoice.deliveryDate) || hasValue(invoice.servicePeriod);
  const hasDescription = (invoice.lineItems ?? []).some((item) => hasValue(item.description));

  return [
    required("supplierName", "Name des Lieferanten", invoice.supplierName),
    required("supplierAddress", "Anschrift des Lieferanten", invoice.supplierAddress),
    required("customerName", "Name des Empfaengers", invoice.customerName),
    required("customerAddress", "Anschrift des Empfaengers", invoice.customerAddress),
    required("invoiceNumber", "Fortlaufende Rechnungsnummer", invoice.invoiceNumber),
    required("invoiceDate", "Rechnungsdatum", invoice.invoiceDate),
    {
      field: "deliveryDate",
      status: hasServiceDate ? "pass" : "error",
      severity: hasServiceDate ? "info" : "error",
      explanation: hasServiceDate
        ? "Leistungsdatum oder Leistungszeitraum wurde erkannt."
        : "Leistungsdatum oder Leistungszeitraum wurde nicht erkannt.",
      sourcePageNumber: null
    },
    {
      field: "lineItems",
      status: hasDescription ? "pass" : "error",
      severity: hasDescription ? "info" : "error",
      explanation: hasDescription
        ? "Mindestens eine Leistungsbeschreibung wurde erkannt."
        : "Keine Leistungsbeschreibung oder Position wurde erkannt.",
      sourcePageNumber: invoice.lineItems?.[0]?.sourcePageNumber ?? null
    }
  ];
}

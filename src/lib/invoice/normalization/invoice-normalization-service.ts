import type { ExtractedField, InvoiceAIExtractionResult } from "@/lib/ai/types";
import type { InvoiceLineItemInput, InvoiceValidationInput } from "@/server/domain/types";

export interface NormalizedExtractedField {
  fieldPath: string;
  label: string;
  aiValue: string | null;
  finalValue: string | null;
  valueType: "string" | "number" | "date" | "array" | "boolean";
  confidence: number;
  sourcePageNumber: number | null;
  sourceText: string | null;
  needsReview: boolean;
  boundingBoxJson: string | null;
}

export interface NormalizedInvoiceProjection {
  invoice: InvoiceValidationInput & {
    supplierBic?: string | null;
    supplierCompanyRegisterNumber?: string | null;
    customerNumber?: string | null;
    orderNumber?: string | null;
    paymentTerms?: string | null;
    paymentReference?: string | null;
  };
  extractedFields: NormalizedExtractedField[];
  lineItems: InvoiceLineItemInput[];
  zeroTaxReason: string | null;
}

function valueToString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

export function parseGermanNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value
    .replace(/\u00a0/g, " ")
    .replace(/\bEUR\b/gi, "")
    .replace(/[€]/g, "")
    .trim();
  if (!/\d/.test(trimmed)) {
    return null;
  }

  const negative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith("-");
  const unsigned = trimmed.replace(/[()]/g, "").replace(/^\+|-/, "").replace(/\s/g, "");
  const normalized = unsigned.includes(",")
    ? unsigned.replace(/\./g, "").replace(",", ".")
    : unsigned.replace(/(?<=\d)\.(?=\d{3}\b)/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : null;
}

export function normalizePercent(value: unknown): number | null {
  if (typeof value === "string") {
    return parseGermanNumber(value.replace("%", ""));
  }

  return parseGermanNumber(value);
}

export function normalizeDateToISO(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const german = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (german) {
    const day = german[1].padStart(2, "0");
    const month = german[2].padStart(2, "0");
    const year = german[3].length === 2 ? `20${german[3]}` : german[3];
    return `${year}-${month}-${day}`;
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export function normalizeIban(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s/g, "").toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeUid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s/g, "").toUpperCase();
  if (/^ATU\d{8}$/.test(normalized)) {
    return normalized;
  }

  if (/^U\d{8}$/.test(normalized)) {
    return `AT${normalized}`;
  }

  return normalized.length > 0 ? normalized : null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return value === null || value === undefined ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function fieldRecord<T>(
  fieldPath: string,
  label: string,
  field: ExtractedField<T>,
  valueType: NormalizedExtractedField["valueType"],
  finalValue: string | null
): NormalizedExtractedField {
  return {
    fieldPath,
    label,
    aiValue: valueToString(field.value),
    finalValue,
    valueType,
    confidence: field.confidence,
    sourcePageNumber: field.sourcePage,
    sourceText: field.sourceText,
    needsReview: field.needsReview,
    boundingBoxJson: field.boundingBox ? JSON.stringify(field.boundingBox) : null
  };
}

function dateField(value: unknown): Date | null {
  const iso = normalizeDateToISO(value);
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

export class InvoiceNormalizationService {
  normalizeAIResult(result: InvoiceAIExtractionResult): NormalizedInvoiceProjection {
    const invoiceDateIso = normalizeDateToISO(result.invoice.invoiceDate.value);
    const serviceDateIso = normalizeDateToISO(result.invoice.serviceDate.value);
    const servicePeriodStartIso = normalizeDateToISO(result.invoice.servicePeriodStart.value);
    const servicePeriodEndIso = normalizeDateToISO(result.invoice.servicePeriodEnd.value);
    const servicePeriod =
      servicePeriodStartIso || servicePeriodEndIso
        ? [servicePeriodStartIso, servicePeriodEndIso].filter(Boolean).join(" bis ")
        : normalizeString(result.invoice.serviceDate.value);
    const taxRates = result.amounts.taxRates.value ?? [];
    const primaryTaxRate = taxRates.length > 0 ? normalizePercent(taxRates[0]) : null;
    const zeroTaxReason = result.specialTaxTreatment.reasonText;

    const extractedFields: NormalizedExtractedField[] = [
      fieldRecord("supplier.name", "Lieferant", result.supplier.name, "string", normalizeString(result.supplier.name.value)),
      fieldRecord("supplier.address", "Lieferantenadresse", result.supplier.address, "string", normalizeString(result.supplier.address.value)),
      fieldRecord("supplier.uidNumber", "UID Lieferant", result.supplier.uidNumber, "string", normalizeUid(result.supplier.uidNumber.value)),
      fieldRecord("supplier.taxNumber", "Steuernummer Lieferant", result.supplier.taxNumber, "string", normalizeString(result.supplier.taxNumber.value)),
      fieldRecord(
        "supplier.companyRegisterNumber",
        "Firmenbuchnummer",
        result.supplier.companyRegisterNumber,
        "string",
        normalizeString(result.supplier.companyRegisterNumber.value)
      ),
      fieldRecord("supplier.iban", "IBAN", result.supplier.iban, "string", normalizeIban(result.supplier.iban.value)),
      fieldRecord("supplier.bic", "BIC", result.supplier.bic, "string", normalizeString(result.supplier.bic.value)?.toUpperCase() ?? null),
      fieldRecord("customer.name", "Empfaenger", result.customer.name, "string", normalizeString(result.customer.name.value)),
      fieldRecord("customer.address", "Empfaengeradresse", result.customer.address, "string", normalizeString(result.customer.address.value)),
      fieldRecord("customer.uidNumber", "UID Empfaenger", result.customer.uidNumber, "string", normalizeUid(result.customer.uidNumber.value)),
      fieldRecord("invoice.invoiceNumber", "Rechnungsnummer", result.invoice.invoiceNumber, "string", normalizeString(result.invoice.invoiceNumber.value)),
      fieldRecord("invoice.invoiceDate", "Rechnungsdatum", result.invoice.invoiceDate, "date", invoiceDateIso),
      fieldRecord("invoice.serviceDate", "Leistungsdatum", result.invoice.serviceDate, "date", serviceDateIso),
      fieldRecord("invoice.servicePeriodStart", "Leistungszeitraum Start", result.invoice.servicePeriodStart, "date", servicePeriodStartIso),
      fieldRecord("invoice.servicePeriodEnd", "Leistungszeitraum Ende", result.invoice.servicePeriodEnd, "date", servicePeriodEndIso),
      fieldRecord("invoice.currency", "Waehrung", result.invoice.currency, "string", normalizeString(result.invoice.currency.value)?.toUpperCase() ?? "EUR"),
      fieldRecord("invoice.paymentTerms", "Zahlungsbedingungen", result.invoice.paymentTerms, "string", normalizeString(result.invoice.paymentTerms.value)),
      fieldRecord("invoice.dueDate", "Faelligkeit", result.invoice.dueDate, "date", normalizeDateToISO(result.invoice.dueDate.value)),
      fieldRecord("invoice.orderReference", "Bestellreferenz", result.invoice.orderReference, "string", normalizeString(result.invoice.orderReference.value)),
      fieldRecord("invoice.customerNumber", "Kundennummer", result.invoice.customerNumber, "string", normalizeString(result.invoice.customerNumber.value)),
      fieldRecord("amounts.netAmount", "Netto", result.amounts.netAmount, "number", valueToString(parseGermanNumber(result.amounts.netAmount.value))),
      fieldRecord("amounts.taxAmount", "USt", result.amounts.taxAmount, "number", valueToString(parseGermanNumber(result.amounts.taxAmount.value))),
      fieldRecord("amounts.grossAmount", "Brutto", result.amounts.grossAmount, "number", valueToString(parseGermanNumber(result.amounts.grossAmount.value))),
      fieldRecord("amounts.taxRates", "Steuersaetze", result.amounts.taxRates, "array", valueToString(taxRates.map((rate) => normalizePercent(rate)).filter((rate) => rate !== null))),
      fieldRecord("amounts.discountAmount", "Rabatt", result.amounts.discountAmount, "number", valueToString(parseGermanNumber(result.amounts.discountAmount.value))),
      fieldRecord(
        "amounts.roundingDifference",
        "Rundungsdifferenz",
        result.amounts.roundingDifference,
        "number",
        valueToString(parseGermanNumber(result.amounts.roundingDifference.value))
      )
    ];

    const lineItems: InvoiceLineItemInput[] = result.lineItems.map((item) => ({
      sourcePageNumber: item.sourcePage,
      positionNumber: item.positionNumber,
      quantity: parseGermanNumber(item.quantity),
      unit: item.unit,
      description: item.description,
      unitPrice: parseGermanNumber(item.unitPrice),
      discountPercent: normalizePercent(item.discountPercent),
      netAmount: parseGermanNumber(item.netAmount),
      taxRate: normalizePercent(item.taxRate),
      grossAmount: parseGermanNumber(item.grossAmount),
      confidence: item.confidence
    }));

    return {
      invoice: {
        documentType: result.document.documentType,
        supplierName: normalizeString(result.supplier.name.value),
        supplierAddress: normalizeString(result.supplier.address.value),
        supplierUid: normalizeUid(result.supplier.uidNumber.value),
        supplierIban: normalizeIban(result.supplier.iban.value),
        supplierBic: normalizeString(result.supplier.bic.value)?.toUpperCase() ?? null,
        supplierCompanyRegisterNumber: normalizeString(result.supplier.companyRegisterNumber.value),
        customerName: normalizeString(result.customer.name.value),
        customerAddress: normalizeString(result.customer.address.value),
        customerUid: normalizeUid(result.customer.uidNumber.value),
        customerNumber: normalizeString(result.invoice.customerNumber.value),
        invoiceNumber: normalizeString(result.invoice.invoiceNumber.value),
        invoiceDate: dateField(result.invoice.invoiceDate.value),
        deliveryDate: dateField(result.invoice.serviceDate.value) ?? dateField(result.invoice.servicePeriodStart.value),
        servicePeriod,
        orderNumber: normalizeString(result.invoice.orderReference.value),
        paymentTerms: normalizeString(result.invoice.paymentTerms.value),
        currency: normalizeString(result.invoice.currency.value)?.toUpperCase() ?? "EUR",
        netAmount: parseGermanNumber(result.amounts.netAmount.value),
        taxAmount: parseGermanNumber(result.amounts.taxAmount.value),
        taxRate: primaryTaxRate,
        grossAmount: parseGermanNumber(result.amounts.grossAmount.value),
        zeroTaxReason,
        lineItems
      },
      extractedFields,
      lineItems,
      zeroTaxReason
    };
  }
}

export const invoiceNormalizationService = new InvoiceNormalizationService();

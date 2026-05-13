import type {
  ExportableInvoice,
  ExportFormat,
  ExportPayload,
  ExportTarget,
  ExportValidation
} from "@/server/domain/types";

const TARGET_LABELS: Record<ExportTarget, string> = {
  BMD: "bmd",
  RZL: "rzl",
  DOMIZIL_PLUS: "domizil-plus",
  BUSINESS_CENTRAL: "business-central",
  GENERIC_CSV: "generic",
  GENERIC_JSON: "generic"
};

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

function money(value: number | null | undefined): string {
  return typeof value === "number" ? value.toFixed(2) : "";
}

export class DefaultExportService {
  validateExport(invoice: ExportableInvoice): ExportValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!invoice.invoiceNumber) {
      errors.push("Rechnungsnummer fehlt.");
    }

    if (!invoice.supplierName) {
      errors.push("Lieferant fehlt.");
    }

    if (!invoice.bookingSuggestion) {
      errors.push("Buchungsvorschlag fehlt.");
    }

    const hasOpenError = invoice.validationResults?.some((result) => result.severity === "error") ?? false;
    if (hasOpenError) {
      errors.push("Offene Validierungsfehler blockieren den Export.");
    }

    if (!["approved", "export_ready", "exported"].includes(invoice.status ?? "") && invoice.bookingSuggestion?.status !== "approved" && !invoice.exportApproved) {
      errors.push("Export ist erst nach Nutzerfreigabe vorgesehen.");
    }

    const openReviewFields =
      invoice.extractedFields?.filter((field) => field.needsReview || field.status === "low_confidence" || field.status === "missing") ?? [];
    if (openReviewFields.length > 0) {
      errors.push("Nicht bestaetigte oder reviewpflichtige Felder blockieren den Export.");
    }

    if ((invoice.validationResults?.some((result) => result.severity === "warning") ?? false) && errors.length === 0) {
      warnings.push("Warnungen vorhanden. Export nur mit bewusster Prüfung durchführen.");
    }

    return {
      canExport: errors.length === 0,
      warnings,
      errors
    };
  }

  generate(invoice: ExportableInvoice, target: ExportTarget, format: ExportFormat): ExportPayload {
    const validation = this.validateExport(invoice);
    const system = TARGET_LABELS[target];
    const baseName = `${system}-${invoice.invoiceNumber ?? invoice.id ?? "invoice"}`;

    if (format === "json") {
      return {
        fileName: `${baseName}.json`,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(
          {
            targetSystem: target,
            generatedBy: "FinancePro MVP ExportService",
            validation,
            invoice: {
              id: invoice.id,
              supplierName: invoice.supplierName,
              supplierUid: invoice.supplierUid,
              invoiceNumber: invoice.invoiceNumber,
              invoiceDate: formatDate(invoice.invoiceDate),
              deliveryDate: formatDate(invoice.deliveryDate),
              servicePeriod: invoice.servicePeriod,
              currency: invoice.currency ?? "EUR",
              netAmount: invoice.netAmount,
              taxAmount: invoice.taxAmount,
              grossAmount: invoice.grossAmount,
              orderNumber: invoice.orderNumber,
              bookingSuggestion: invoice.bookingSuggestion
            }
          },
          null,
          2
        ),
        validation
      };
    }

    const headers = [
      "target_system",
      "invoice_id",
      "supplier_name",
      "supplier_uid",
      "invoice_number",
      "invoice_date",
      "service_date",
      "booking_date",
      "booking_text",
      "supplier_account",
      "expense_account",
      "tax_account",
      "net_amount",
      "tax_amount",
      "gross_amount",
      "currency",
      "cost_center",
      "document_file_reference"
    ];
    const row = [
      target,
      invoice.id ?? "",
      invoice.supplierName ?? "",
      invoice.supplierUid ?? "",
      invoice.invoiceNumber ?? "",
      formatDate(invoice.invoiceDate),
      formatDate(invoice.deliveryDate) || invoice.servicePeriod || "",
      formatDate(invoice.bookingSuggestion?.bookingDate),
      invoice.bookingSuggestion?.bookingText ?? "",
      invoice.bookingSuggestion?.supplierAccount ?? "",
      invoice.bookingSuggestion?.expenseAccount ?? "",
      invoice.bookingSuggestion?.taxAccount ?? "",
      money(invoice.netAmount),
      money(invoice.taxAmount),
      money(invoice.grossAmount),
      invoice.currency ?? "EUR",
      invoice.bookingSuggestion?.costCenter ?? "",
      invoice.id ?? ""
    ];

    return {
      fileName: `${baseName}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: `${headers.join(";")}\n${row.map(csvEscape).join(";")}\n`,
      validation
    };
  }
}

export const exportService = new DefaultExportService();

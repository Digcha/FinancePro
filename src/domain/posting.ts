import { Invoice, NeutralBookingRecord } from "./types";

export function buildNeutralBookingRecord(invoice: Invoice): NeutralBookingRecord {
  return {
    tenant: invoice.recipient,
    documentNumber: invoice.invoiceNumber,
    invoiceDate: invoice.issueDate,
    serviceDate: invoice.serviceDate,
    supplier: invoice.supplier,
    supplierUid: invoice.supplierUid,
    net: invoice.net,
    vat: invoice.vat,
    gross: invoice.gross,
    currency: invoice.currency,
    category: invoice.category,
    debitAccount: invoice.debitAccount,
    creditAccount: invoice.creditAccount,
    taxCode: invoice.taxCode,
    bookingText: invoice.bookingText,
    status: `§11 ${invoice.checks.every((check) => check.state === "ok") ? "OK" : "Review"}, Risiko ${invoice.risks.every((risk) => risk.state === "ok") ? "niedrig" : "prüfen"}, ${invoice.status}`,
    costCenter: invoice.costCenter,
    objectNumber: invoice.objectNumber,
  };
}

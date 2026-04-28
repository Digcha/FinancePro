import { buildNeutralBookingRecord } from "./posting";
import { ExportAdapter, Invoice } from "./types";
import { csvRow } from "./utils";

export function getExportPayload(invoice: Invoice, adapter: ExportAdapter) {
  if (adapter === "Business Central") return businessCentralPayload(invoice);
  if (adapter === "domizil+") return domizilPayload(invoice);
  if (adapter === "BMD") return bmdPayload(invoice);
  if (adapter === "RZL") return rzlPayload(invoice);
  return universalCsvPayload(invoice);
}

export function getExportFileName(invoice: Invoice, adapter: ExportAdapter) {
  const extension = adapter === "Business Central" ? "json" : "csv";
  return `financepro-${invoice.invoiceNumber}-${adapter.toLowerCase().replaceAll(" ", "-")}.${extension}`;
}

export function getExportMimeType(adapter: ExportAdapter) {
  return adapter === "Business Central" ? "application/json" : "text/csv";
}

function businessCentralPayload(invoice: Invoice) {
  return JSON.stringify(
    {
      journalTemplateName: "EINKAUF",
      journalBatchName: "FINANCEPRO",
      postingDate: invoice.issueDate,
      documentNo: invoice.invoiceNumber,
      accountType: "Vendor",
      accountNo: invoice.supplierUid || invoice.supplier,
      balancingAccountNo: invoice.account,
      amount: invoice.gross,
      vatCode: invoice.taxCode,
      costCenterCode: invoice.costCenter,
      objectNo: invoice.objectNumber,
      externalDocumentNo: invoice.invoiceNumber,
      auditStatus: invoice.status,
      bookingText: invoice.bookingText,
      complianceSignals: invoice.checks.map((check) => ({ id: check.id, state: check.state })),
      riskSignals: invoice.risks.map((risk) => ({ id: risk.id, state: risk.state })),
    },
    null,
    2,
  );
}

function bmdPayload(invoice: Invoice) {
  return [
    "Symbol\tBelegNr\tDatum\tLieferant\tUID\tSollkonto\tHabenkonto\tSteuercode\tNetto\tSteuer\tBrutto\tKostenstelle\tBuchungstext\tStatus",
    [
      "ER",
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.supplier,
      invoice.supplierUid,
      invoice.debitAccount,
      invoice.creditAccount,
      invoice.taxCode,
      invoice.net.toFixed(2),
      invoice.vat.toFixed(2),
      invoice.gross.toFixed(2),
      invoice.costCenter,
      invoice.bookingText,
      invoice.status,
    ].join("\t"),
  ].join("\n");
}

function rzlPayload(invoice: Invoice) {
  return [
    "BelegNr;Belegdatum;Name;UID;Sollkonto;Habenkonto;UStCode;Betrag;Steuer;Text;Kostenstelle;Status",
    csvRow([
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.supplier,
      invoice.supplierUid,
      invoice.debitAccount,
      invoice.creditAccount,
      invoice.taxCode,
      invoice.gross.toFixed(2),
      invoice.vat.toFixed(2),
      invoice.bookingText,
      invoice.costCenter,
      invoice.status,
    ]),
  ].join("\n");
}

function domizilPayload(invoice: Invoice) {
  return [
    "Objekt;Objektnummer;Kreditor;UID;Rechnungsdatum;Rechnungsnummer;Konto;Netto;Steuer;Brutto;IBAN;Text;Status",
    csvRow([
      invoice.costCenter,
      invoice.objectNumber,
      invoice.supplier,
      invoice.supplierUid,
      invoice.issueDate,
      invoice.invoiceNumber,
      invoice.debitAccount,
      invoice.net.toFixed(2),
      invoice.vat.toFixed(2),
      invoice.gross.toFixed(2),
      invoice.iban,
      invoice.bookingText,
      invoice.status,
    ]),
  ].join("\n");
}

function universalCsvPayload(invoice: Invoice) {
  const neutral = buildNeutralBookingRecord(invoice);
  return [
    "status;source;supplier;uid;invoice_number;issue_date;service_date;net;vat_rate;vat;gross;category;debit_account;credit_account;tax_code;cost_center;object_number;booking_text",
    csvRow([
      invoice.status,
      invoice.source,
      invoice.supplier,
      invoice.supplierUid,
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.serviceDate,
      invoice.net.toFixed(2),
      String(invoice.vatRate),
      invoice.vat.toFixed(2),
      invoice.gross.toFixed(2),
      neutral.category,
      neutral.debitAccount,
      neutral.creditAccount,
      neutral.taxCode,
      neutral.costCenter,
      neutral.objectNumber,
      neutral.bookingText,
    ]),
  ].join("\n");
}

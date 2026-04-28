import { suggestBooking } from "./booking";
import { runComplianceChecks } from "./compliance";
import { canApproveInvoice } from "./exportPolicy";
import { rememberSupplierRule } from "./learningRules";
import { evaluateRiskSignals, findSupplierProfile } from "./risk";
import { supplierProfiles } from "./referenceData";
import { defaultScanReport } from "./scanQuality";
import {
  BaseInvoice,
  ComplianceCheck,
  Invoice,
  InvoiceInput,
  InvoiceStatus,
  RiskContext,
  RiskSignal,
} from "./types";
import { nowLabel, roundMoney } from "./utils";

export const ruleSetVersion = "financepro-at-2026.1";

export function createRiskContext(existingInvoices: Invoice[] = []): RiskContext {
  return {
    existingInvoices,
    supplierProfiles,
  };
}

export function createInvoiceRecord(input: InvoiceInput, context = createRiskContext()): Invoice {
  const base = normalizeInvoice(input, false, context);
  return enrichInvoice(base, input.status ?? "review", context);
}

export function reprocessInvoice(invoice: Invoice, allInvoices: Invoice[], recalculateTotals = true): Invoice {
  const context = createRiskContext(allInvoices);
  const base = normalizeInvoice(invoice, recalculateTotals, context);
  return enrichInvoice(
    {
      ...base,
      audit: [...invoice.audit, { time: nowLabel(), label: "Regelprüfung manuell erneut ausgeführt" }],
    },
    invoice.status,
    context,
  );
}

export function approveInvoice(invoice: Invoice): Invoice {
  if (!canApproveInvoice(invoice)) {
    return {
      ...invoice,
      status: "blocked",
      audit: [...invoice.audit, { time: nowLabel(), label: "Freigabe blockiert: rote Prüfungen offen" }],
    };
  }

  rememberSupplierRule(invoice);
  return {
    ...invoice,
    status: "approved",
    audit: [...invoice.audit, { time: nowLabel(), label: "Freigabe in FinancePro erfasst" }],
  };
}

export function getInvoiceState(invoice: Invoice) {
  if (invoice.status === "blocked") return "risk";
  if (invoice.checks.some((check) => check.state === "risk") || invoice.risks.some((risk) => risk.state === "risk")) return "risk";
  if (invoice.checks.some((check) => check.state === "warn") || invoice.risks.some((risk) => risk.state === "warn")) return "warn";
  return "ok";
}

function normalizeInvoice(input: InvoiceInput, recalculateTotals: boolean, context: RiskContext): BaseInvoice {
  const net = Number(input.net ?? sumLineItems(input.lineItems) ?? 0);
  const vatRate = Number(input.vatRate ?? 20);
  const calculatedVat = roundMoney((net * vatRate) / 100);
  const vat = recalculateTotals ? calculatedVat : Number(input.vat ?? calculatedVat);
  const gross = recalculateTotals ? roundMoney(net + vat) : Number(input.gross ?? roundMoney(net + vat));
  const scanReport = input.scanReport ?? defaultScanReport(input.documentType === "XML" ? "ok" : "warn");
  const profile = findSupplierProfile(
    { supplier: input.supplier ?? "", supplierUid: input.supplierUid ?? "" },
    context.supplierProfiles,
  );
  const booking = suggestBooking({ ...input, net, vatRate, vat, gross }, profile);

  return {
    id: input.id ?? `inv-${Date.now()}`,
    supplier: input.supplier ?? "",
    supplierAddress: input.supplierAddress ?? "",
    supplierUid: input.supplierUid ?? "",
    recipient: input.recipient ?? "FinancePro Demo GmbH",
    recipientAddress: input.recipientAddress ?? "Wiedner Hauptstraße 1, 1040 Wien",
    recipientUid: input.recipientUid ?? "",
    invoiceNumber: input.invoiceNumber ?? "",
    issueDate: input.issueDate ?? new Date().toISOString().slice(0, 10),
    serviceDate: input.serviceDate ?? input.issueDate ?? new Date().toISOString().slice(0, 10),
    dueDate: input.dueDate ?? "",
    net,
    vatRate,
    vat,
    gross,
    currency: input.currency ?? "EUR",
    iban: input.iban ?? "",
    bic: input.bic ?? "",
    source: input.source ?? "Upload",
    documentType: input.documentType ?? "PDF",
    qualityScore: Number(input.qualityScore ?? scanReport.score),
    extractionConfidence: Number(input.extractionConfidence ?? 70),
    extractedText: input.extractedText ?? "",
    scanReport,
    uidVerification: input.uidVerification,
    category: booking.category,
    account: booking.account,
    debitAccount: booking.debitAccount,
    creditAccount: booking.creditAccount,
    taxCode: booking.taxCode,
    costCenter: booking.costCenter,
    objectNumber: input.objectNumber ?? "",
    bookingText: booking.bookingText,
    paymentMethod: input.paymentMethod ?? "open",
    reverseChargeNote: input.reverseChargeNote ?? "",
    lineItems: input.lineItems?.length ? input.lineItems : [{ description: "Unklassifizierte Leistung", amount: net, taxRate: vatRate }],
    audit: input.audit ?? [{ time: nowLabel(), label: "Rechnung normalisiert" }],
  };
}

function enrichInvoice(base: BaseInvoice, previousStatus: InvoiceStatus, context: RiskContext): Invoice {
  const checks = runComplianceChecks(base);
  const risks = evaluateRiskSignals(base, context);

  return {
    ...base,
    checks,
    risks,
    status: resolveStatus(previousStatus, checks, risks, base.scanReport.status),
  };
}

function resolveStatus(
  previousStatus: InvoiceStatus,
  checks: ComplianceCheck[],
  risks: RiskSignal[],
  scanStatus: BaseInvoice["scanReport"]["status"],
): InvoiceStatus {
  const hasBlockingIssue =
    scanStatus === "risk" ||
    checks.some((check) => check.blocking && check.state === "risk") ||
    risks.some((risk) => risk.blocking && risk.state === "risk");

  if (hasBlockingIssue) return "blocked";
  if (previousStatus === "approved") return "approved";
  return "review";
}

function sumLineItems(lineItems?: BaseInvoice["lineItems"]) {
  if (!lineItems?.length) return undefined;
  return roundMoney(lineItems.reduce((sum, item) => sum + item.amount, 0));
}

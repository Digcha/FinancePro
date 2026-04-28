import { buildNeutralBookingRecord } from "./posting";
import { Invoice } from "./types";

export function buildAuditPackage(invoice: Invoice) {
  return JSON.stringify(
    {
      ruleSet: "financepro-at-2026.1",
      exportedAt: new Date().toISOString(),
      invoice,
      scanStatus: invoice.scanReport,
      neutralBookingRecord: buildNeutralBookingRecord(invoice),
      blockingComplianceChecks: invoice.checks.filter((check) => check.blocking && check.state === "risk").map((check) => check.id),
      blockingRiskSignals: invoice.risks.filter((risk) => risk.blocking && risk.state === "risk").map((risk) => risk.id),
      checksumHint: `${invoice.invoiceNumber}-${invoice.gross}-${invoice.supplierUid}`,
    },
    null,
    2,
  );
}

export function getAuditFileName(invoice: Invoice) {
  return `financepro-audit-${invoice.invoiceNumber}.json`;
}

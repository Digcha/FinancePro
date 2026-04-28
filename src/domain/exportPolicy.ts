import { Invoice } from "./types";

export function canExportInvoice(invoice: Invoice) {
  return invoice.status === "approved";
}

export function getExportBlockReason(invoice: Invoice) {
  if (canExportInvoice(invoice)) return "";
  if (invoice.status === "blocked") return "Export gesperrt: rote Prüf- oder Risikosignale müssen zuerst geklärt werden.";
  return "Export gesperrt: Rechnung muss vor dem Export freigegeben werden.";
}

export function canApproveInvoice(invoice: Invoice) {
  return !invoice.checks.some((check) => check.blocking && check.state === "risk") &&
    !invoice.risks.some((risk) => risk.blocking && risk.state === "risk") &&
    invoice.scanReport.status !== "risk";
}

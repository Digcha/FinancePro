import { SupplierProfile } from "./types";

export const exportAdapters = ["Universal CSV", "RZL", "BMD", "domizil+", "Business Central"] as const;

export const supplierProfiles: SupplierProfile[] = [
  {
    name: "Bergmann IT Services GmbH",
    uid: "ATU68942019",
    uidConfirmation: "stage1",
    knownIbans: ["AT611904300234573201"],
    defaultAccount: "7400 EDV-Aufwand",
    defaultCostCenter: "AT-OPS",
    historicalInvoiceCount: 15,
    insolvencyStatus: "clear",
    recentInvoices: [{ invoiceNumber: "RE-2026-0412", gross: 2880, issueDate: "2026-04-12" }],
  },
  {
    name: "Alpenbau GmbH",
    uid: "ATU53421987",
    uidConfirmation: "stage1",
    knownIbans: ["AT093200000099001122"],
    defaultAccount: "7200 Fremdleistungen",
    defaultCostCenter: "AT-PILOT",
    historicalInvoiceCount: 11,
    insolvencyStatus: "clear",
    recentInvoices: [{ invoiceNumber: "2026-10082", gross: 12569.8, issueDate: "2026-04-14" }],
  },
  {
    name: "Office Direkt Handels GmbH",
    uid: "ATU74290613",
    uidConfirmation: "stage2",
    knownIbans: ["AT181100099922113400"],
    defaultAccount: "7600 Büromaterial",
    defaultCostCenter: "AT-ADMIN",
    historicalInvoiceCount: 38,
    insolvencyStatus: "clear",
    recentInvoices: [{ invoiceNumber: "OD-240602", gross: 312.4, issueDate: "2026-03-29" }],
  },
];

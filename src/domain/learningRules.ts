import { BaseInvoice, BookingSuggestion } from "./types";
import { normalizeUid } from "./utils";

type LearnedSupplierRule = Partial<BookingSuggestion> & {
  supplier: string;
  supplierUid: string;
  iban?: string;
  updatedAt: string;
};

const STORAGE_KEY = "financepro.learnedSupplierRules";

export function getLearnedSupplierDefaults(invoice: Pick<BaseInvoice, "supplier" | "supplierUid">): Partial<BookingSuggestion> | undefined {
  const key = ruleKey(invoice);
  const rules = readRules();
  return rules[key];
}

export function rememberSupplierRule(invoice: BaseInvoice) {
  const key = ruleKey(invoice);
  const rules = readRules();
  rules[key] = {
    supplier: invoice.supplier,
    supplierUid: invoice.supplierUid,
    category: invoice.category,
    account: invoice.account,
    debitAccount: invoice.debitAccount,
    creditAccount: invoice.creditAccount,
    taxCode: invoice.taxCode,
    costCenter: invoice.costCenter,
    bookingText: invoice.bookingText,
    iban: invoice.iban,
    updatedAt: new Date().toISOString(),
  };
  writeRules(rules);
}

export function countLearnedRules() {
  return Object.keys(readRules()).length;
}

function ruleKey(invoice: Pick<BaseInvoice, "supplier" | "supplierUid">) {
  return normalizeUid(invoice.supplierUid) || invoice.supplier.trim().toLowerCase();
}

function readRules(): Record<string, LearnedSupplierRule> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, LearnedSupplierRule>;
  } catch {
    return {};
  }
}

function writeRules(rules: Record<string, LearnedSupplierRule>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

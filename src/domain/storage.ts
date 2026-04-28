import { Invoice } from "./types";

const INVOICE_STORAGE_KEY = "financepro.invoices";

export function loadInvoices(fallback: Invoice[]) {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Invoice[];
    return parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveInvoices(invoices: Invoice[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(invoices));
}

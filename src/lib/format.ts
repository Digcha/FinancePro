import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(value: number | null | undefined, currency = "EUR") {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency
  }).format(value);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function percent(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

export function documentTypeLabel(value: string) {
  const labels: Record<string, string> = {
    invoice: "Rechnung",
    rental_invoice: "Mietrechnung",
    cost_assessment: "Kostenvorschreibung",
    credit_note: "Gutschrift",
    receipt: "Beleg",
    unknown: "Unbekannt"
  };

  return labels[value] ?? value;
}

export function statusLabel(value: string) {
  const labels: Record<string, string> = {
    approved: "Freigegeben",
    reviewed: "Geprüft",
    review_required: "Prüfung offen",
    exported: "Exportiert",
    rejected: "Abgelehnt"
  };

  return labels[value] ?? value;
}

export function riskLabel(value: string) {
  const labels: Record<string, string> = {
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch"
  };

  return labels[value] ?? value;
}

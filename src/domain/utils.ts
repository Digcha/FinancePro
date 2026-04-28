export const moneyFormatter = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
});

export const nowLabel = () =>
  new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeDate(value?: string) {
  if (!value) return "";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}

export function formatDate(value: string) {
  if (!value) return "offen";
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function normalizeIban(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}

export function normalizeUid(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}

export function isAustrianUid(value: string) {
  return /^ATU\d{8}$/.test(normalizeUid(value));
}

export function hasValue(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

export function parseAmount(value?: string) {
  if (!value) return undefined;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : undefined;
}

export function daysBetween(a: string, b: string) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(second)) return Number.POSITIVE_INFINITY;
  return Math.abs(first - second) / (1000 * 60 * 60 * 24);
}

export function csvRow(values: string[]) {
  return values.map((value) => `"${value.replaceAll('"', '""')}"`).join(";");
}

export function downloadText(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

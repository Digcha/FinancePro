import { InvoiceInput, LineItem } from "./types";

type AzureAnalyzeResponse = {
  source: string;
  confidence: number;
  extractedText: string;
  fields: {
    supplier?: string;
    supplierAddress?: string;
    supplierUid?: string;
    recipient?: string;
    recipientAddress?: string;
    recipientUid?: string;
    invoiceNumber?: string;
    issueDate?: string;
    serviceDate?: string;
    dueDate?: string;
    net?: number;
    vat?: number;
    gross?: number;
    vatRate?: number;
    iban?: string;
    currency?: string;
    lineItems?: LineItem[];
  };
  storage?: {
    container: string;
    blobName: string;
    url: string;
  };
};

export async function analyzeInvoiceWithAzure(file: File): Promise<InvoiceInput | undefined> {
  if (import.meta.env.VITE_USE_AZURE_API !== "true") return undefined;

  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/analyze-invoice`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-file-name": file.name,
      "x-file-size": String(file.size),
    },
    body: file,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Azure Analyse fehlgeschlagen: ${response.status} ${message}`);
  }

  const result = (await response.json()) as AzureAnalyzeResponse;
  const fields = result.fields ?? {};
  const storageLabel = result.storage?.blobName ? `, Blob: ${result.storage.blobName}` : "";

  return {
    supplier: fields.supplier,
    supplierAddress: fields.supplierAddress,
    supplierUid: fields.supplierUid,
    recipient: fields.recipient,
    recipientAddress: fields.recipientAddress,
    recipientUid: fields.recipientUid,
    invoiceNumber: fields.invoiceNumber,
    issueDate: normalizeAzureDate(fields.issueDate),
    serviceDate: normalizeAzureDate(fields.serviceDate),
    dueDate: normalizeAzureDate(fields.dueDate),
    net: fields.net,
    vat: fields.vat,
    gross: fields.gross,
    vatRate: fields.vatRate,
    iban: fields.iban,
    currency: fields.currency || "EUR",
    extractedText: result.extractedText,
    extractionConfidence: result.confidence,
    source: "Azure Document Intelligence",
    lineItems: fields.lineItems?.length ? fields.lineItems : undefined,
    audit: [
      {
        time: new Intl.DateTimeFormat("de-AT", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
        label: `Azure Document Intelligence Analyse abgeschlossen${storageLabel}`,
      },
    ],
  };
}

function normalizeAzureDate(value?: string) {
  if (!value) return "";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? value;
}

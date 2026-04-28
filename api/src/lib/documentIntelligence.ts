type AnalyzeResult = {
  status: string;
  analyzeResult?: {
    content?: string;
    documents?: Array<{
      fields?: Record<string, DocumentField>;
      confidence?: number;
    }>;
  };
  error?: {
    message?: string;
  };
};

type DocumentField = {
  type?: string;
  content?: string;
  confidence?: number;
  valueString?: string;
  valueNumber?: number;
  valueDate?: string;
  valueCurrency?: {
    amount?: number;
    currencyCode?: string;
  };
  valueArray?: DocumentField[];
  valueObject?: Record<string, DocumentField>;
};

const API_VERSION = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION ?? "2024-11-30";

export async function analyzeInvoiceDocument(buffer: Buffer, contentType: string) {
  const endpoint = requiredEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT").replace(/\/$/, "");
  const key = requiredEnv("AZURE_DOCUMENT_INTELLIGENCE_KEY");
  const operationUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=${API_VERSION}`;

  const analyzeResponse = await fetch(operationUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": contentType || "application/octet-stream",
    },
    body: buffer,
  });

  if (!analyzeResponse.ok) {
    throw new Error(`Document Intelligence analyze failed: ${analyzeResponse.status} ${await analyzeResponse.text()}`);
  }

  const resultUrl = analyzeResponse.headers.get("operation-location");
  if (!resultUrl) throw new Error("Document Intelligence returned no operation-location header.");

  const result = await pollAnalyzeResult(resultUrl, key);
  const document = result.analyzeResult?.documents?.[0];
  const fields = document?.fields ?? {};
  const content = result.analyzeResult?.content ?? "";

  return {
    source: "azure-document-intelligence",
    confidence: Math.round((document?.confidence ?? averageConfidence(fields)) * 100),
    extractedText: content,
    fields: {
      supplier: fieldText(fields, ["VendorName", "VendorName", "SupplierName"]),
      supplierAddress: fieldText(fields, ["VendorAddress", "SupplierAddress"]),
      supplierUid: firstMatch(content, /\b[A-Z]{2}[A-Z0-9]{2,14}\b/g, (value) => value.startsWith("ATU")),
      recipient: fieldText(fields, ["CustomerName", "ReceiverName", "BillingAddressRecipient"]),
      recipientAddress: fieldText(fields, ["CustomerAddress", "BillingAddress"]),
      recipientUid: "",
      invoiceNumber: fieldText(fields, ["InvoiceId", "InvoiceNumber"]),
      issueDate: fieldText(fields, ["InvoiceDate"]),
      serviceDate: fieldText(fields, ["ServiceStartDate", "ServiceEndDate", "InvoiceDate"]),
      dueDate: fieldText(fields, ["DueDate"]),
      net: fieldAmount(fields, ["SubTotal", "TotalNetAmount"]),
      vat: fieldAmount(fields, ["TotalTax", "InvoiceTotalTax"]),
      gross: fieldAmount(fields, ["InvoiceTotal", "AmountDue"]),
      vatRate: inferVatRate(fields, content),
      iban: firstMatch(content, /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/g, (value) => value.replace(/\s/g, "").startsWith("AT")),
      currency: fieldCurrency(fields, ["InvoiceTotal", "AmountDue"]) ?? "EUR",
      lineItems: parseItems(fields),
    },
    raw: result,
  };
}

async function pollAnalyzeResult(resultUrl: string, key: string): Promise<AnalyzeResult> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetch(resultUrl, {
      headers: {
        "Ocp-Apim-Subscription-Key": key,
      },
    });

    if (!response.ok) {
      throw new Error(`Document Intelligence polling failed: ${response.status} ${await response.text()}`);
    }

    const result = (await response.json()) as AnalyzeResult;
    if (result.status === "succeeded") return result;
    if (result.status === "failed") throw new Error(result.error?.message ?? "Document Intelligence analysis failed.");
    await delay(1000);
  }

  throw new Error("Document Intelligence analysis timed out.");
}

function fieldText(fields: Record<string, DocumentField>, names: string[]) {
  for (const name of names) {
    const field = fields[name];
    const value = field?.valueString ?? field?.valueDate ?? field?.content;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function fieldAmount(fields: Record<string, DocumentField>, names: string[]) {
  for (const name of names) {
    const field = fields[name];
    const amount = field?.valueCurrency?.amount ?? field?.valueNumber ?? parseAmount(field?.content);
    if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  }
  return undefined;
}

function fieldCurrency(fields: Record<string, DocumentField>, names: string[]) {
  for (const name of names) {
    const currency = fields[name]?.valueCurrency?.currencyCode;
    if (currency) return currency;
  }
  return undefined;
}

function inferVatRate(fields: Record<string, DocumentField>, content: string) {
  const explicit = parseAmount(content.match(/(\d{1,2})\s?%\s?(?:USt|MwSt|VAT|Tax)/i)?.[1]);
  if (explicit) return explicit;
  const net = fieldAmount(fields, ["SubTotal", "TotalNetAmount"]);
  const vat = fieldAmount(fields, ["TotalTax", "InvoiceTotalTax"]);
  if (net && vat) return Math.round((vat / net) * 10000) / 100;
  return undefined;
}

function parseItems(fields: Record<string, DocumentField>) {
  const items = fields.Items?.valueArray ?? [];
  return items
    .map((item) => {
      const value = item.valueObject ?? {};
      return {
        description: fieldText(value, ["Description", "ProductCode", "Name"]) || item.content || "Position",
        amount: fieldAmount(value, ["Amount", "TotalPrice", "LineTotal"]) ?? 0,
        taxRate: fieldAmount(value, ["TaxRate"]) ?? 20,
        quantity: fieldAmount(value, ["Quantity"]),
        unitPrice: fieldAmount(value, ["UnitPrice"]),
      };
    })
    .filter((item) => item.description || item.amount);
}

function averageConfidence(fields: Record<string, DocumentField>) {
  const values = Object.values(fields)
    .map((field) => field.confidence)
    .filter((value): value is number => typeof value === "number");
  if (!values.length) return 0.7;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseAmount(value?: string) {
  if (!value) return undefined;
  const amount = Number(value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : undefined;
}

function firstMatch(content: string, pattern: RegExp, predicate: (value: string) => boolean) {
  for (const match of content.matchAll(pattern)) {
    const value = match[0].trim();
    if (predicate(value)) return value;
  }
  return "";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

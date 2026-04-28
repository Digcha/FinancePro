import { analyzeInvoiceWithAzure } from "./azureInvoiceApi";
import { extractTextFromFile } from "./documentText";
import { analyzeFileQuality } from "./scanQuality";
import { InvoiceInput } from "./types";
import { normalizeDate, nowLabel, parseAmount, roundMoney } from "./utils";

export async function parseImportedFile(file: File): Promise<InvoiceInput> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "datei";
  if (!["pdf", "xml", "ubl", "txt", "eml", "jpg", "jpeg", "png", "webp"].includes(extension)) {
    throw new Error(`Dateityp .${extension} wird nicht unterstützt.`);
  }

  const documentType = extension.toUpperCase();
  const azureInput = await analyzeInvoiceWithAzure(file).catch((error: unknown) => {
    console.warn(error);
    return undefined;
  });
  const extractedText = await extractTextFromFile(file);
  const mergedText = azureInput?.extractedText || extractedText;
  const scanReport = await analyzeFileQuality(file, mergedText);
  const parsed = {
    ...parseInvoiceDocument(mergedText, extension),
    ...azureInput,
  };
  const net = parsed.net ?? 0;
  const vatRate = parsed.vatRate ?? 20;
  const vat = parsed.vat ?? (net > 0 ? roundMoney((net * vatRate) / 100) : 0);
  const gross = parsed.gross ?? (net > 0 ? roundMoney(net + vat) : 0);

  return {
    ...parsed,
    id: `inv-${Date.now()}-${file.name}`,
    supplier: parsed.supplier ?? file.name.replace(/\.[^.]+$/, ""),
    supplierAddress: parsed.supplierAddress ?? "",
    recipient: parsed.recipient ?? "FinancePro Demo GmbH",
    recipientAddress: parsed.recipientAddress ?? "Wiedner Hauptstraße 1, 1040 Wien",
    invoiceNumber: parsed.invoiceNumber ?? "",
    issueDate: parsed.issueDate || "",
    serviceDate: parsed.serviceDate || parsed.issueDate || "",
    dueDate: parsed.dueDate || "",
    net,
    vatRate,
    vat,
    gross,
    currency: "EUR",
    source: "Upload",
    documentType,
    qualityScore: scanReport.score,
    extractionConfidence: extractedText.length > 40 ? 86 : 52,
    extractedText: mergedText,
    scanReport,
    lineItems: parsed.lineItems ?? (net > 0 ? [{ description: "Importposition", amount: net, taxRate: vatRate }] : []),
    audit: [
      ...(parsed.audit ?? []),
      { time: nowLabel(), label: `${file.name} importiert` },
      {
        time: nowLabel(),
        label: mergedText.length > 40 ? "Dokumenttext extrahiert und normalisiert" : "Dokument für manuellen Review vorbereitet",
      },
    ],
  };
}

function parseInvoiceDocument(text: string, extension: string): InvoiceInput {
  if (["xml", "ubl"].includes(extension)) {
    const xml = parseInvoiceXml(text);
    if (Object.keys(xml).length > 0) return xml;
  }
  return parsePlainTextInvoice(text);
}

function parseInvoiceXml(text: string): InvoiceInput {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "application/xml");
  const parseError = document.querySelector("parsererror");
  if (parseError) return {};

  const getText = (names: string[]) => {
    const elements = Array.from(document.getElementsByTagName("*"));
    const match = elements.find((element) => names.includes(element.localName) || names.includes(element.tagName));
    return match?.textContent?.trim();
  };

  const net = parseAmount(getText(["TaxExclusiveAmount", "LineExtensionAmount", "NetAmount"]));
  const vat = parseAmount(getText(["TaxAmount", "VATAmount"]));
  const gross = parseAmount(getText(["TaxInclusiveAmount", "PayableAmount", "GrossAmount"]));
  const vatRate = parseAmount(getText(["TaxRate", "VATRate", "Percent"]));

  return {
    supplier: getText(["SupplierName", "SellerName", "AccountingSupplierPartyName", "Name"]),
    supplierAddress: getText(["SupplierAddress", "SellerAddress", "StreetName"]),
    supplierUid: getText(["SupplierVATIdentifier", "VATIdentificationNumber", "VATID", "UID"]),
    recipient: getText(["BuyerName", "CustomerName", "RecipientName", "AccountingCustomerPartyName"]),
    recipientAddress: getText(["BuyerAddress", "CustomerAddress"]),
    recipientUid: getText(["BuyerVATIdentifier", "CustomerVATIdentifier"]),
    invoiceNumber: getText(["InvoiceNumber", "DocumentNumber", "ID"]),
    issueDate: normalizeDate(getText(["IssueDate", "InvoiceDate"])),
    serviceDate: normalizeDate(getText(["DeliveryDate", "ServiceDate", "ActualDeliveryDate"])),
    dueDate: normalizeDate(getText(["DueDate", "PaymentDueDate"])),
    iban: getText(["IBAN"]),
    reverseChargeNote: getText(["TaxExemptionReason", "ReverseChargeNote", "Note"]),
    net,
    vat,
    gross,
    vatRate,
  };
}

function parsePlainTextInvoice(text: string): InvoiceInput {
  const uid = text.match(/\bATU\d{8}\b/i)?.[0]?.toUpperCase();
  const iban = text.match(/\bAT\d{2}(?:\s?\d{4}){4}\s?\d{0,2}\b/i)?.[0];
  const invoiceNumber =
    text.match(/Rechnung\s*Nr\.?\s*([A-Z0-9][A-Z0-9/-]{3,})/i)?.[1] ??
    text.match(/Rechnungsnummer[\s:#.-]*([A-Z0-9][A-Z0-9/-]{3,})/i)?.[1] ??
    text.match(/(?:invoice\s*(?:no\.?|number)?|beleg(?:nummer)?)[\s:#.-]*([A-Z0-9][A-Z0-9/-]{3,})/i)?.[1] ??
    text.match(/\b(?:ER|RE|AR)-?\d{4}[-/]\d{2,}\b/i)?.[0];
  const allAmounts = Array.from(text.matchAll(/(\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+[.,]\d{2})\s*(?:EUR|€)/gi)).map((match) =>
    parseAmount(match[1]),
  ).filter((amount): amount is number => amount !== undefined);
  const labeledGross = parseAmount(text.match(/(?:brutto|gross|gesamtbetrag|gesamt)[^\d]*(\d+[.,]\d{2})/i)?.[1]);
  const labeledNet = parseAmount(text.match(/(?:netto|net|nettobetrag)[^\d]*(\d+[.,]\d{2})/i)?.[1]);
  const labeledVat = parseAmount(text.match(/(?:ust|mwst|vat|steuer)[^\d]*(\d+[.,]\d{2})/i)?.[1]);
  const net = labeledNet ?? (text.match(/nettobetrag/i) ? fromEnd(allAmounts, 3) : undefined);
  const vat = labeledVat ?? (text.match(/(?:mwst|ust|steuer)/i) ? fromEnd(allAmounts, 2) : undefined);
  const gross = labeledGross ?? (text.match(/gesamtbetrag|brutto|gesamt/i) ? fromEnd(allAmounts, 1) : undefined);
  const vatRate = parseAmount(text.match(/(\d{1,2})\s?%\s?(?:ust|mwst|vat)/i)?.[1]) ?? parseAmount(text.match(/(?:ust|mwst|vat)[^\d]*(\d{1,2})\s?%/i)?.[1]);
  const issueDate = normalizeGermanDate(text.match(/Datum:\s*(\d{1,2}\.\d{1,2}\.\d{4})/i)?.[1]) ??
    normalizeGermanDate(text.match(/(?:Rechnungsdatum|Ausstellungsdatum)[^\d]*(\d{1,2}\.\d{1,2}\.\d{4})/i)?.[1]);
  const supplier = inferSupplier(text);
  const recipient = inferRecipient(text);

  return {
    supplier,
    supplierAddress: inferAddressAfter(text, supplier),
    recipient,
    recipientAddress: inferAddressAfter(text, recipient),
    supplierUid: uid,
    iban,
    invoiceNumber,
    issueDate,
    serviceDate: text.match(/Leistungsdatum/i) ? issueDate : issueDate,
    dueDate: inferDueDate(issueDate, text),
    net,
    vat,
    gross,
    vatRate,
    lineItems: inferLineItems(text, net, vatRate),
  };
}

function normalizeGermanDate(value?: string) {
  if (!value) return "";
  const [day, month, year] = value.split(".");
  if (!day || !month || !year) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function inferSupplier(text: string) {
  const lines = relevantLines(text);
  const firmennameIndex = lines.findIndex((line) => /^firmenname$/i.test(line));
  if (firmennameIndex >= 0) return lines[firmennameIndex];
  return lines.find((line) => /(gmbh|kg|ag|e\.u\.|firma|musterfirma)/i.test(line)) ?? lines[0] ?? "";
}

function inferRecipient(text: string) {
  const lines = relevantLines(text);
  const index = lines.findIndex((line) => /gmbh|kg|ag|e\.u\./i.test(line));
  return index >= 0 ? lines[index] : "";
}

function inferAddressAfter(text: string, anchor?: string) {
  if (!anchor) return "";
  const lines = relevantLines(text);
  const index = lines.findIndex((line) => line === anchor);
  if (index < 0) return "";
  const addressLines = lines.slice(index + 1, index + 3).filter((line) => /\d{4,5}|straße|gasse|platz|weg/i.test(line));
  return addressLines.join(", ");
}

function inferDueDate(issueDate: string | undefined, text: string) {
  if (!issueDate) return "";
  const days = Number(text.match(/innerhalb von\s*(\d+)\s*Tagen/i)?.[1] ?? 14);
  const date = new Date(issueDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function inferLineItems(text: string, net?: number, vatRate?: number) {
  const descriptions = Array.from(text.matchAll(/Text der [^\n]+Position/gi)).map((match) => match[0]);
  if (descriptions.length && net) {
    const share = roundMoney(net / descriptions.length);
    return descriptions.map((description, index) => ({
      description,
      amount: index === descriptions.length - 1 ? roundMoney(net - share * (descriptions.length - 1)) : share,
      taxRate: vatRate ?? 20,
    }));
  }
  return undefined;
}

function relevantLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^http/i.test(line) && !/^www\./i.test(line) && !/^e-mail/i.test(line) && !/^tel\./i.test(line));
}

function fromEnd<T>(values: T[], offset: number) {
  return values[values.length - offset];
}

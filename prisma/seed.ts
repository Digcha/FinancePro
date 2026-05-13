import { PrismaClient } from "@prisma/client";
import type { InvoiceLineItemInput, InvoicePageInput, InvoiceValidationInput } from "../src/server/domain/types";
import { bookingSuggestionService, invoiceValidationService, riskAnalysisService } from "../src/server/services";

const prisma = new PrismaClient();

const knownSuppliers = [
  {
    name: "ViennaOffice Supplies GmbH",
    knownIban: "AT611904300234573201",
    defaultExpenseAccount: "7600",
    supplierAccount: "33001",
    costCenter: "AT-VIE"
  },
  {
    name: "Eventtechnik Donau GmbH",
    knownIban: "AT483200000012345864",
    defaultExpenseAccount: "7400",
    supplierAccount: "33021",
    costCenter: "EVENT"
  },
  {
    name: "Magistrat der Stadt Wien",
    knownIban: "AT481100000012345678",
    defaultExpenseAccount: "7100",
    supplierAccount: "33110",
    costCenter: "ADMIN"
  },
  {
    name: "IT Solutions Linz GmbH",
    knownIban: "AT124300000012345678",
    defaultExpenseAccount: "7205",
    supplierAccount: "33044",
    costCenter: "IT"
  }
];

interface DemoInvoice extends InvoiceValidationInput {
  id: string;
  tenantId?: string;
  supplierBic?: string | null;
  supplierAddress?: string | null;
  supplierCompanyRegisterNumber?: string | null;
  customerAddress?: string | null;
  customerNumber?: string | null;
  orderNumber?: string | null;
  offerNumber?: string | null;
  deliveryNoteNumber?: string | null;
  paymentReference?: string | null;
  paymentTerms?: string | null;
  status?: string;
  exportApproved?: boolean;
  pages: Array<InvoicePageInput & { fileName: string; originalFilePath: string; previewImagePath?: string | null }>;
  lineItems: InvoiceLineItemInput[];
}

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

const demoInvoices: DemoInvoice[] = [
  {
    id: "demo-standard-20",
    documentType: "invoice",
    supplierName: "ViennaOffice Supplies GmbH",
    supplierAddress: "Mariahilfer Strasse 101, 1060 Wien",
    supplierUid: "ATU12345678",
    supplierIban: "AT611904300234573201",
    supplierBic: "BKAUATWW",
    supplierCompanyRegisterNumber: "FN 123456a",
    customerName: "Chalakov & Plaschka Consulting OG",
    customerAddress: "Schottenring 12, 1010 Wien",
    customerUid: "ATU87654321",
    invoiceNumber: "VO-2026-041",
    invoiceDate: date("2026-05-02"),
    deliveryDate: date("2026-05-01"),
    servicePeriod: "Mai 2026",
    orderNumber: "PO-2026-118",
    currency: "EUR",
    netAmount: 1200,
    taxAmount: 240,
    taxRate: 20,
    grossAmount: 1440,
    paymentTerms: "Zahlbar binnen 14 Tagen ohne Abzug",
    status: "approved",
    exportApproved: true,
    pages: [
      {
        fileName: "standardrechnung-vo-2026-041.pdf",
        originalFilePath: "uploads/demo/standardrechnung-vo-2026-041.pdf",
        previewImagePath: null,
        pageNumberDetected: 1,
        totalPagesDetected: 1,
        qualityStatus: "accepted",
        sharpnessScore: 0.94,
        completenessScore: 0.98,
        perspectiveScore: 0.96,
        extractedText:
          "ViennaOffice Supplies GmbH Mariahilfer Strasse 101 1060 Wien UID ATU12345678 Rechnung VO-2026-041 Rechnungsdatum 02.05.2026 Lieferung 01.05.2026 Empfänger Chalakov & Plaschka Consulting OG Netto 1200,00 USt 20% 240,00 Brutto 1440,00 IBAN AT611904300234573201 BIC BKAUATWW"
      }
    ],
    lineItems: [
      {
        sourcePageNumber: 1,
        positionNumber: "1",
        quantity: 12,
        unit: "Pack",
        description: "Büromaterial und Archivboxen",
        unitPrice: 100,
        netAmount: 1200,
        taxRate: 20,
        grossAmount: 1440,
        confidence: 0.96
      }
    ]
  },
  {
    id: "demo-rental-event-4p",
    documentType: "rental_invoice",
    supplierName: "Eventtechnik Donau GmbH",
    supplierAddress: "Hafenstrasse 8, 4020 Linz",
    supplierUid: "ATU99887766",
    supplierIban: "AT483200000012345864",
    supplierBic: "RLNWATWW",
    supplierCompanyRegisterNumber: "FN 445566k",
    customerName: "Chalakov & Plaschka Consulting OG",
    customerAddress: "Schottenring 12, 1010 Wien",
    customerUid: "ATU87654321",
    invoiceNumber: "ETD-2026-8841",
    invoiceDate: date("2026-04-29"),
    deliveryDate: date("2026-04-26"),
    servicePeriod: "Eventtechnik-Miete 24.04.2026 bis 26.04.2026",
    orderNumber: "PROJ-26-OMNIA",
    offerNumber: "ANG-2026-251",
    deliveryNoteNumber: "LS-2026-1099",
    currency: "EUR",
    netAmount: 11882,
    taxAmount: 2376.4,
    taxRate: 20,
    grossAmount: 14258.4,
    paymentTerms: "Zahlbar binnen 7 Tagen, Projekt PROJ-26-OMNIA",
    status: "review_required",
    exportApproved: false,
    pages: [
      {
        fileName: "eventtechnik-mietrechnung-1.pdf",
        originalFilePath: "uploads/demo/eventtechnik-mietrechnung-1.pdf",
        previewImagePath: null,
        pageNumberDetected: 1,
        totalPagesDetected: 4,
        qualityStatus: "accepted",
        sharpnessScore: 0.91,
        completenessScore: 0.95,
        perspectiveScore: 0.92,
        extractedText:
          "Eventtechnik Donau GmbH Rechnung ETD-2026-8841 Seite 1/4 Empfänger Chalakov & Plaschka Consulting OG Rechnungsdatum 29.04.2026 Projekt PROJ-26-OMNIA Angebot ANG-2026-251 Lieferschein LS-2026-1099 Position 1 GrandMA3 Fullsize Lichtpult Mietdauer 3 Tage Einzelpreis 480,00 Rabatt 10% Gesamt 2592,00 UID ATU99887766"
      },
      {
        fileName: "eventtechnik-mietrechnung-2.pdf",
        originalFilePath: "uploads/demo/eventtechnik-mietrechnung-2.pdf",
        previewImagePath: null,
        pageNumberDetected: 2,
        totalPagesDetected: 4,
        qualityStatus: "accepted",
        sharpnessScore: 0.9,
        completenessScore: 0.94,
        perspectiveScore: 0.9,
        extractedText:
          "Eventtechnik Donau GmbH Rechnung ETD-2026-8841 Seite 2/4 Position 2 LED Wall 3,9mm inkl. Prozessor und Flightcases Mietdauer 3 Tage Einzelpreis 2200,00 Rabatt 10% Gesamt 5940,00 Position 3 Rigging Safety Package Traversen Motoren Abnahmen Gesamt 1800,00"
      },
      {
        fileName: "eventtechnik-mietrechnung-3.pdf",
        originalFilePath: "uploads/demo/eventtechnik-mietrechnung-3.pdf",
        previewImagePath: null,
        pageNumberDetected: 3,
        totalPagesDetected: 4,
        qualityStatus: "accepted",
        sharpnessScore: 0.88,
        completenessScore: 0.93,
        perspectiveScore: 0.89,
        extractedText:
          "Eventtechnik Donau GmbH Rechnung ETD-2026-8841 Seite 3/4 Position 4 Transport Wien-Linz-Wien Gesamt 650,00 Position 5 Operator Setup und Einweisung Gesamt 900,00 Position 6 Ersatzgerät Teststellung 100% Rabatt Gesamt 0,00"
      },
      {
        fileName: "eventtechnik-mietrechnung-4.pdf",
        originalFilePath: "uploads/demo/eventtechnik-mietrechnung-4.pdf",
        previewImagePath: null,
        pageNumberDetected: 4,
        totalPagesDetected: 4,
        qualityStatus: "accepted",
        sharpnessScore: 0.92,
        completenessScore: 0.96,
        perspectiveScore: 0.93,
        extractedText:
          "Eventtechnik Donau GmbH Rechnung ETD-2026-8841 Seite 4/4 Finale Summenbox Netto EUR 11882,00 USt 20% EUR 2376,40 Brutto EUR 14258,40 Footer UID ATU99887766 FN 445566k IBAN AT483200000012345864 BIC RLNWATWW"
      }
    ],
    lineItems: [
      {
        sourcePageNumber: 1,
        positionNumber: "1",
        quantity: 2,
        unit: "Stk",
        description: "GrandMA3 Fullsize Lichtpult mit Backup-Netzteil",
        unitPrice: 480,
        duration: "3 Tage",
        discountPercent: 10,
        netAmount: 2592,
        taxRate: 20,
        grossAmount: 3110.4,
        confidence: 0.9
      },
      {
        sourcePageNumber: 2,
        positionNumber: "2",
        quantity: 1,
        unit: "Paket",
        description: "LED Wall 3,9mm inkl. Prozessor, Flightcases und Verkabelung",
        unitPrice: 2200,
        duration: "3 Tage",
        discountPercent: 10,
        netAmount: 5940,
        taxRate: 20,
        grossAmount: 7128,
        confidence: 0.88
      },
      {
        sourcePageNumber: 2,
        positionNumber: "3",
        quantity: 1,
        unit: "Paket",
        description: "Rigging Safety Package mit Traversen, Motoren und Abnahmen",
        unitPrice: 1800,
        duration: "Projekt",
        discountPercent: 0,
        netAmount: 1800,
        taxRate: 20,
        grossAmount: 2160,
        confidence: 0.86
      },
      {
        sourcePageNumber: 3,
        positionNumber: "4",
        quantity: 1,
        unit: "Pauschale",
        description: "Transport Wien-Linz-Wien",
        unitPrice: 650,
        duration: "Projekt",
        discountPercent: 0,
        netAmount: 650,
        taxRate: 20,
        grossAmount: 780,
        confidence: 0.91
      },
      {
        sourcePageNumber: 3,
        positionNumber: "5",
        quantity: 1,
        unit: "Pauschale",
        description: "Operator Setup und technische Einweisung",
        unitPrice: 900,
        duration: "Projekt",
        discountPercent: 0,
        netAmount: 900,
        taxRate: 20,
        grossAmount: 1080,
        confidence: 0.9
      },
      {
        sourcePageNumber: 3,
        positionNumber: "6",
        quantity: 1,
        unit: "Stk",
        description: "Ersatzgerät Teststellung für Signalstrecke",
        unitPrice: 350,
        duration: "1 Tag",
        discountPercent: 100,
        netAmount: 0,
        taxRate: 20,
        grossAmount: 0,
        confidence: 0.93
      }
    ]
  },
  {
    id: "demo-cost-assessment-zero-tax",
    documentType: "cost_assessment",
    supplierName: "Magistrat der Stadt Wien",
    supplierAddress: "Rathausplatz 1, 1010 Wien",
    supplierUid: "ATU36801500",
    supplierIban: "AT481100000012345678",
    supplierBic: "BKAUATWW",
    customerName: "Chalakov & Plaschka Consulting OG",
    customerAddress: "Schottenring 12, 1010 Wien",
    customerNumber: "K-4711",
    invoiceNumber: "KV-2026-55021",
    invoiceDate: date("2026-05-04"),
    deliveryDate: date("2026-05-04"),
    orderNumber: "MA-REFERENZ-2026-91",
    paymentReference: "RF18550210000004711",
    zeroTaxReason: "Keine Umsatzsteuer, da kein steuerbarer Vorgang vorliegt.",
    currency: "EUR",
    netAmount: 486.5,
    taxAmount: 0,
    taxRate: 0,
    grossAmount: 486.5,
    paymentTerms: "Bitte Zahlungsreferenz RF18550210000004711 verwenden.",
    status: "reviewed",
    exportApproved: true,
    pages: [
      {
        fileName: "kostenvorschreibung-0-ust.pdf",
        originalFilePath: "uploads/demo/kostenvorschreibung-0-ust.pdf",
        previewImagePath: null,
        pageNumberDetected: 1,
        totalPagesDetected: 1,
        qualityStatus: "accepted",
        sharpnessScore: 0.93,
        completenessScore: 0.97,
        perspectiveScore: 0.96,
        extractedText:
          "Kostenvorschreibung KV-2026-55021 Rechnungsdatum 04.05.2026 Lieferdatum 04.05.2026 Kundennummer K-4711 Sachbearbeiter MA06 USt 0,00 Endbetrag EUR 486,50 Keine Umsatzsteuer, da kein steuerbarer Vorgang vorliegt. IBAN AT481100000012345678 BIC BKAUATWW Zahlungsreferenz RF18550210000004711"
      }
    ],
    lineItems: [
      {
        sourcePageNumber: 1,
        positionNumber: "1",
        quantity: 1,
        unit: "Pauschale",
        description: "Verwaltungs- und Marktgebühr Mai 2026",
        unitPrice: 486.5,
        discountPercent: 0,
        netAmount: 486.5,
        taxRate: 0,
        grossAmount: 486.5,
        confidence: 0.94
      }
    ]
  },
  {
    id: "demo-missing-invoice-number",
    documentType: "invoice",
    supplierName: "Alpen Bau Service GmbH",
    supplierAddress: "Hauptplatz 4, 6020 Innsbruck",
    supplierUid: "ATU11223344",
    supplierIban: "AT203200000099887766",
    supplierBic: "RLNWATWW",
    customerName: "Chalakov & Plaschka Consulting OG",
    customerAddress: "Schottenring 12, 1010 Wien",
    invoiceNumber: null,
    invoiceDate: date("2026-05-06"),
    deliveryDate: date("2026-05-05"),
    currency: "EUR",
    netAmount: 840,
    taxAmount: 168,
    taxRate: 20,
    grossAmount: 1008,
    paymentTerms: "14 Tage netto",
    status: "review_required",
    pages: [
      {
        fileName: "rechnung-ohne-nummer.pdf",
        originalFilePath: "uploads/demo/rechnung-ohne-nummer.pdf",
        previewImagePath: null,
        pageNumberDetected: 1,
        totalPagesDetected: 1,
        qualityStatus: "accepted",
        sharpnessScore: 0.9,
        completenessScore: 0.94,
        perspectiveScore: 0.9,
        extractedText:
          "Alpen Bau Service GmbH UID ATU11223344 Rechnung Rechnungsdatum 06.05.2026 Leistungsdatum 05.05.2026 Netto 840,00 USt 168,00 Brutto 1008,00 IBAN AT203200000099887766"
      }
    ],
    lineItems: [
      {
        sourcePageNumber: 1,
        positionNumber: "1",
        quantity: 6,
        unit: "Std",
        description: "Montageleistung Lagerregal",
        unitPrice: 140,
        netAmount: 840,
        taxRate: 20,
        grossAmount: 1008,
        confidence: 0.87
      }
    ]
  },
  {
    id: "demo-wrong-tax",
    documentType: "invoice",
    supplierName: "IT Solutions Linz GmbH",
    supplierAddress: "Industriezeile 18, 4020 Linz",
    supplierUid: "ATU55667788",
    supplierIban: "AT999999000000123456",
    supplierBic: "RZOOAT2L",
    customerName: "Chalakov & Plaschka Consulting OG",
    customerAddress: "Schottenring 12, 1010 Wien",
    invoiceNumber: "ITL-2026-2209",
    invoiceDate: date("2026-05-03"),
    deliveryDate: date("2026-05-02"),
    currency: "EUR",
    netAmount: 1000,
    taxAmount: 150,
    taxRate: 20,
    grossAmount: 1150,
    paymentTerms: "7 Tage netto",
    status: "review_required",
    pages: [
      {
        fileName: "rechnung-falsche-ust.pdf",
        originalFilePath: "uploads/demo/rechnung-falsche-ust.pdf",
        previewImagePath: null,
        pageNumberDetected: 1,
        totalPagesDetected: 1,
        qualityStatus: "accepted",
        sharpnessScore: 0.92,
        completenessScore: 0.96,
        perspectiveScore: 0.94,
        extractedText:
          "IT Solutions Linz GmbH UID ATU55667788 Rechnung ITL-2026-2209 Rechnungsdatum 03.05.2026 Leistungsdatum 02.05.2026 Softwarewartung Netto 1000,00 USt 20% 150,00 Brutto 1150,00 IBAN AT999999000000123456"
      }
    ],
    lineItems: [
      {
        sourcePageNumber: 1,
        positionNumber: "1",
        quantity: 1,
        unit: "Pauschale",
        description: "Softwarewartung und Lizenzsupport",
        unitPrice: 1000,
        netAmount: 1000,
        taxRate: 20,
        grossAmount: 1150,
        confidence: 0.92
      }
    ]
  },
  {
    id: "demo-missing-page",
    documentType: "invoice",
    supplierName: "PrintPlus KG",
    supplierAddress: "Druckereigasse 7, 8010 Graz",
    supplierUid: "ATU66778899",
    supplierIban: "AT223200000087654321",
    supplierBic: "RLNWATWWGRA",
    customerName: "Chalakov & Plaschka Consulting OG",
    customerAddress: "Schottenring 12, 1010 Wien",
    invoiceNumber: "PP-2026-3001",
    invoiceDate: date("2026-05-01"),
    deliveryDate: date("2026-04-30"),
    currency: "EUR",
    netAmount: 2450,
    taxAmount: 490,
    taxRate: 20,
    grossAmount: 2940,
    paymentTerms: "30 Tage netto",
    status: "review_required",
    pages: [
      {
        fileName: "printplus-rechnung-1.pdf",
        originalFilePath: "uploads/demo/printplus-rechnung-1.pdf",
        previewImagePath: null,
        pageNumberDetected: 1,
        totalPagesDetected: 3,
        qualityStatus: "accepted",
        sharpnessScore: 0.88,
        completenessScore: 0.93,
        perspectiveScore: 0.91,
        extractedText:
          "PrintPlus KG Rechnung PP-2026-3001 Seite 1/3 UID ATU66778899 Empfänger Chalakov & Plaschka Consulting OG Rechnungsdatum 01.05.2026 Leistungsdatum 30.04.2026 Position 1 Broschürendruck"
      },
      {
        fileName: "printplus-rechnung-3.pdf",
        originalFilePath: "uploads/demo/printplus-rechnung-3.pdf",
        previewImagePath: null,
        pageNumberDetected: 3,
        totalPagesDetected: 3,
        qualityStatus: "accepted",
        sharpnessScore: 0.87,
        completenessScore: 0.92,
        perspectiveScore: 0.9,
        extractedText:
          "PrintPlus KG Rechnung PP-2026-3001 Seite 3/3 Summen Netto 2450,00 USt 490,00 Brutto 2940,00 IBAN AT223200000087654321"
      }
    ],
    lineItems: [
      {
        sourcePageNumber: 1,
        positionNumber: "1",
        quantity: 1000,
        unit: "Stk",
        description: "Broschürendruck 24 Seiten",
        unitPrice: 2.45,
        netAmount: 2450,
        taxRate: 20,
        grossAmount: 2940,
        confidence: 0.79
      }
    ]
  },
  {
    id: "demo-blurry-duplicate",
    documentType: "invoice",
    supplierName: "ViennaOffice Supplies GmbH",
    supplierAddress: "Mariahilfer Strasse 101, 1060 Wien",
    supplierUid: "ATU12345678",
    supplierIban: "AT611904300234573201",
    supplierBic: "BKAUATWW",
    customerName: "Chalakov & Plaschka Consulting OG",
    customerAddress: "Schottenring 12, 1010 Wien",
    invoiceNumber: "VO-2026-041",
    invoiceDate: date("2026-05-02"),
    deliveryDate: date("2026-05-01"),
    currency: "EUR",
    netAmount: 1200,
    taxAmount: 240,
    taxRate: 20,
    grossAmount: 1440,
    paymentTerms: "Scan unklar, bitte Original prüfen",
    status: "review_required",
    pages: [
      {
        fileName: "unscharfer-scan-vo-2026-041.jpg",
        originalFilePath: "uploads/demo/unscharfer-scan-vo-2026-041.jpg",
        previewImagePath: null,
        pageNumberDetected: 1,
        totalPagesDetected: 1,
        qualityStatus: "warning",
        sharpnessScore: 0.42,
        completenessScore: 0.83,
        perspectiveScore: 0.71,
        extractedText:
          "ViennaOffice Supplies GmbH Rechnung VO-2026-041 Rechnungsdatum 02.05.2026 Lieferung 01.05.2026 Netto 1200 USt 240 Brutto 1440 IBAN AT611904300234573201"
      }
    ],
    lineItems: [
      {
        sourcePageNumber: 1,
        positionNumber: "1",
        quantity: 12,
        unit: "Pack",
        description: "Büromaterial und Archivboxen, Scan unscharf",
        unitPrice: 100,
        netAmount: 1200,
        taxRate: 20,
        grossAmount: 1440,
        confidence: 0.55
      }
    ]
  }
];

function summarizeValidation(results: ReturnType<typeof invoiceValidationService.validate>): string {
  if (results.some((result) => result.severity === "error")) {
    return "error";
  }

  if (results.some((result) => result.severity === "warning")) {
    return "warning";
  }

  return "valid";
}

function summarizeRisk(risks: ReturnType<typeof riskAnalysisService.analyze>): string {
  if (risks.some((risk) => risk.severity === "high")) {
    return "high";
  }

  if (risks.some((risk) => risk.severity === "medium")) {
    return "medium";
  }

  return "low";
}

function fieldString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function demoExtractedFields(invoice: DemoInvoice) {
  const reviewed = invoice.status === "approved" || invoice.status === "reviewed" || invoice.exportApproved;
  const lineConfidence = Math.min(...invoice.lineItems.map((item) => item.confidence), 0.96);

  const makeField = (
    fieldPath: string,
    label: string,
    value: unknown,
    valueType: string,
    confidence: number,
    sourcePageNumber: number | null,
    sourceText: string | null
  ) => {
    const finalValue = fieldString(value);
    const needsReview = !reviewed && (finalValue === null || confidence < 0.75);
    return {
      fieldPath,
      label,
      aiValue: finalValue,
      finalValue,
      valueType,
      confidence,
      sourcePageNumber,
      sourceText,
      needsReview,
      status: reviewed ? "confirmed" : finalValue === null ? "missing" : confidence < 0.75 ? "low_confidence" : "extracted",
      boundingBoxJson: null
    };
  };

  return [
    makeField("supplier.name", "Lieferant", invoice.supplierName, "string", 0.94, 1, invoice.supplierName ?? null),
    makeField("supplier.address", "Lieferantenadresse", invoice.supplierAddress, "string", 0.88, 1, invoice.supplierAddress ?? null),
    makeField("supplier.uidNumber", "UID Lieferant", invoice.supplierUid, "string", 0.9, 1, invoice.supplierUid ?? null),
    makeField("supplier.iban", "IBAN", invoice.supplierIban, "string", 0.9, invoice.pages.at(-1)?.pageNumberDetected ?? 1, invoice.supplierIban ?? null),
    makeField("customer.name", "Empfaenger", invoice.customerName, "string", 0.9, 1, invoice.customerName ?? null),
    makeField("customer.address", "Empfaengeradresse", invoice.customerAddress, "string", 0.82, 1, invoice.customerAddress ?? null),
    makeField("invoice.invoiceNumber", "Rechnungsnummer", invoice.invoiceNumber, "string", invoice.invoiceNumber ? 0.92 : 0.42, 1, invoice.invoiceNumber ?? null),
    makeField("invoice.invoiceDate", "Rechnungsdatum", invoice.invoiceDate, "date", 0.91, 1, fieldString(invoice.invoiceDate)),
    makeField("invoice.serviceDate", "Leistungsdatum", invoice.deliveryDate, "date", 0.88, 1, fieldString(invoice.deliveryDate)),
    makeField("invoice.currency", "Waehrung", invoice.currency ?? "EUR", "string", 0.98, 1, invoice.currency ?? "EUR"),
    makeField("invoice.paymentTerms", "Zahlungsbedingungen", invoice.paymentTerms, "string", 0.78, 1, invoice.paymentTerms ?? null),
    makeField("amounts.netAmount", "Netto", invoice.netAmount, "number", lineConfidence, invoice.pages.at(-1)?.pageNumberDetected ?? 1, fieldString(invoice.netAmount)),
    makeField("amounts.taxAmount", "USt", invoice.taxAmount, "number", lineConfidence, invoice.pages.at(-1)?.pageNumberDetected ?? 1, fieldString(invoice.taxAmount)),
    makeField("amounts.grossAmount", "Brutto", invoice.grossAmount, "number", lineConfidence, invoice.pages.at(-1)?.pageNumberDetected ?? 1, fieldString(invoice.grossAmount)),
    makeField("amounts.taxRates", "Steuersaetze", invoice.taxRate, "array", lineConfidence, invoice.pages.at(-1)?.pageNumberDetected ?? 1, fieldString(invoice.taxRate))
  ];
}

async function main() {
  await prisma.exportRecord.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.bookingSuggestion.deleteMany();
  await prisma.riskIndicator.deleteMany();
  await prisma.validationResult.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoicePage.deleteMany();
  await prisma.invoice.deleteMany();

  const processedCandidates: Array<{
    id: string;
    supplierName?: string | null;
    invoiceNumber?: string | null;
  }> = [];

  for (const invoice of demoInvoices) {
    const validationResults = invoiceValidationService.validate(invoice, {
      duplicateCandidates: processedCandidates,
      knownSuppliers,
      today: date("2026-05-13")
    });
    const riskIndicators = riskAnalysisService.analyze(invoice, validationResults, {
      duplicateCandidates: processedCandidates,
      knownSuppliers,
      today: date("2026-05-13")
    });
    const bookingSuggestion = bookingSuggestionService.suggest(invoice, { knownSuppliers });

    await prisma.invoice.create({
      data: {
        id: invoice.id,
        tenantId: invoice.tenantId ?? "demo-tenant",
        documentType: invoice.documentType,
        supplierName: invoice.supplierName,
        supplierAddress: invoice.supplierAddress,
        supplierUid: invoice.supplierUid,
        supplierIban: invoice.supplierIban,
        supplierBic: invoice.supplierBic,
        supplierCompanyRegisterNumber: invoice.supplierCompanyRegisterNumber,
        customerName: invoice.customerName,
        customerAddress: invoice.customerAddress,
        customerUid: invoice.customerUid,
        customerNumber: invoice.customerNumber,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : null,
        deliveryDate: invoice.deliveryDate ? new Date(invoice.deliveryDate) : null,
        servicePeriod: invoice.servicePeriod,
        orderNumber: invoice.orderNumber,
        offerNumber: invoice.offerNumber,
        deliveryNoteNumber: invoice.deliveryNoteNumber,
        paymentReference: invoice.paymentReference,
        zeroTaxReason: invoice.zeroTaxReason,
        currency: invoice.currency ?? "EUR",
        netAmount: invoice.netAmount,
        taxAmount: invoice.taxAmount,
        taxRate: invoice.taxRate,
        grossAmount: invoice.grossAmount,
        paymentTerms: invoice.paymentTerms,
        status: invoice.status ?? "review_required",
        validationStatus: summarizeValidation(validationResults),
        riskLevel: summarizeRisk(riskIndicators),
        exportApproved: invoice.exportApproved ?? false,
        aiProvider: "Mock",
        aiModel: "mock-invoice-provider",
        aiMode: "mock",
        aiStatus: "completed",
        aiOverallConfidence: Math.min(...invoice.lineItems.map((item) => item.confidence), 0.96),
        aiAnalyzedAt: new Date(),
        pages: {
          create: invoice.pages.map((page) => ({
            fileName: page.fileName,
            originalFilePath: page.originalFilePath,
            previewImagePath: page.previewImagePath,
            pageNumberDetected: page.pageNumberDetected,
            totalPagesDetected: page.totalPagesDetected,
            qualityStatus: page.qualityStatus,
            sharpnessScore: page.sharpnessScore,
            completenessScore: page.completenessScore,
            perspectiveScore: page.perspectiveScore,
            extractedText: page.extractedText
          }))
        },
        lineItems: {
          create: invoice.lineItems.map((item) => ({
            sourcePageNumber: item.sourcePageNumber,
            positionNumber: item.positionNumber,
            quantity: item.quantity,
            unit: item.unit,
            description: item.description,
            unitPrice: item.unitPrice,
            duration: item.duration,
            discountPercent: item.discountPercent,
            netAmount: item.netAmount,
            taxRate: item.taxRate,
            grossAmount: item.grossAmount,
            confidence: item.confidence
          }))
        },
        extractedFields: {
          create: demoExtractedFields(invoice)
        },
        validationResults: {
          create: validationResults.map((result) => ({
            field: result.field,
            status: result.status,
            severity: result.severity,
            explanation: result.explanation,
            sourcePageNumber: result.sourcePageNumber
          }))
        },
        riskIndicators: {
          create: riskIndicators.map((risk) => ({
            title: risk.title,
            description: risk.description,
            severity: risk.severity,
            recommendation: risk.recommendation,
            reason: risk.reason
          }))
        },
        bookingSuggestion: {
          create: {
            bookingDate: bookingSuggestion.bookingDate ? new Date(bookingSuggestion.bookingDate) : null,
            documentNumber: bookingSuggestion.documentNumber,
            supplier: bookingSuggestion.supplier,
            bookingText: bookingSuggestion.bookingText,
            netAmount: bookingSuggestion.netAmount,
            taxAmount: bookingSuggestion.taxAmount,
            grossAmount: bookingSuggestion.grossAmount,
            taxAccount: bookingSuggestion.taxAccount,
            expenseAccount: bookingSuggestion.expenseAccount,
            supplierAccount: bookingSuggestion.supplierAccount,
            costCenter: bookingSuggestion.costCenter,
            status:
              invoice.status === "approved" || invoice.id === "demo-cost-assessment-zero-tax"
                ? "approved"
                : bookingSuggestion.status
          }
        },
        auditLogs: {
          create: [
            {
              action: "DOCUMENT_UPLOADED",
              description: "Demo-Beleg wurde in den Seed-Daten angelegt.",
              actor: "System"
            },
            {
              action: "QUALITY_CHECK_COMPLETED",
              description: "Mockbasierte Qualitätsprüfung gespeichert.",
              actor: "DocumentQualityService"
            },
            {
              action: "RULE_CHECK_COMPLETED",
              description: "Regelbasierte § 11 UStG-Prüfung ausgeführt.",
              actor: "InvoiceValidationService"
            },
            {
              action: "BOOKING_SUGGESTION_CREATED",
              description: "Buchungsvorschlag aus Lieferanten- und Keyword-Regeln erzeugt.",
              actor: "BookingSuggestionService"
            }
          ]
        }
      }
    });

    processedCandidates.push({
      id: invoice.id,
      supplierName: invoice.supplierName,
      invoiceNumber: invoice.invoiceNumber
    });
  }

  console.log(`Seeded ${demoInvoices.length} FinancePro demo invoices.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

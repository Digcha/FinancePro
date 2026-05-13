import type { AIInvoiceExtractionProvider } from "./ai-provider.interface";
import type { ExtractedField, InvoiceAIExtractionResult, InvoiceAIInput } from "../types";
import { InvoiceAIExtractionResultSchema } from "../schemas/invoice-ai-result.schema";

const LOW_CONFIDENCE = 0.58;

function field<T>(
  value: T | null,
  confidence: number,
  sourcePage: number | null,
  sourceText: string | null,
  needsReview = value === null || confidence < 0.75
): ExtractedField<T> {
  return {
    value,
    confidence,
    sourcePage,
    sourceText,
    needsReview,
    boundingBox: null
  };
}

function baseResult(overrides: Partial<InvoiceAIExtractionResult> = {}): InvoiceAIExtractionResult {
  const result: InvoiceAIExtractionResult = {
    document: {
      documentType: "invoice",
      language: "de",
      country: "AT",
      pageCount: 1,
      isMultiPage: false,
      detectedPageNumbers: [1],
      missingPages: [],
      overallConfidence: 0.93
    },
    supplier: {
      name: field("ViennaOffice Supplies GmbH", 0.96, 1, "ViennaOffice Supplies GmbH"),
      address: field("Mariahilfer Strasse 101, 1060 Wien", 0.91, 1, "Mariahilfer Strasse 101 1060 Wien"),
      uidNumber: field("ATU12345678", 0.95, 1, "UID ATU12345678"),
      taxNumber: field(null, 0.2, null, null),
      companyRegisterNumber: field("FN 123456a", 0.88, 1, "FN 123456a"),
      iban: field("AT611904300234573201", 0.94, 1, "IBAN AT611904300234573201"),
      bic: field("BKAUATWW", 0.9, 1, "BIC BKAUATWW")
    },
    customer: {
      name: field("Chalakov & Plaschka Consulting OG", 0.93, 1, "Empfänger Chalakov & Plaschka Consulting OG"),
      address: field("Schottenring 12, 1010 Wien", 0.88, 1, "Schottenring 12, 1010 Wien"),
      uidNumber: field("ATU87654321", 0.84, 1, "UID ATU87654321")
    },
    invoice: {
      invoiceNumber: field("VO-2026-041", 0.96, 1, "Rechnung VO-2026-041"),
      invoiceDate: field("02.05.2026", 0.95, 1, "Rechnungsdatum 02.05.2026"),
      serviceDate: field("01.05.2026", 0.91, 1, "Lieferung 01.05.2026"),
      servicePeriodStart: field(null, 0.3, null, null),
      servicePeriodEnd: field(null, 0.3, null, null),
      currency: field("EUR", 0.98, 1, "EUR"),
      paymentTerms: field("Zahlbar binnen 14 Tagen ohne Abzug", 0.86, 1, "Zahlbar binnen 14 Tagen ohne Abzug"),
      dueDate: field(null, 0.4, null, null),
      orderReference: field("PO-2026-118", 0.84, 1, "PO-2026-118"),
      customerNumber: field(null, 0.3, null, null)
    },
    amounts: {
      netAmount: field(1200, 0.96, 1, "Netto 1.200,00"),
      taxAmount: field(240, 0.96, 1, "USt 20% 240,00"),
      grossAmount: field(1440, 0.97, 1, "Brutto 1.440,00"),
      taxRates: field([20], 0.96, 1, "USt 20%"),
      discountAmount: field(0, 0.88, 1, "kein Rabatt ausgewiesen"),
      roundingDifference: field(0, 0.88, 1, "keine Rundungsdifferenz ausgewiesen")
    },
    lineItems: [
      {
        positionNumber: "1",
        description: "Büromaterial und Archivboxen",
        quantity: 12,
        unit: "Pack",
        unitPrice: 100,
        discountPercent: 0,
        netAmount: 1200,
        taxRate: 20,
        taxAmount: 240,
        grossAmount: 1440,
        sourcePage: 1,
        confidence: 0.94
      }
    ],
    specialTaxTreatment: {
      isReverseCharge: false,
      isIntraCommunitySupply: false,
      isSmallBusiness: false,
      isNonTaxableTransaction: false,
      isVatExempt: false,
      reasonText: null,
      sourcePage: null,
      confidence: 0.92
    },
    documentQuality: {
      readability: 0.93,
      sharpness: 0.9,
      completeness: 0.96,
      missingPages: [],
      pageCount: 1,
      warnings: []
    },
    aiWarnings: []
  };

  return InvoiceAIExtractionResultSchema.parse({
    ...result,
    ...overrides
  });
}

function multiPageEventInvoice(pageCount: number): InvoiceAIExtractionResult {
  return baseResult({
    document: {
      documentType: "rental_invoice",
      language: "de",
      country: "AT",
      pageCount: Math.max(pageCount, 4),
      isMultiPage: true,
      detectedPageNumbers: [1, 2, 3, 4],
      missingPages: [],
      overallConfidence: 0.9
    },
    supplier: {
      name: field("Eventtechnik Donau GmbH", 0.94, 1, "Eventtechnik Donau GmbH"),
      address: field("Hafenstrasse 8, 4020 Linz", 0.86, 1, "Hafenstrasse 8, 4020 Linz"),
      uidNumber: field("ATU99887766", 0.94, 4, "Footer UID ATU99887766"),
      taxNumber: field(null, 0.2, null, null),
      companyRegisterNumber: field("FN 445566k", 0.9, 4, "FN 445566k"),
      iban: field("AT483200000012345864", 0.94, 4, "IBAN AT483200000012345864"),
      bic: field("RLNWATWW", 0.91, 4, "BIC RLNWATWW")
    },
    customer: {
      name: field("Chalakov & Plaschka Consulting OG", 0.91, 1, "Empfänger Chalakov & Plaschka Consulting OG"),
      address: field("Schottenring 12, 1010 Wien", 0.82, 1, "Schottenring 12, 1010 Wien"),
      uidNumber: field("ATU87654321", 0.8, 1, "UID ATU87654321")
    },
    invoice: {
      invoiceNumber: field("ETD-2026-8841", 0.95, 1, "Rechnung ETD-2026-8841"),
      invoiceDate: field("29.04.2026", 0.91, 1, "Rechnungsdatum 29.04.2026"),
      serviceDate: field("26.04.2026", 0.82, 1, "Event 24.04.2026 bis 26.04.2026"),
      servicePeriodStart: field("24.04.2026", 0.89, 1, "24.04.2026 bis 26.04.2026"),
      servicePeriodEnd: field("26.04.2026", 0.89, 1, "24.04.2026 bis 26.04.2026"),
      currency: field("EUR", 0.97, 4, "Finale Summenbox Netto EUR"),
      paymentTerms: field("Zahlbar binnen 7 Tagen", 0.84, 1, "Zahlbar binnen 7 Tagen"),
      dueDate: field(null, 0.4, null, null),
      orderReference: field("PROJ-26-OMNIA", 0.9, 1, "Projekt PROJ-26-OMNIA"),
      customerNumber: field(null, 0.3, null, null)
    },
    amounts: {
      netAmount: field(11882, 0.94, 4, "Finale Summenbox Netto EUR 11882,00"),
      taxAmount: field(2376.4, 0.94, 4, "USt 20% EUR 2376,40"),
      grossAmount: field(14258.4, 0.95, 4, "Brutto EUR 14258,40"),
      taxRates: field([20], 0.93, 4, "USt 20%"),
      discountAmount: field(972, 0.72, 2, "Rabatt 10%"),
      roundingDifference: field(0, 0.84, 4, "Finale Summenbox")
    },
    lineItems: [
      {
        positionNumber: "1",
        description: "GrandMA3 Fullsize Lichtpult mit Backup-Netzteil",
        quantity: 2,
        unit: "Stk",
        unitPrice: 480,
        discountPercent: 10,
        netAmount: 2592,
        taxRate: 20,
        taxAmount: 518.4,
        grossAmount: 3110.4,
        sourcePage: 1,
        confidence: 0.9
      },
      {
        positionNumber: "2",
        description: "LED Wall 3,9mm inkl. Prozessor, Flightcases und Verkabelung",
        quantity: 1,
        unit: "Paket",
        unitPrice: 2200,
        discountPercent: 10,
        netAmount: 5940,
        taxRate: 20,
        taxAmount: 1188,
        grossAmount: 7128,
        sourcePage: 2,
        confidence: 0.88
      },
      {
        positionNumber: "6",
        description: "Ersatzgerät Teststellung für Signalstrecke",
        quantity: 1,
        unit: "Stk",
        unitPrice: 350,
        discountPercent: 100,
        netAmount: 0,
        taxRate: 20,
        taxAmount: 0,
        grossAmount: 0,
        sourcePage: 3,
        confidence: 0.91
      }
    ],
    documentQuality: {
      readability: 0.9,
      sharpness: 0.9,
      completeness: 0.95,
      missingPages: [],
      pageCount: Math.max(pageCount, 4),
      warnings: []
    }
  });
}

function zeroTaxCostAssessment(): InvoiceAIExtractionResult {
  return baseResult({
    document: {
      documentType: "cost_assessment",
      language: "de",
      country: "AT",
      pageCount: 1,
      isMultiPage: false,
      detectedPageNumbers: [1],
      missingPages: [],
      overallConfidence: 0.94
    },
    supplier: {
      name: field("Magistrat der Stadt Wien", 0.93, 1, "Magistrat der Stadt Wien"),
      address: field("Rathausplatz 1, 1010 Wien", 0.9, 1, "Rathausplatz 1, 1010 Wien"),
      uidNumber: field("ATU36801500", 0.82, 1, "UID ATU36801500"),
      taxNumber: field(null, 0.2, null, null),
      companyRegisterNumber: field(null, 0.2, null, null),
      iban: field("AT481100000012345678", 0.92, 1, "IBAN AT481100000012345678"),
      bic: field("BKAUATWW", 0.88, 1, "BIC BKAUATWW")
    },
    customer: {
      name: field("Chalakov & Plaschka Consulting OG", 0.9, 1, "Chalakov & Plaschka Consulting OG"),
      address: field("Schottenring 12, 1010 Wien", 0.82, 1, "Schottenring 12, 1010 Wien"),
      uidNumber: field(null, 0.3, null, null)
    },
    invoice: {
      invoiceNumber: field("KV-2026-55021", 0.93, 1, "Kostenvorschreibung KV-2026-55021"),
      invoiceDate: field("04.05.2026", 0.91, 1, "Rechnungsdatum 04.05.2026"),
      serviceDate: field("04.05.2026", 0.84, 1, "Leistungsdatum 04.05.2026"),
      servicePeriodStart: field(null, 0.3, null, null),
      servicePeriodEnd: field(null, 0.3, null, null),
      currency: field("EUR", 0.97, 1, "EUR"),
      paymentTerms: field("Bitte Zahlungsreferenz RF18550210000004711 verwenden.", 0.85, 1, "Zahlungsreferenz RF18550210000004711"),
      dueDate: field(null, 0.4, null, null),
      orderReference: field("MA-REFERENZ-2026-91", 0.77, 1, "MA-REFERENZ-2026-91"),
      customerNumber: field("K-4711", 0.91, 1, "Kundennummer K-4711")
    },
    amounts: {
      netAmount: field(486.5, 0.94, 1, "Endbetrag EUR 486,50"),
      taxAmount: field(0, 0.96, 1, "USt 0,00"),
      grossAmount: field(486.5, 0.94, 1, "Endbetrag EUR 486,50"),
      taxRates: field([0], 0.95, 1, "USt 0,00"),
      discountAmount: field(0, 0.8, 1, "kein Rabatt ausgewiesen"),
      roundingDifference: field(0, 0.8, 1, "keine Rundungsdifferenz ausgewiesen")
    },
    lineItems: [
      {
        positionNumber: "1",
        description: "Verwaltungs- und Marktgebühr Mai 2026",
        quantity: 1,
        unit: "Pauschale",
        unitPrice: 486.5,
        discountPercent: 0,
        netAmount: 486.5,
        taxRate: 0,
        taxAmount: 0,
        grossAmount: 486.5,
        sourcePage: 1,
        confidence: 0.92
      }
    ],
    specialTaxTreatment: {
      isReverseCharge: false,
      isIntraCommunitySupply: false,
      isSmallBusiness: false,
      isNonTaxableTransaction: true,
      isVatExempt: false,
      reasonText: "Keine Umsatzsteuer, da kein steuerbarer Vorgang vorliegt.",
      sourcePage: 1,
      confidence: 0.96
    }
  });
}

function missingInvoiceNumber(): InvoiceAIExtractionResult {
  const result = baseResult();
  result.invoice.invoiceNumber = field(null, 0.42, null, null, true);
  result.aiWarnings.push({
    code: "MISSING_INVOICE_NUMBER",
    message: "Keine eindeutige fortlaufende Rechnungsnummer sichtbar.",
    severity: "error",
    sourcePage: 1
  });
  return InvoiceAIExtractionResultSchema.parse(result);
}

function wrongTaxSum(): InvoiceAIExtractionResult {
  const result = baseResult();
  result.supplier.name = field("IT Solutions Linz GmbH", 0.94, 1, "IT Solutions Linz GmbH");
  result.supplier.iban = field("AT999999000000123456", 0.92, 1, "IBAN AT999999000000123456");
  result.invoice.invoiceNumber = field("ITL-2026-2209", 0.94, 1, "Rechnung ITL-2026-2209");
  result.amounts.netAmount = field(1000, 0.95, 1, "Netto 1000,00");
  result.amounts.taxAmount = field(150, 0.95, 1, "USt 20% 150,00");
  result.amounts.grossAmount = field(1150, 0.95, 1, "Brutto 1150,00");
  result.lineItems = [
    {
      positionNumber: "1",
      description: "Softwarewartung und Lizenzsupport",
      quantity: 1,
      unit: "Pauschale",
      unitPrice: 1000,
      discountPercent: 0,
      netAmount: 1000,
      taxRate: 20,
      taxAmount: 150,
      grossAmount: 1150,
      sourcePage: 1,
      confidence: 0.92
    }
  ];
  return InvoiceAIExtractionResultSchema.parse(result);
}

function lowConfidenceInvoice(): InvoiceAIExtractionResult {
  const result = baseResult({
    document: {
      documentType: "invoice",
      language: "de",
      country: "AT",
      pageCount: 1,
      isMultiPage: false,
      detectedPageNumbers: [1],
      missingPages: [],
      overallConfidence: LOW_CONFIDENCE
    },
    documentQuality: {
      readability: 0.52,
      sharpness: 0.42,
      completeness: 0.82,
      missingPages: [],
      pageCount: 1,
      warnings: ["Scan unscharf; mehrere Felder brauchen Review."]
    },
    aiWarnings: [
      {
        code: "LOW_CONFIDENCE",
        message: "Dokumentqualität niedrig; bitte Originalbeleg prüfen.",
        severity: "warning",
        sourcePage: 1
      }
    ]
  });

  result.invoice.invoiceNumber = field("VO-2026-041", LOW_CONFIDENCE, 1, "unscharfer Ausschnitt VO-2026-041");
  result.amounts.netAmount = field(1200, LOW_CONFIDENCE, 1, "Netto 1200");
  result.amounts.taxAmount = field(240, LOW_CONFIDENCE, 1, "USt 240");
  result.amounts.grossAmount = field(1440, LOW_CONFIDENCE, 1, "Brutto 1440");
  result.lineItems = result.lineItems.map((item) => ({ ...item, confidence: LOW_CONFIDENCE }));
  return InvoiceAIExtractionResultSchema.parse(result);
}

export class MockInvoiceProvider implements AIInvoiceExtractionProvider {
  async extractInvoice(input: InvoiceAIInput): Promise<InvoiceAIExtractionResult> {
    const haystack = `${input.originalFileName} ${input.pages.map((page) => page.text ?? "").join(" ")}`.toLowerCase();

    if (haystack.includes("kostenvorschreibung") || haystack.includes("kein steuerbarer vorgang") || haystack.includes("zero")) {
      return zeroTaxCostAssessment();
    }

    if (haystack.includes("eventtechnik") || haystack.includes("mietrechnung") || input.pageCount > 1) {
      return multiPageEventInvoice(input.pageCount);
    }

    if (haystack.includes("fehlende rechnungsnummer") || haystack.includes("ohne-nummer") || haystack.includes("missing-invoice-number")) {
      return missingInvoiceNumber();
    }

    if (haystack.includes("falsche") || haystack.includes("wrong-tax") || haystack.includes("summe")) {
      return wrongTaxSum();
    }

    if (haystack.includes("unscharf") || haystack.includes("blurry") || haystack.includes("low-confidence")) {
      return lowConfidenceInvoice();
    }

    return baseResult({
      document: {
        documentType: "invoice",
        language: "de",
        country: "AT",
        pageCount: input.pageCount,
        isMultiPage: input.pageCount > 1,
        detectedPageNumbers: Array.from({ length: input.pageCount }, (_, index) => index + 1),
        missingPages: [],
        overallConfidence: 0.93
      },
      documentQuality: {
        readability: 0.9,
        sharpness: 0.88,
        completeness: 0.94,
        missingPages: [],
        pageCount: input.pageCount,
        warnings: []
      }
    });
  }

  isConfigured(): boolean {
    return true;
  }

  getProviderName(): string {
    return "Mock";
  }

  getModelName(): string {
    return "mock-invoice-provider";
  }
}

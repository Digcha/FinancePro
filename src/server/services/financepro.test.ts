import { describe, expect, it } from "vitest";
import { InvoiceAIService } from "@/lib/ai/invoice-ai-service";
import { MockInvoiceProvider } from "@/lib/ai/providers/mock-invoice-provider";
import { OpenAIInvoiceProvider } from "@/lib/ai/providers/openai-invoice-provider";
import { parseInvoiceAIJson } from "@/lib/ai/schemas/invoice-ai-result.schema";
import { AIInvoiceExtractionError, type InvoiceAIInput } from "@/lib/ai/types";
import { parseGermanNumber } from "@/lib/invoice/normalization/invoice-normalization-service";
import { validateAmountConsistency } from "@/lib/invoice/validation/amount-validation";
import type { ExportableInvoice, InvoiceValidationInput } from "@/server/domain/types";
import { exportService, invoiceValidationService, pageGroupingService, riskAnalysisService } from "@/server/services";

const aiInput: InvoiceAIInput = {
  originalFileName: "standardrechnung.pdf",
  mimeType: "application/pdf",
  pageCount: 1,
  pages: [
    {
      pageNumber: 1,
      mimeType: "application/pdf",
      fileName: "standardrechnung.pdf",
      text: "ViennaOffice Supplies GmbH Rechnung VO-2026-041 Netto 1200 USt 240 Brutto 1440"
    }
  ],
  locale: "de-AT",
  currencyHint: "EUR"
};

const baseInvoice: InvoiceValidationInput = {
  id: "test-1",
  documentType: "invoice",
  supplierName: "Test Lieferant GmbH",
  supplierAddress: "Teststrasse 1, 1010 Wien",
  supplierUid: "ATU12345678",
  supplierIban: "AT611904300234573201",
  customerName: "Test Kunde GmbH",
  customerAddress: "Kundengasse 2, 1020 Wien",
  invoiceNumber: "RE-2026-001",
  invoiceDate: new Date("2026-05-01T00:00:00.000Z"),
  deliveryDate: new Date("2026-05-01T00:00:00.000Z"),
  currency: "EUR",
  netAmount: 1000,
  taxAmount: 200,
  taxRate: 20,
  grossAmount: 1200,
  pages: [
    {
      pageNumberDetected: 1,
      totalPagesDetected: 1,
      qualityStatus: "accepted",
      sharpnessScore: 0.95,
      completenessScore: 0.95,
      perspectiveScore: 0.95,
      extractedText:
        "Test Lieferant GmbH Rechnung RE-2026-001 ATU12345678 Netto 1000,00 USt 200,00 Brutto 1200,00 IBAN AT611904300234573201"
    }
  ],
  lineItems: [
    {
      sourcePageNumber: 1,
      positionNumber: "1",
      description: "Beratung",
      quantity: 1,
      unit: "Pauschale",
      unitPrice: 1000,
      netAmount: 1000,
      taxRate: 20,
      grossAmount: 1200,
      confidence: 0.95
    }
  ]
};

describe("FinancePro AI pipeline rules", () => {
  it("startet ohne API-Key im Mock-Modus", () => {
    const service = new InvoiceAIService(new MockInvoiceProvider());
    expect(service.getProviderStatus().message).toBe("KI nicht konfiguriert — Mock-Modus aktiv");
    expect(service.getProviderStatus().mode).toBe("mock");
  });

  it("Mock Provider liefert ein valides Schema", async () => {
    const result = await new MockInvoiceProvider().extractInvoice(aiInput);
    expect(result.document.country).toBe("AT");
    expect(result.invoice.invoiceNumber.confidence).toBeGreaterThan(0.9);
  });

  it("OpenAI Provider erkennt Konfiguration", () => {
    const configured = new OpenAIInvoiceProvider({ apiKey: "sk-test", modelName: "gpt-4o-mini" });
    const unconfigured = new OpenAIInvoiceProvider({ apiKey: "", modelName: "gpt-4o-mini" });

    expect(configured.isConfigured()).toBe(true);
    expect(configured.getModelName()).toBe("gpt-4o-mini");
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it("ungueltiges JSON wird sauber abgefangen", () => {
    expect(() => parseInvoiceAIJson("kein json")).toThrow(AIInvoiceExtractionError);
  });

  it("Zod Schema validiert Confidence-Bereich", () => {
    const invalid = {
      document: {
        documentType: "invoice",
        language: "de",
        country: "AT",
        pageCount: 1,
        isMultiPage: false,
        detectedPageNumbers: [1],
        missingPages: [],
        overallConfidence: 1.4
      }
    };

    expect(() => parseInvoiceAIJson(JSON.stringify(invalid))).toThrow(AIInvoiceExtractionError);
  });

  it("normalisiert deutsche Betragsformate", () => {
    expect(parseGermanNumber("1.234,56 EUR")).toBe(1234.56);
    expect(parseGermanNumber("-1.234,56")).toBe(-1234.56);
  });

  it("validiert Netto + USt = Brutto und Rundungstoleranz 0,02", () => {
    expect(validateAmountConsistency({ netAmount: 100, taxAmount: 20, grossAmount: 120 }).status).toBe("pass");
    expect(validateAmountConsistency({ netAmount: 100, taxAmount: 20, grossAmount: 120.02 }).status).toBe("pass");
    expect(validateAmountConsistency({ netAmount: 100, taxAmount: 20, grossAmount: 120.05 }).status).toBe("error");
  });

  it("markiert 0,00 USt mit kein steuerbarer Vorgang nicht als Fehler", () => {
    const results = invoiceValidationService.validate({
      ...baseInvoice,
      documentType: "cost_assessment",
      taxAmount: 0,
      taxRate: 0,
      grossAmount: 1000,
      zeroTaxReason: "Keine Umsatzsteuer, da kein steuerbarer Vorgang vorliegt."
    });

    const grossResult = results.find((result) => result.field === "grossAmount");
    expect(grossResult?.severity).toBe("info");
    expect(grossResult?.status).toBe("pass");
  });

  it("fehlende Rechnungsnummer ist ein Fehler", () => {
    const results = invoiceValidationService.validate({
      ...baseInvoice,
      invoiceNumber: null
    });

    const invoiceNumber = results.find((result) => result.field === "invoiceNumber");
    expect(invoiceNumber?.severity).toBe("error");
  });

  it("mehrseitige Rechnung enthaelt korrekten pageCount", async () => {
    const result = await new MockInvoiceProvider().extractInvoice({
      ...aiInput,
      originalFileName: "eventtechnik-mietrechnung.pdf",
      pageCount: 4,
      pages: Array.from({ length: 4 }, (_, index) => ({
        pageNumber: index + 1,
        mimeType: "application/pdf",
        fileName: "eventtechnik-mietrechnung.pdf",
        text: `Eventtechnik Donau Seite ${index + 1}/4`
      }))
    });

    expect(result.document.pageCount).toBe(4);
    expect(result.document.isMultiPage).toBe(true);
    expect(result.lineItems.some((item) => item.sourcePage === 3)).toBe(true);
  });

  it("fehlende Seiten erzeugen Warning und Risiko", () => {
    const pages = [
      { ...baseInvoice.pages![0], pageNumberDetected: 1, totalPagesDetected: 3 },
      { ...baseInvoice.pages![0], pageNumberDetected: 3, totalPagesDetected: 3 }
    ];
    const invoice = { ...baseInvoice, pages };
    const results = invoiceValidationService.validate(invoice);
    const risks = riskAnalysisService.analyze(invoice, results);

    expect(pageGroupingService.detectMissingPages(pages)).toEqual([2]);
    expect(results.find((result) => result.field === "pages")?.severity).toBe("warning");
    expect(risks.some((risk) => risk.title === "Möglicherweise fehlende Seite")).toBe(true);
  });

  it("niedrige Confidence setzt needsReview", async () => {
    const result = await new MockInvoiceProvider().extractInvoice({
      ...aiInput,
      originalFileName: "low-confidence-unscharf.jpg",
      mimeType: "image/jpeg"
    });

    expect(result.document.overallConfidence).toBeLessThan(0.75);
    expect(result.invoice.invoiceNumber.needsReview).toBe(true);
  });

  it("Export bleibt ohne Review/Freigabe gesperrt", () => {
    const exportable: ExportableInvoice = {
      ...baseInvoice,
      status: "review_required",
      exportApproved: false,
      validationResults: invoiceValidationService.validate(baseInvoice),
      extractedFields: [],
      bookingSuggestion: {
        bookingDate: new Date("2026-05-02T00:00:00.000Z"),
        documentNumber: "RE-2026-001",
        supplier: "Test Lieferant GmbH",
        bookingText: "Testbuchung",
        netAmount: 1000,
        taxAmount: 200,
        grossAmount: 1200,
        taxAccount: "2500",
        expenseAccount: "7200",
        supplierAccount: "33000",
        status: "draft"
      }
    };

    expect(exportService.validateExport(exportable).canExport).toBe(false);
  });

  it("Export nutzt korrigierte freigegebene Werte", () => {
    const exportable: ExportableInvoice = {
      ...baseInvoice,
      invoiceNumber: "RE-2026-CORR",
      status: "approved",
      exportApproved: true,
      validationResults: invoiceValidationService.validate({ ...baseInvoice, invoiceNumber: "RE-2026-CORR" }),
      extractedFields: [
        {
          fieldPath: "invoice.invoiceNumber",
          finalValue: "RE-2026-CORR",
          needsReview: false,
          status: "corrected"
        }
      ],
      bookingSuggestion: {
        bookingDate: new Date("2026-05-02T00:00:00.000Z"),
        documentNumber: "RE-2026-CORR",
        supplier: "Test Lieferant GmbH",
        bookingText: "Testbuchung",
        netAmount: 1000,
        taxAmount: 200,
        grossAmount: 1200,
        taxAccount: "2500",
        expenseAccount: "7200",
        supplierAccount: "33000",
        status: "approved"
      }
    };

    const csv = exportService.generate(exportable, "BMD", "csv");
    expect(csv.body).toContain("RE-2026-CORR");
    expect(csv.validation.canExport).toBe(true);
  });
});

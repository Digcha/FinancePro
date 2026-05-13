import type { AIProviderStatus, InvoiceAIExtractionResult } from "@/lib/ai/types";
import { AIInvoiceExtractionError } from "@/lib/ai/types";
import { financeProConfig } from "@/lib/config";
import { invoiceNormalizationService, type NormalizedInvoiceProjection } from "@/lib/invoice/normalization/invoice-normalization-service";
import { prisma } from "@/lib/prisma";
import type { AnalysisContext, InvoiceValidationInput, RiskIndicatorInput, ValidationResultInput } from "@/server/domain/types";
import type { StoredInvoicePage } from "@/lib/documents/document-processing-service";
import { bookingSuggestionService } from "@/server/services/bookingSuggestionService";
import { invoiceValidationService } from "@/server/services/invoiceValidationService";
import { riskAnalysisService } from "@/server/services/riskAnalysisService";

export function summarizeValidation(results: ValidationResultInput[]): string {
  if (results.some((result) => result.severity === "error")) {
    return "error";
  }

  if (results.some((result) => result.severity === "warning")) {
    return "warning";
  }

  return "valid";
}

export function summarizeRisk(risks: RiskIndicatorInput[]): string {
  if (risks.some((risk) => risk.severity === "high")) {
    return "high";
  }

  if (risks.some((risk) => risk.severity === "medium")) {
    return "medium";
  }

  return "low";
}

function needsReviewStatus(needsReview: boolean, confidence: number, finalValue: string | null) {
  if (finalValue === null) {
    return "missing";
  }

  if (needsReview || confidence < financeProConfig.lowConfidenceThreshold) {
    return "low_confidence";
  }

  return "extracted";
}

function pageCreateData(pages: StoredInvoicePage[]) {
  return pages.map((page) => ({
    fileName: page.fileName,
    originalFilePath: page.originalFilePath,
    previewImagePath: page.previewImagePath ?? null,
    pageNumberDetected: page.pageNumberDetected,
    totalPagesDetected: page.totalPagesDetected,
    qualityStatus: page.qualityStatus,
    sharpnessScore: page.sharpnessScore,
    completenessScore: page.completenessScore,
    perspectiveScore: page.perspectiveScore,
    extractedText: page.extractedText
  }));
}

function lineItemCreateData(projection: NormalizedInvoiceProjection) {
  return projection.lineItems.map((item) => ({
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
  }));
}

function extractedFieldCreateData(projection: NormalizedInvoiceProjection) {
  return projection.extractedFields.map((field) => ({
    fieldPath: field.fieldPath,
    label: field.label,
    aiValue: field.aiValue,
    finalValue: field.finalValue,
    valueType: field.valueType,
    confidence: field.confidence,
    sourcePageNumber: field.sourcePageNumber,
    sourceText: field.sourceText,
    needsReview: field.needsReview || field.confidence < financeProConfig.lowConfidenceThreshold || field.finalValue === null,
    status: needsReviewStatus(field.needsReview, field.confidence, field.finalValue),
    boundingBoxJson: field.boundingBoxJson
  }));
}

function validationCreateData(results: ValidationResultInput[]) {
  return results.map((result) => ({
    field: result.field,
    status: result.status,
    severity: result.severity,
    explanation: result.explanation,
    sourcePageNumber: result.sourcePageNumber
  }));
}

function riskCreateData(risks: RiskIndicatorInput[]) {
  return risks.map((risk) => ({
    title: risk.title,
    description: risk.description,
    severity: risk.severity,
    recommendation: risk.recommendation,
    reason: risk.reason
  }));
}

function bookingCreateData(bookingSuggestion: ReturnType<typeof bookingSuggestionService.suggest>) {
  return {
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
    status: "draft"
  };
}

function invoiceModelData(projection: NormalizedInvoiceProjection, providerStatus: AIProviderStatus, aiResult: InvoiceAIExtractionResult) {
  const invoice = projection.invoice;

  return {
    documentType: invoice.documentType,
    supplierName: invoice.supplierName,
    supplierAddress: invoice.supplierAddress,
    supplierUid: invoice.supplierUid,
    supplierIban: invoice.supplierIban,
    supplierBic: invoice.supplierBic ?? null,
    supplierCompanyRegisterNumber: invoice.supplierCompanyRegisterNumber ?? null,
    customerName: invoice.customerName,
    customerAddress: invoice.customerAddress,
    customerUid: invoice.customerUid,
    customerNumber: invoice.customerNumber ?? null,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : null,
    deliveryDate: invoice.deliveryDate ? new Date(invoice.deliveryDate) : null,
    servicePeriod: invoice.servicePeriod,
    orderNumber: invoice.orderNumber ?? null,
    paymentTerms: invoice.paymentTerms ?? null,
    zeroTaxReason: invoice.zeroTaxReason,
    currency: invoice.currency ?? "EUR",
    netAmount: invoice.netAmount,
    taxAmount: invoice.taxAmount,
    taxRate: invoice.taxRate,
    grossAmount: invoice.grossAmount,
    aiProvider: providerStatus.providerName,
    aiModel: providerStatus.modelName,
    aiMode: providerStatus.mode,
    aiStatus: "completed",
    aiErrorCode: null,
    aiErrorMessage: null,
    aiOverallConfidence: aiResult.document.overallConfidence,
    aiRawResultJson: JSON.stringify(aiResult),
    aiNormalizedResultJson: JSON.stringify(projection.invoice),
    aiAnalyzedAt: new Date()
  };
}

async function buildAnalysisContext(currentInvoiceId?: string): Promise<AnalysisContext> {
  const invoices = await prisma.invoice.findMany({
    select: {
      id: true,
      supplierName: true,
      invoiceNumber: true,
      supplierIban: true
    }
  });

  const knownSuppliers = new Map<string, { name: string; knownIban?: string | null }>();
  for (const invoice of invoices) {
    if (!invoice.supplierName || invoice.id === currentInvoiceId) {
      continue;
    }
    if (!knownSuppliers.has(invoice.supplierName.toLowerCase())) {
      knownSuppliers.set(invoice.supplierName.toLowerCase(), {
        name: invoice.supplierName,
        knownIban: invoice.supplierIban
      });
    }
  }

  return {
    duplicateCandidates: invoices
      .filter((invoice) => invoice.id !== currentInvoiceId)
      .map((invoice) => ({
        id: invoice.id,
        supplierName: invoice.supplierName,
        invoiceNumber: invoice.invoiceNumber
      })),
    knownSuppliers: Array.from(knownSuppliers.values())
  };
}

function invoiceInputForValidation(projection: NormalizedInvoiceProjection, pages?: StoredInvoicePage[]): InvoiceValidationInput {
  return {
    ...projection.invoice,
    aiOverallConfidence: projection.extractedFields.length
      ? Math.min(...projection.extractedFields.map((field) => field.confidence))
      : undefined,
    pages: pages ?? projection.invoice.pages,
    lineItems: projection.lineItems
  };
}

export class InvoiceAIPersistenceService {
  async createFromAIResult(params: {
    pages: StoredInvoicePage[];
    aiResult: InvoiceAIExtractionResult;
    providerStatus: AIProviderStatus;
  }) {
    const projection = invoiceNormalizationService.normalizeAIResult(params.aiResult);
    const context = await buildAnalysisContext();
    const invoiceInput = invoiceInputForValidation(projection, params.pages);
    const validationResults = invoiceValidationService.validate(invoiceInput, context);
    const riskIndicators = riskAnalysisService.analyze(invoiceInput, validationResults, context);
    const bookingSuggestion = bookingSuggestionService.suggest(invoiceInput, context);

    return prisma.invoice.create({
      data: {
        ...invoiceModelData(projection, params.providerStatus, params.aiResult),
        status: "review_required",
        reviewStatus: "pending",
        validationStatus: summarizeValidation(validationResults),
        riskLevel: summarizeRisk(riskIndicators),
        exportApproved: false,
        pages: {
          create: pageCreateData(params.pages)
        },
        extractedFields: {
          create: extractedFieldCreateData(projection)
        },
        lineItems: {
          create: lineItemCreateData(projection)
        },
        validationResults: {
          create: validationCreateData(validationResults)
        },
        riskIndicators: {
          create: riskCreateData(riskIndicators)
        },
        bookingSuggestion: {
          create: bookingCreateData(bookingSuggestion)
        },
        auditLogs: {
          create: [
            {
              action: "DOCUMENT_UPLOADED",
              description: `${params.pages.length} Seite(n) gespeichert.`,
              actor: "Upload API"
            },
            {
              action: "AI_ANALYSIS_COMPLETED",
              description: `${params.providerStatus.providerName}/${params.providerStatus.modelName} Analyse abgeschlossen.`,
              actor: params.providerStatus.mode === "mock" ? "MockInvoiceProvider" : "OpenAIInvoiceProvider"
            },
            {
              action: "RULE_CHECK_COMPLETED",
              description: "Deterministische Validierung ausgefuehrt.",
              actor: "InvoiceValidationService"
            },
            {
              action: "BOOKING_SUGGESTION_CREATED",
              description: "Draft-Buchungsvorschlag erzeugt.",
              actor: "BookingSuggestionService"
            }
          ]
        }
      }
    });
  }

  async createFailedAnalysis(params: {
    pages: StoredInvoicePage[];
    providerStatus: AIProviderStatus;
    error: unknown;
  }) {
    const aiError =
      params.error instanceof AIInvoiceExtractionError
        ? params.error
        : new AIInvoiceExtractionError("AI_PROVIDER_ERROR", "Analyse konnte nicht abgeschlossen werden.", params.error);
    const invoiceInput: InvoiceValidationInput = {
      documentType: "unknown",
      supplierName: null,
      supplierAddress: null,
      supplierUid: null,
      supplierIban: null,
      customerName: null,
      customerAddress: null,
      customerUid: null,
      invoiceNumber: null,
      invoiceDate: null,
      deliveryDate: null,
      servicePeriod: null,
      currency: "EUR",
      netAmount: null,
      taxAmount: null,
      taxRate: null,
      grossAmount: null,
      zeroTaxReason: null,
      pages: params.pages,
      lineItems: []
    };
    const validationResults = invoiceValidationService.validate(invoiceInput);
    const riskIndicators = riskAnalysisService.analyze(invoiceInput, validationResults);
    const bookingSuggestion = bookingSuggestionService.suggest(invoiceInput);

    return prisma.invoice.create({
      data: {
        documentType: "unknown",
        status: "review_required",
        reviewStatus: "pending",
        validationStatus: summarizeValidation(validationResults),
        riskLevel: summarizeRisk(riskIndicators),
        exportApproved: false,
        aiProvider: params.providerStatus.providerName,
        aiModel: params.providerStatus.modelName,
        aiMode: params.providerStatus.mode,
        aiStatus: "failed",
        aiErrorCode: aiError.code,
        aiErrorMessage: aiError.message,
        currency: "EUR",
        pages: {
          create: pageCreateData(params.pages)
        },
        validationResults: {
          create: validationCreateData(validationResults)
        },
        riskIndicators: {
          create: riskCreateData(riskIndicators)
        },
        bookingSuggestion: {
          create: bookingCreateData(bookingSuggestion)
        },
        auditLogs: {
          create: [
            {
              action: "DOCUMENT_UPLOADED",
              description: `${params.pages.length} Seite(n) gespeichert.`,
              actor: "Upload API"
            },
            {
              action: "AI_ANALYSIS_FAILED",
              description: `${aiError.code}: ${aiError.message}`,
              actor: params.providerStatus.mode === "mock" ? "MockInvoiceProvider" : "OpenAIInvoiceProvider"
            }
          ]
        }
      }
    });
  }

  async replaceAnalysis(invoiceId: string, aiResult: InvoiceAIExtractionResult, providerStatus: AIProviderStatus, pages: StoredInvoicePage[]) {
    const projection = invoiceNormalizationService.normalizeAIResult(aiResult);
    const context = await buildAnalysisContext(invoiceId);
    const invoiceInput = invoiceInputForValidation(projection, pages);
    const validationResults = invoiceValidationService.validate({ ...invoiceInput, id: invoiceId }, context);
    const riskIndicators = riskAnalysisService.analyze({ ...invoiceInput, id: invoiceId }, validationResults, context);
    const bookingSuggestion = bookingSuggestionService.suggest(invoiceInput, context);

    await prisma.$transaction([
      prisma.invoiceExtractedField.deleteMany({ where: { invoiceId } }),
      prisma.invoiceLineItem.deleteMany({ where: { invoiceId } }),
      prisma.validationResult.deleteMany({ where: { invoiceId } }),
      prisma.riskIndicator.deleteMany({ where: { invoiceId } }),
      prisma.bookingSuggestion.deleteMany({ where: { invoiceId } }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          ...invoiceModelData(projection, providerStatus, aiResult),
          status: "review_required",
          reviewStatus: "pending",
          validationStatus: summarizeValidation(validationResults),
          riskLevel: summarizeRisk(riskIndicators),
          exportApproved: false,
          extractedFields: {
            create: extractedFieldCreateData(projection)
          },
          lineItems: {
            create: lineItemCreateData(projection)
          },
          validationResults: {
            create: validationCreateData(validationResults)
          },
          riskIndicators: {
            create: riskCreateData(riskIndicators)
          },
          bookingSuggestion: {
            create: bookingCreateData(bookingSuggestion)
          },
          auditLogs: {
            create: {
              action: "AI_ANALYSIS_COMPLETED",
              description: "Analyse wurde manuell erneut gestartet und gespeichert.",
              actor: providerStatus.mode === "mock" ? "MockInvoiceProvider" : "OpenAIInvoiceProvider"
            }
          }
        }
      })
    ]);

    return prisma.invoice.findUnique({ where: { id: invoiceId } });
  }
}

export const invoiceAIPersistenceService = new InvoiceAIPersistenceService();

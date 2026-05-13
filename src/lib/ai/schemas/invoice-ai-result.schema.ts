import { z } from "zod";
import { AIInvoiceExtractionError } from "../types";

const ConfidenceSchema = z.number().min(0).max(1);

function parseNumberLike(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value
    .replace(/\u00a0/g, " ")
    .replace(/[€%]/g, "")
    .replace(/\bEUR\b/gi, "")
    .trim();
  if (!/\d/.test(trimmed)) {
    return value;
  }

  const negative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith("-");
  const unsigned = trimmed.replace(/[()]/g, "").replace(/^\+|-/, "").replace(/\s/g, "");
  const normalized = unsigned.includes(",")
    ? unsigned.replace(/\./g, "").replace(",", ".")
    : unsigned.replace(/(?<=\d)\.(?=\d{3}\b)/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : value;
}

const BoundingBoxSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  })
  .nullable();

export function extractedFieldSchema<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    value: valueSchema.nullable(),
    confidence: ConfidenceSchema,
    sourcePage: z.number().int().positive().nullable(),
    sourceText: z.string().nullable(),
    needsReview: z.boolean(),
    boundingBox: BoundingBoxSchema
  });
}

const StringFieldSchema = extractedFieldSchema(z.string());
const NumberLikeSchema = z.preprocess(parseNumberLike, z.number());
const NumberFieldSchema = extractedFieldSchema(NumberLikeSchema);
const StringArrayFieldSchema = extractedFieldSchema(z.array(z.string()));
const NumberArrayFieldSchema = extractedFieldSchema(z.array(NumberLikeSchema));

export const InvoiceAIExtractionResultSchema = z.object({
  document: z.object({
    documentType: z.enum([
      "invoice",
      "rental_invoice",
      "cost_assessment",
      "credit_note",
      "receipt",
      "payment_request",
      "unknown"
    ]),
    language: z.string(),
    country: z.string(),
    pageCount: z.number().int().nonnegative(),
    isMultiPage: z.boolean(),
    detectedPageNumbers: z.array(z.number().int().positive()),
    missingPages: z.array(z.number().int().positive()),
    overallConfidence: ConfidenceSchema
  }),
  supplier: z.object({
    name: StringFieldSchema,
    address: StringFieldSchema,
    uidNumber: StringFieldSchema,
    taxNumber: StringFieldSchema,
    companyRegisterNumber: StringFieldSchema,
    iban: StringFieldSchema,
    bic: StringFieldSchema
  }),
  customer: z.object({
    name: StringFieldSchema,
    address: StringFieldSchema,
    uidNumber: StringFieldSchema
  }),
  invoice: z.object({
    invoiceNumber: StringFieldSchema,
    invoiceDate: StringFieldSchema,
    serviceDate: StringFieldSchema,
    servicePeriodStart: StringFieldSchema,
    servicePeriodEnd: StringFieldSchema,
    currency: StringFieldSchema,
    paymentTerms: StringFieldSchema,
    dueDate: StringFieldSchema,
    orderReference: StringFieldSchema,
    customerNumber: StringFieldSchema
  }),
  amounts: z.object({
    netAmount: NumberFieldSchema,
    taxAmount: NumberFieldSchema,
    grossAmount: NumberFieldSchema,
    taxRates: NumberArrayFieldSchema,
    discountAmount: NumberFieldSchema,
    roundingDifference: NumberFieldSchema
  }),
  lineItems: z.array(
    z.object({
      positionNumber: z.string().nullable(),
      description: z.string(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      unitPrice: z.number().nullable(),
      discountPercent: z.number().nullable(),
      netAmount: z.number().nullable(),
      taxRate: z.number().nullable(),
      taxAmount: z.number().nullable(),
      grossAmount: z.number().nullable(),
      sourcePage: z.number().int().positive().nullable(),
      confidence: ConfidenceSchema
    })
  ),
  specialTaxTreatment: z.object({
    isReverseCharge: z.boolean(),
    isIntraCommunitySupply: z.boolean(),
    isSmallBusiness: z.boolean(),
    isNonTaxableTransaction: z.boolean(),
    isVatExempt: z.boolean(),
    reasonText: z.string().nullable(),
    sourcePage: z.number().int().positive().nullable(),
    confidence: ConfidenceSchema
  }),
  documentQuality: z.object({
    readability: ConfidenceSchema,
    sharpness: ConfidenceSchema,
    completeness: ConfidenceSchema,
    missingPages: z.array(z.number().int().positive()),
    pageCount: z.number().int().nonnegative(),
    warnings: z.array(z.string())
  }),
  aiWarnings: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      severity: z.enum(["info", "warning", "error"]),
      sourcePage: z.number().int().positive().nullable()
    })
  ),
  vendorCandidate: z
    .object({
      name: z.string().nullable(),
      uidNumber: z.string().nullable(),
      iban: z.string().nullable(),
      confidence: ConfidenceSchema
    })
    .optional(),
  duplicateSignals: z.array(z.string()).optional(),
  paymentReference: StringFieldSchema.optional(),
  bookingHints: z.array(z.string()).optional(),
  confidenceSummary: z
    .object({
      fieldsNeedingReview: z.number().int().nonnegative(),
      lowestConfidence: ConfidenceSchema.nullable()
    })
    .optional(),
  missingCriticalFields: z.array(z.string()).optional(),
  suggestedReviewerMessage: z.string().nullable().optional()
});

export function parseInvoiceAIJson(jsonText: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new AIInvoiceExtractionError("AI_INVALID_JSON", "AI response was not valid JSON.", error);
  }

  const result = InvoiceAIExtractionResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new AIInvoiceExtractionError(
      "AI_SCHEMA_VALIDATION_FAILED",
      "AI response did not match the invoice extraction schema.",
      result.error.flatten()
    );
  }

  return result.data;
}

export const InvoiceAIJsonSchemaName = "financepro_invoice_extraction";

export const FieldSchemasForTests = {
  ConfidenceSchema,
  StringFieldSchema,
  NumberFieldSchema,
  StringArrayFieldSchema
};

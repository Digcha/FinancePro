import type { z } from "zod";
import type { InvoiceAIExtractionResultSchema } from "./schemas/invoice-ai-result.schema";

export type InvoiceDocumentType =
  | "invoice"
  | "rental_invoice"
  | "cost_assessment"
  | "credit_note"
  | "receipt"
  | "payment_request"
  | "unknown";

export type AIWarningSeverity = "info" | "warning" | "error";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedField<T> {
  value: T | null;
  confidence: number;
  sourcePage: number | null;
  sourceText: string | null;
  needsReview: boolean;
  boundingBox: BoundingBox | null;
}

export interface InvoiceAIPageInput {
  pageNumber: number;
  mimeType: string;
  fileName: string;
  dataBase64?: string;
  text?: string;
  width?: number | null;
  height?: number | null;
  qualityWarnings?: string[];
}

export interface InvoiceAIFileInput {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  pageStart: number;
  pageCount: number;
}

export interface InvoiceAIInput {
  invoiceId?: string;
  originalFileName: string;
  mimeType: string;
  pageCount: number;
  pages: InvoiceAIPageInput[];
  sourceFiles?: InvoiceAIFileInput[];
  fileBase64?: string;
  fileName?: string;
  locale: "de-AT";
  currencyHint: "EUR";
}

export type InvoiceAIExtractionResult = z.infer<typeof InvoiceAIExtractionResultSchema>;

export type AIErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMIT"
  | "AI_PROVIDER_ERROR"
  | "AI_INVALID_JSON"
  | "AI_SCHEMA_VALIDATION_FAILED"
  | "AI_FILE_TOO_LARGE"
  | "AI_TOO_MANY_PAGES";

export class AIInvoiceExtractionError extends Error {
  readonly code: AIErrorCode;
  readonly causeInfo?: unknown;

  constructor(code: AIErrorCode, message: string, causeInfo?: unknown) {
    super(message);
    this.name = "AIInvoiceExtractionError";
    this.code = code;
    this.causeInfo = causeInfo;
  }
}

export interface AIProviderStatus {
  providerName: string;
  modelName: string;
  configured: boolean;
  mode: "openai" | "mock";
  message: string;
}

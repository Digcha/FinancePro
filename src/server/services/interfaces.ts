import type {
  AnalysisContext,
  BookingSuggestionInput,
  ExportFormat,
  ExportPayload,
  ExportTarget,
  ExportValidation,
  InvoiceLineItemInput,
  InvoicePageInput,
  InvoiceValidationInput,
  RiskIndicatorInput,
  ValidationResultInput
} from "@/server/domain/types";

export interface DocumentQualityService {
  assessPage(page: Partial<InvoicePageInput>): InvoicePageInput;
}

export interface PageGroupingService {
  detectMissingPages(pages: InvoicePageInput[]): number[];
  isLikelySingleInvoice(pages: InvoicePageInput[]): boolean;
}

export interface LayoutAnalysisService {
  extractFooterSignals(pages: InvoicePageInput[]): {
    iban?: string;
    bic?: string;
    uid?: string;
    companyRegisterNumber?: string;
    sourcePageNumber?: number;
  };
}

export interface TableExtractionService {
  mergeLineItemsAcrossPages(items: InvoiceLineItemInput[]): InvoiceLineItemInput[];
}

export interface InvoiceExtractionService {
  inferDocumentType(text: string): InvoiceValidationInput["documentType"];
}

export interface InvoiceValidationService {
  validate(invoice: InvoiceValidationInput, context?: AnalysisContext): ValidationResultInput[];
}

export interface RiskAnalysisService {
  analyze(
    invoice: InvoiceValidationInput,
    validationResults: ValidationResultInput[],
    context?: AnalysisContext
  ): RiskIndicatorInput[];
}

export interface BookingSuggestionService {
  suggest(invoice: InvoiceValidationInput, context?: AnalysisContext): BookingSuggestionInput;
}

export interface ExportService {
  validateExport(invoice: import("@/server/domain/types").ExportableInvoice): ExportValidation;
  generate(
    invoice: import("@/server/domain/types").ExportableInvoice,
    target: ExportTarget,
    format: ExportFormat
  ): ExportPayload;
}

export interface AuditLogService {
  describeSystemAction(action: string, invoice: InvoiceValidationInput): string;
}

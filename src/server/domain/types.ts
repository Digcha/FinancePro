export type DocumentType =
  | "invoice"
  | "rental_invoice"
  | "cost_assessment"
  | "credit_note"
  | "receipt"
  | "unknown";

export type ValidationFieldStatus =
  | "pass"
  | "warning"
  | "error"
  | "unclear"
  | "not_applicable"
  | "present"
  | "missing"
  | "not_required";
export type ValidationSeverity = "info" | "warning" | "error";
export type RiskSeverity = "low" | "medium" | "high";
export type BookingStatus = "draft" | "reviewed" | "approved";
export type ExportTarget = "BMD" | "RZL" | "DOMIZIL_PLUS" | "BUSINESS_CENTRAL";
export type ExportFormat = "csv" | "json";
export type QualityStatus = "accepted" | "warning" | "rejected";

export interface InvoicePageInput {
  pageNumberDetected?: number | null;
  totalPagesDetected?: number | null;
  qualityStatus: QualityStatus | string;
  sharpnessScore: number;
  completenessScore: number;
  perspectiveScore: number;
  extractedText: string;
}

export interface InvoiceLineItemInput {
  sourcePageNumber?: number | null;
  positionNumber?: string | null;
  quantity?: number | null;
  unit?: string | null;
  description: string;
  unitPrice?: number | null;
  duration?: string | null;
  discountPercent?: number | null;
  netAmount?: number | null;
  taxRate?: number | null;
  grossAmount?: number | null;
  confidence: number;
}

export interface InvoiceValidationInput {
  id?: string;
  documentType: DocumentType | string;
  supplierName?: string | null;
  supplierAddress?: string | null;
  supplierUid?: string | null;
  supplierIban?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerUid?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: Date | string | null;
  deliveryDate?: Date | string | null;
  servicePeriod?: string | null;
  currency?: string | null;
  netAmount?: number | null;
  taxAmount?: number | null;
  taxRate?: number | null;
  grossAmount?: number | null;
  zeroTaxReason?: string | null;
  aiOverallConfidence?: number | null;
  pages?: InvoicePageInput[];
  lineItems?: InvoiceLineItemInput[];
}

export interface ValidationResultInput {
  field: string;
  status: ValidationFieldStatus | string;
  severity: ValidationSeverity | string;
  explanation: string;
  sourcePageNumber?: number | null;
}

export interface RiskIndicatorInput {
  title: string;
  description: string;
  severity: RiskSeverity;
  recommendation: string;
  reason: string;
}

export interface DuplicateCandidate {
  id: string;
  supplierName?: string | null;
  invoiceNumber?: string | null;
}

export interface SupplierReference {
  name: string;
  knownIban?: string | null;
  defaultExpenseAccount?: string | null;
  supplierAccount?: string | null;
  costCenter?: string | null;
}

export interface AnalysisContext {
  duplicateCandidates?: DuplicateCandidate[];
  knownSuppliers?: SupplierReference[];
  today?: Date;
}

export interface BookingSuggestionInput {
  bookingDate?: Date | string | null;
  documentNumber?: string | null;
  supplier?: string | null;
  bookingText: string;
  netAmount?: number | null;
  taxAmount?: number | null;
  grossAmount?: number | null;
  taxAccount?: string | null;
  expenseAccount?: string | null;
  supplierAccount?: string | null;
  costCenter?: string | null;
  status: BookingStatus | string;
}

export interface ExportableInvoice extends InvoiceValidationInput {
  status?: string | null;
  validationStatus?: string | null;
  riskLevel?: string | null;
  exportApproved?: boolean | null;
  orderNumber?: string | null;
  bookingSuggestion?: BookingSuggestionInput | null;
  validationResults?: ValidationResultInput[];
  extractedFields?: Array<{
    fieldPath: string;
    finalValue?: string | null;
    needsReview: boolean;
    status?: string | null;
  }>;
}

export interface ExportValidation {
  canExport: boolean;
  warnings: string[];
  errors: string[];
}

export interface ExportPayload {
  fileName: string;
  contentType: string;
  body: string;
  validation: ExportValidation;
}

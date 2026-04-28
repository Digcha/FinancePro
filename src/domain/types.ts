export type InvoiceStatus = "new" | "review" | "approved" | "blocked";
export type SignalState = "ok" | "warn" | "risk";
export type ExportAdapter = "Universal CSV" | "RZL" | "BMD" | "domizil+" | "Business Central";
export type UidConfirmationLevel = "none" | "stage1" | "stage2";
export type InsolvencyStatus = "clear" | "hit" | "unknown";
export type PaymentMethod = "open" | "bank" | "cash";
export type UserRole = "admin" | "bookkeeper" | "reviewer" | "readonly";

export type ComplianceCheck = {
  id: string;
  label: string;
  state: SignalState;
  detail: string;
  blocking: boolean;
};

export type RiskSignal = {
  id: string;
  title: string;
  state: SignalState;
  detail: string;
  blocking: boolean;
};

export type AuditEntry = {
  time: string;
  label: string;
};

export type LineItem = {
  description: string;
  amount: number;
  taxRate: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
};

export type BookingSuggestion = {
  category: string;
  account: string;
  debitAccount: string;
  creditAccount: string;
  taxCode: string;
  costCenter: string;
  bookingText: string;
};

export type UidVerification = {
  checkedAt: string;
  source: "vies" | "finanz-at-manual";
  uid: string;
  isValid: boolean;
  name: string;
  address: string;
  requestIdentifier: string;
  userError?: string;
};

export type ScanCheck = {
  id: string;
  label: string;
  state: SignalState;
  detail: string;
};

export type ScanReport = {
  status: SignalState;
  score: number;
  checks: ScanCheck[];
  hints: string[];
};

export type NeutralBookingRecord = {
  tenant: string;
  documentNumber: string;
  invoiceDate: string;
  serviceDate: string;
  supplier: string;
  supplierUid: string;
  net: number;
  vat: number;
  gross: number;
  currency: string;
  category: string;
  debitAccount: string;
  creditAccount: string;
  taxCode: string;
  bookingText: string;
  status: string;
  costCenter: string;
  objectNumber: string;
};

export type BaseInvoice = {
  id: string;
  supplier: string;
  supplierAddress: string;
  supplierUid: string;
  recipient: string;
  recipientAddress: string;
  recipientUid: string;
  invoiceNumber: string;
  issueDate: string;
  serviceDate: string;
  dueDate: string;
  net: number;
  vatRate: number;
  vat: number;
  gross: number;
  currency: string;
  iban: string;
  bic: string;
  source: string;
  documentType: string;
  qualityScore: number;
  extractionConfidence: number;
  extractedText: string;
  scanReport: ScanReport;
  uidVerification?: UidVerification;
  category: string;
  account: string;
  debitAccount: string;
  creditAccount: string;
  taxCode: string;
  costCenter: string;
  objectNumber: string;
  bookingText: string;
  paymentMethod: PaymentMethod;
  reverseChargeNote: string;
  lineItems: LineItem[];
  audit: AuditEntry[];
};

export type Invoice = BaseInvoice & {
  status: InvoiceStatus;
  checks: ComplianceCheck[];
  risks: RiskSignal[];
};

export type InvoiceInput = Partial<BaseInvoice> & {
  id?: string;
  status?: InvoiceStatus;
};

export type SupplierProfile = {
  name: string;
  uid: string;
  uidConfirmation: UidConfirmationLevel;
  knownIbans: string[];
  defaultAccount: string;
  defaultCostCenter: string;
  historicalInvoiceCount: number;
  insolvencyStatus: InsolvencyStatus;
  recentInvoices: Array<{
    invoiceNumber: string;
    gross: number;
    issueDate: string;
  }>;
};

export type RiskContext = {
  existingInvoices: Invoice[];
  supplierProfiles: SupplierProfile[];
};

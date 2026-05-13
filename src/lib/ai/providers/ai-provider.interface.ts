import type { InvoiceAIExtractionResult, InvoiceAIInput } from "../types";

export interface AIInvoiceExtractionProvider {
  extractInvoice(input: InvoiceAIInput): Promise<InvoiceAIExtractionResult>;
  isConfigured(): boolean;
  getProviderName(): string;
  getModelName(): string;
}

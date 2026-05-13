import type { AnalysisContext, InvoiceValidationInput, ValidationResultInput } from "@/server/domain/types";
import { deterministicInvoiceValidationService } from "@/lib/invoice/validation/invoice-validation-service";

export class AustrianInvoiceValidationService {
  validate(invoice: InvoiceValidationInput, context: AnalysisContext = {}): ValidationResultInput[] {
    return deterministicInvoiceValidationService.validate(invoice, context);
  }
}

export const invoiceValidationService = new AustrianInvoiceValidationService();

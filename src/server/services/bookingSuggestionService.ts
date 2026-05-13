import type {
  AnalysisContext,
  BookingSuggestionInput,
  InvoiceValidationInput
} from "@/server/domain/types";

const KEYWORD_ACCOUNTS: Array<{ keyword: string; account: string; label: string }> = [
  { keyword: "internet", account: "7380", label: "Telekommunikationsaufwand" },
  { keyword: "telefon", account: "7380", label: "Telekommunikationsaufwand" },
  { keyword: "software", account: "7205", label: "Softwareaufwand" },
  { keyword: "miete", account: "7400", label: "Miet- und Leasingaufwand" },
  { keyword: "eventtechnik", account: "7400", label: "Miet- und Leasingaufwand" },
  { keyword: "strom", account: "7700", label: "Energieaufwand" },
  { keyword: "gebühr", account: "7100", label: "Gebühren und Abgaben" },
  { keyword: "büro", account: "7600", label: "Büroaufwand" }
];

export class DefaultBookingSuggestionService {
  suggest(invoice: InvoiceValidationInput, context: AnalysisContext = {}): BookingSuggestionInput {
    const knownSupplier = context.knownSuppliers?.find(
      (supplier) => supplier.name.toLowerCase() === invoice.supplierName?.toLowerCase()
    );
    const text = `${invoice.supplierName ?? ""} ${(invoice.lineItems ?? [])
      .map((item) => item.description)
      .join(" ")}`.toLowerCase();
    const keyword = KEYWORD_ACCOUNTS.find((entry) => text.includes(entry.keyword));

    const expenseAccount = knownSupplier?.defaultExpenseAccount ?? keyword?.account ?? "7700";
    const taxAccount = (invoice.taxAmount ?? 0) > 0 ? "2500" : "steuerfrei/nicht steuerbar";
    const bookingText =
      invoice.documentType === "cost_assessment"
        ? `Kostenvorschreibung ${invoice.invoiceNumber ?? "ohne Nummer"}`
        : `${keyword?.label ?? "Eingangsrechnung"} ${invoice.supplierName ?? "unbekannter Lieferant"}`;

    return {
      bookingDate: invoice.invoiceDate ?? new Date(),
      documentNumber: invoice.invoiceNumber ?? null,
      supplier: invoice.supplierName ?? null,
      bookingText,
      netAmount: invoice.netAmount ?? null,
      taxAmount: invoice.taxAmount ?? null,
      grossAmount: invoice.grossAmount ?? null,
      taxAccount,
      expenseAccount,
      supplierAccount: knownSupplier?.supplierAccount ?? "33000",
      costCenter: knownSupplier?.costCenter ?? null,
      status: "draft"
    };
  }
}

export const bookingSuggestionService = new DefaultBookingSuggestionService();

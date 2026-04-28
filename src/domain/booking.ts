import { BaseInvoice, BookingSuggestion, SupplierProfile } from "./types";
import { getLearnedSupplierDefaults } from "./learningRules";

export function suggestBooking(invoice: Partial<BaseInvoice>, profile?: SupplierProfile): BookingSuggestion {
  const learned = getLearnedSupplierDefaults({
    supplier: invoice.supplier ?? "",
    supplierUid: invoice.supplierUid ?? "",
  });

  if (profile) {
    return {
      category: learned?.category || invoice.category || categoryFor(invoice),
      account: learned?.account || invoice.account || profile.defaultAccount,
      debitAccount: learned?.debitAccount || invoice.debitAccount || profile.defaultAccount,
      creditAccount: learned?.creditAccount || invoice.creditAccount || creditAccountFor(invoice.paymentMethod),
      taxCode: learned?.taxCode || invoice.taxCode || taxCodeFor(invoice.vatRate ?? 20, invoice.reverseChargeNote),
      costCenter: learned?.costCenter || invoice.costCenter || profile.defaultCostCenter,
      bookingText: learned?.bookingText || invoice.bookingText || bookingTextFor(invoice),
    };
  }

  const supplier = invoice.supplier?.toLowerCase() ?? "";
  const lineText = invoice.lineItems?.map((item) => item.description).join(" ").toLowerCase() ?? "";
  const text = `${supplier} ${lineText}`;

  if (text.includes("office") || text.includes("papier") || text.includes("toner")) {
    return buildSuggestion(invoice, learned, "Büromaterial", "7600 Büromaterial", "AT-ADMIN");
  }

  if (text.includes("it") || text.includes("cloud") || text.includes("security")) {
    return buildSuggestion(invoice, learned, "IT/Software", "7400 EDV-Aufwand", "AT-OPS");
  }

  if (text.includes("restaurant") || text.includes("bewirtung")) {
    return buildSuggestion(invoice, learned, "Bewirtung", "7650 Bewirtung/Repräsentation", "AT-REVIEW");
  }

  if (text.includes("treibstoff") || text.includes("kfz") || text.includes("tank")) {
    return buildSuggestion(invoice, learned, "Kfz-Aufwand", "7320 Kfz-Aufwand", "AT-REVIEW");
  }

  return buildSuggestion(invoice, learned, "Fremdleistung", "7200 Fremdleistungen", "AT-REVIEW");
}

function taxCodeFor(vatRate: number, reverseChargeNote = "") {
  if (reverseChargeNote.trim()) return "RC";
  return `V${vatRate}`;
}

function buildSuggestion(
  invoice: Partial<BaseInvoice>,
  learned: Partial<BookingSuggestion> | undefined,
  category: string,
  account: string,
  costCenter: string,
): BookingSuggestion {
  return {
    category: learned?.category || invoice.category || category,
    account: learned?.account || invoice.account || account,
    debitAccount: learned?.debitAccount || invoice.debitAccount || account,
    creditAccount: learned?.creditAccount || invoice.creditAccount || creditAccountFor(invoice.paymentMethod),
    taxCode: learned?.taxCode || invoice.taxCode || taxCodeFor(invoice.vatRate ?? 20, invoice.reverseChargeNote),
    costCenter: learned?.costCenter || invoice.costCenter || costCenter,
    bookingText: learned?.bookingText || invoice.bookingText || bookingTextFor(invoice),
  };
}

function categoryFor(invoice: Partial<BaseInvoice>) {
  return invoice.category || "Fremdleistung";
}

function creditAccountFor(paymentMethod: Partial<BaseInvoice>["paymentMethod"]) {
  if (paymentMethod === "bank") return "2800 Bank";
  if (paymentMethod === "cash") return "2700 Kassa";
  return "3300 Lieferantenkonto";
}

function bookingTextFor(invoice: Partial<BaseInvoice>) {
  return invoice.bookingText || `${invoice.supplier || "Lieferant"} ${invoice.invoiceNumber || ""}`.trim();
}

import { BaseInvoice, ComplianceCheck } from "./types";
import { hasValue, isAustrianUid, moneyFormatter, roundMoney } from "./utils";

const REQUIRED_FIELDS: Array<{ key: keyof BaseInvoice; label: string }> = [
  { key: "supplier", label: "Name Lieferant" },
  { key: "supplierAddress", label: "Anschrift Lieferant" },
  { key: "supplierUid", label: "UID Lieferant" },
  { key: "recipient", label: "Name Empfänger" },
  { key: "recipientAddress", label: "Anschrift Empfänger" },
  { key: "invoiceNumber", label: "Rechnungsnummer" },
  { key: "issueDate", label: "Ausstellungsdatum" },
  { key: "serviceDate", label: "Leistungsdatum" },
  { key: "net", label: "Entgelt" },
  { key: "vatRate", label: "Steuersatz" },
  { key: "vat", label: "Steuerbetrag" },
  { key: "gross", label: "Bruttobetrag" },
  { key: "lineItems", label: "Art/Umfang der Leistung" },
];

export function runComplianceChecks(invoice: BaseInvoice): ComplianceCheck[] {
  return [
    checkRequiredFields(invoice),
    checkUidFormat(invoice),
    checkTaxMath(invoice),
    checkRecipientUidThreshold(invoice),
    checkReverseCharge(invoice),
    checkArchiveFormat(invoice),
  ];
}

function checkRequiredFields(invoice: BaseInvoice): ComplianceCheck {
  const missing = REQUIRED_FIELDS.filter((field) => !hasValue(invoice[field.key])).map((field) => field.label);
  const state = missing.length === 0 ? "ok" : missing.length <= 2 ? "warn" : "risk";

  return {
    id: "required-fields",
    label: "Pflichtfelder",
    state,
    blocking: state === "risk",
    detail:
      missing.length === 0
        ? "Name, Anschrift, UID, Datum, Nummer, Entgelt, Steuerbetrag und Leistungsbeschreibung vorhanden."
        : `Fehlt oder unklar: ${missing.join(", ")}.`,
  };
}

function checkUidFormat(invoice: BaseInvoice): ComplianceCheck {
  if (!invoice.supplierUid.trim()) {
    return {
      id: "supplier-uid-format",
      label: "UID-Format",
      state: "risk",
      blocking: true,
      detail: "Keine UID des leistenden Unternehmers vorhanden.",
    };
  }

  if (!isAustrianUid(invoice.supplierUid)) {
    return {
      id: "supplier-uid-format",
      label: "UID-Format",
      state: "warn",
      blocking: false,
      detail: "UID ist nicht im österreichischen ATU-Format. Für EU-Fälle amtlich bestätigen.",
    };
  }

  return {
    id: "supplier-uid-format",
    label: "UID-Format",
    state: "ok",
    blocking: false,
    detail: "UID des leistenden Unternehmers ist formal im ATU-Format.",
  };
}

function checkTaxMath(invoice: BaseInvoice): ComplianceCheck {
  const expectedVat = roundMoney((invoice.net * invoice.vatRate) / 100);
  const expectedGross = roundMoney(invoice.net + expectedVat);
  const isConsistent = Math.abs(invoice.vat - expectedVat) < 0.02 && Math.abs(invoice.gross - expectedGross) < 0.02;

  return {
    id: "tax-math",
    label: "Rechenlogik",
    state: isConsistent ? "ok" : "risk",
    blocking: !isConsistent,
    detail: isConsistent
      ? "Netto, Steuerbetrag und Brutto sind rechnerisch konsistent."
      : `Erwartet: USt. ${moneyFormatter.format(expectedVat)}, Brutto ${moneyFormatter.format(expectedGross)}.`,
  };
}

function checkRecipientUidThreshold(invoice: BaseInvoice): ComplianceCheck {
  const requiresRecipientUid = invoice.gross > 10000 && invoice.vatRate > 0;
  const hasRecipientUid = invoice.recipientUid.trim().length > 0;

  return {
    id: "recipient-uid-threshold",
    label: "Empfänger-UID",
    state: requiresRecipientUid && !hasRecipientUid ? "risk" : "ok",
    blocking: requiresRecipientUid && !hasRecipientUid,
    detail:
      requiresRecipientUid && !hasRecipientUid
        ? "Brutto über EUR 10.000. Empfänger-UID muss geprüft werden."
        : "Keine Sperre aus der Empfänger-UID-Regel.",
  };
}

function checkReverseCharge(invoice: BaseInvoice): ComplianceCheck {
  const reverseChargeLikely =
    invoice.taxCode.toUpperCase().includes("RC") ||
    (invoice.vatRate === 0 && invoice.vat === 0 && invoice.supplierUid.trim() !== "" && !isAustrianUid(invoice.supplierUid));

  if (!reverseChargeLikely) {
    return {
      id: "reverse-charge",
      label: "Reverse Charge",
      state: "ok",
      blocking: false,
      detail: "Kein Reverse-Charge-Hinweis erforderlich.",
    };
  }

  const hasRequiredNote = invoice.reverseChargeNote.trim().length > 0;
  const hasRecipientUid = invoice.recipientUid.trim().length > 0;
  const state = hasRequiredNote && hasRecipientUid ? "ok" : "risk";

  return {
    id: "reverse-charge",
    label: "Reverse Charge",
    state,
    blocking: state === "risk",
    detail:
      state === "ok"
        ? "Hinweis auf Steuerschuld des Leistungsempfängers und Empfänger-UID vorhanden."
        : "Reverse-Charge-Fall vermutet. Hinweis und Empfänger-UID müssen geprüft werden.",
  };
}

function checkArchiveFormat(invoice: BaseInvoice): ComplianceCheck {
  const structured = ["XML", "EBINTERFACE", "UBL", "ZUGFERD", "XRECHNUNG"].includes(invoice.documentType.toUpperCase());

  return {
    id: "archive-format",
    label: "Archivformat",
    state: structured ? "ok" : "warn",
    blocking: false,
    detail: structured
      ? "Strukturierte Rechnungsdaten normalisiert und mit dem Original verknüpft."
      : "Originaldokument archiviert. Strukturierte Felder bleiben reviewpflichtig.",
  };
}

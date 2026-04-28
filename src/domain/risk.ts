import { BaseInvoice, RiskContext, RiskSignal, SupplierProfile } from "./types";
import { daysBetween, normalizeIban, normalizeUid } from "./utils";

export function evaluateRiskSignals(invoice: BaseInvoice, context: RiskContext): RiskSignal[] {
  const profile = findSupplierProfile(invoice, context.supplierProfiles);
  return [
    checkUidConfirmation(invoice, profile),
    checkIbanDeviation(invoice, profile),
    checkDuplicate(invoice, context),
    checkAmountAnomaly(invoice, profile),
    checkInsolvency(profile),
    checkSupplierHistory(profile),
  ];
}

export function findSupplierProfile(invoice: Pick<BaseInvoice, "supplier" | "supplierUid">, profiles: SupplierProfile[]) {
  const uid = normalizeUid(invoice.supplierUid);
  const supplier = invoice.supplier.trim().toLowerCase();
  return profiles.find((profile) => normalizeUid(profile.uid) === uid || profile.name.toLowerCase() === supplier);
}

function checkUidConfirmation(invoice: BaseInvoice, profile?: SupplierProfile): RiskSignal {
  if (!invoice.supplierUid.trim()) {
    return {
      id: "uid-confirmation",
      title: "UID-Bestätigung",
      state: "risk",
      blocking: true,
      detail: "Keine UID für amtliche Bestätigung vorhanden.",
    };
  }

  if (profile?.uidConfirmation === "stage2") {
    return {
      id: "uid-confirmation",
      title: "UID-Bestätigung",
      state: "ok",
      blocking: false,
      detail: "Stufe 2 mit Name und Anschrift ist als Nachweis hinterlegt.",
    };
  }

  if (profile?.uidConfirmation === "stage1") {
    return {
      id: "uid-confirmation",
      title: "UID-Bestätigung",
      state: "warn",
      blocking: false,
      detail: "Stufe 1 bestätigt, Stufe 2 noch nicht archiviert.",
    };
  }

  return {
    id: "uid-confirmation",
    title: "UID-Bestätigung",
    state: "warn",
    blocking: false,
    detail: "UID erkannt, aber kein Bestätigungsnachweis im Audit-Paket.",
  };
}

function checkIbanDeviation(invoice: BaseInvoice, profile?: SupplierProfile): RiskSignal {
  if (!invoice.iban.trim()) {
    return {
      id: "iban-deviation",
      title: "IBAN-Abweichung",
      state: "warn",
      blocking: false,
      detail: "Keine IBAN erkannt. Zahlungssperre nach Mandantenregel empfohlen.",
    };
  }

  if (!profile || profile.knownIbans.length === 0) {
    return {
      id: "iban-deviation",
      title: "IBAN-Abweichung",
      state: "warn",
      blocking: false,
      detail: "Keine bekannte Lieferanten-IBAN im Mandantenarchiv.",
    };
  }

  const known = profile.knownIbans.map(normalizeIban);
  const current = normalizeIban(invoice.iban);
  const matches = known.includes(current);

  return {
    id: "iban-deviation",
    title: "IBAN-Abweichung",
    state: matches ? "ok" : "risk",
    blocking: !matches,
    detail: matches
      ? `${profile.historicalInvoiceCount} frühere Belege mit gleicher IBAN oder Lieferantenhistorie.`
      : `Neue Zahlungs-IBAN gegenüber ${profile.historicalInvoiceCount} historischen Belegen.`,
  };
}

function checkDuplicate(invoice: BaseInvoice, context: RiskContext): RiskSignal {
  const sameSupplier = context.existingInvoices.filter(
    (candidate) => candidate.id !== invoice.id && normalizeUid(candidate.supplierUid) === normalizeUid(invoice.supplierUid),
  );
  const exact = sameSupplier.find((candidate) => candidate.invoiceNumber === invoice.invoiceNumber);
  if (exact) {
    return {
      id: "duplicate",
      title: "Dublettenprüfung",
      state: "risk",
      blocking: true,
      detail: `Gleiche Rechnungsnummer bereits bei ${exact.supplier} vorhanden.`,
    };
  }

  const similar = sameSupplier.find(
    (candidate) => Math.abs(candidate.gross - invoice.gross) < 1 && daysBetween(candidate.issueDate, invoice.issueDate) <= 21,
  );
  if (similar) {
    return {
      id: "duplicate",
      title: "Dublettenprüfung",
      state: "warn",
      blocking: false,
      detail: `Ähnlicher Betrag und Lieferant wie Beleg ${similar.invoiceNumber}.`,
    };
  }

  return {
    id: "duplicate",
    title: "Dublettenprüfung",
    state: "ok",
    blocking: false,
    detail: "Keine Übereinstimmung im Mandantenarchiv.",
  };
}

function checkInsolvency(profile?: SupplierProfile): RiskSignal {
  if (!profile || profile.insolvencyStatus === "unknown") {
    return {
      id: "insolvency",
      title: "Insolvenzdatei",
      state: "warn",
      blocking: false,
      detail: "Kein aktueller Profiltreffer im lokalen Demo-Datenbestand.",
    };
  }

  return {
    id: "insolvency",
    title: "Insolvenzdatei",
    state: profile.insolvencyStatus === "hit" ? "risk" : "ok",
    blocking: profile.insolvencyStatus === "hit",
    detail: profile.insolvencyStatus === "hit" ? "Treffer im letzten Abgleich." : "Kein Treffer im letzten Abgleich.",
  };
}

function checkAmountAnomaly(invoice: BaseInvoice, profile?: SupplierProfile): RiskSignal {
  if (!profile || profile.recentInvoices.length === 0 || invoice.gross <= 0) {
    return {
      id: "amount-anomaly",
      title: "Betragshistorie",
      state: "warn",
      blocking: false,
      detail: "Keine belastbare Betragsbasis für diesen Lieferanten.",
    };
  }

  const amounts = profile.recentInvoices.map((entry) => entry.gross).filter((amount) => amount > 0);
  const average = amounts.reduce((sum, amount) => sum + amount, 0) / Math.max(1, amounts.length);
  const ratio = average > 0 ? invoice.gross / average : 1;

  if (ratio >= 2.5) {
    return {
      id: "amount-anomaly",
      title: "Betragshistorie",
      state: "risk",
      blocking: false,
      detail: `Rechnung liegt deutlich über der Lieferantenhistorie (${ratio.toFixed(1)}x Durchschnitt).`,
    };
  }

  if (ratio >= 1.6) {
    return {
      id: "amount-anomaly",
      title: "Betragshistorie",
      state: "warn",
      blocking: false,
      detail: `Betrag ist erhöht gegenüber der letzten Lieferantenhistorie (${ratio.toFixed(1)}x Durchschnitt).`,
    };
  }

  return {
    id: "amount-anomaly",
    title: "Betragshistorie",
    state: "ok",
    blocking: false,
    detail: "Betrag passt zur bekannten Lieferantenhistorie.",
  };
}

function checkSupplierHistory(profile?: SupplierProfile): RiskSignal {
  if (!profile) {
    return {
      id: "supplier-history",
      title: "Lieferantenhistorie",
      state: "warn",
      blocking: false,
      detail: "Neuer Lieferant im Mandantenarchiv.",
    };
  }

  return {
    id: "supplier-history",
    title: "Lieferantenhistorie",
    state: profile.historicalInvoiceCount >= 3 ? "ok" : "warn",
    blocking: false,
    detail:
      profile.historicalInvoiceCount >= 3
        ? `${profile.historicalInvoiceCount} frühere Belege mit verwertbarer Historie.`
        : "Wenig Historie. Review bleibt empfohlen.",
  };
}

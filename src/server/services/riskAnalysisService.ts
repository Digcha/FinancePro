import type {
  AnalysisContext,
  InvoiceValidationInput,
  RiskIndicatorInput,
  ValidationResultInput
} from "@/server/domain/types";
import { financeProConfig } from "@/lib/config";
import { pageGroupingService } from "./pageGroupingService";

function hasUnresolvedValidationError(results: ValidationResultInput[]): boolean {
  return results.some((result) => result.severity === "error");
}

export class DefaultRiskAnalysisService {
  analyze(
    invoice: InvoiceValidationInput,
    validationResults: ValidationResultInput[],
    context: AnalysisContext = {}
  ): RiskIndicatorInput[] {
    const risks: RiskIndicatorInput[] = [];

    const lowestLineItemConfidence = Math.min(
      ...((invoice.lineItems ?? []).map((item) => item.confidence).filter((value) => Number.isFinite(value)) as number[]),
      invoice.aiOverallConfidence ?? 1
    );
    if (lowestLineItemConfidence < financeProConfig.lowConfidenceThreshold) {
      risks.push({
        title: "Niedrige KI-Confidence",
        description: "Mindestens ein Feld oder eine Position liegt unter dem Confidence-Schwellwert.",
        severity: "medium",
        recommendation: "Markierte Felder im Originalbeleg kontrollieren und bestaetigen.",
        reason: `LowestConfidence=${lowestLineItemConfidence.toFixed(2)}, threshold=${financeProConfig.lowConfidenceThreshold}.`
      });
    }

    const duplicate = context.duplicateCandidates?.find(
      (candidate) =>
        candidate.id !== invoice.id &&
        candidate.invoiceNumber &&
        invoice.invoiceNumber &&
        candidate.invoiceNumber === invoice.invoiceNumber &&
        candidate.supplierName?.toLowerCase() === invoice.supplierName?.toLowerCase()
    );
    if (duplicate) {
      risks.push({
        title: "Mögliche doppelte Rechnung",
        description: "Beim selben Lieferanten existiert bereits eine Rechnung mit dieser Rechnungsnummer.",
        severity: "high",
        recommendation: "Vor Freigabe mit dem bestehenden Beleg vergleichen.",
        reason: `Doppelter Schlüssel supplierName + invoiceNumber, Referenzbeleg ${duplicate.id}.`
      });
    }

    if (hasUnresolvedValidationError(validationResults)) {
      risks.push({
        title: "Fehlende oder widersprüchliche Pflichtangaben",
        description: "Mindestens eine formale Prüfung nach § 11 UStG hat einen Fehlerstatus.",
        severity: "high",
        recommendation: "Fehlende Felder prüfen oder manuell ergänzen, bevor exportiert wird.",
        reason: validationResults
          .filter((result) => result.severity === "error")
          .map((result) => result.field)
          .join(", ")
      });
    }

    if (validationResults.some((result) => result.field === "grossAmount" && result.severity === "error")) {
      risks.push({
        title: "Mathematische Abweichung",
        description: "Netto, Umsatzsteuer und Brutto passen anhand der erkannten Daten nicht zusammen.",
        severity: "high",
        recommendation: "Summenbox und Positionssumme im Originalbeleg kontrollieren.",
        reason: "ValidationResult grossAmount=error."
      });
    }

    const knownSupplier = context.knownSuppliers?.find(
      (supplier) => supplier.name.toLowerCase() === invoice.supplierName?.toLowerCase()
    );
    if (!knownSupplier) {
      risks.push({
        title: "Unbekannter Lieferant",
        description: "Für diesen Lieferanten liegt im Demo-Mandanten noch keine verifizierte Historie vor.",
        severity: "medium",
        recommendation: "Stammdaten und Bankverbindung vor erster Freigabe kontrollieren.",
        reason: "Kein Treffer in knownSuppliers."
      });
    } else if (
      knownSupplier.knownIban &&
      invoice.supplierIban &&
      knownSupplier.knownIban.replace(/\s/g, "") !== invoice.supplierIban.replace(/\s/g, "")
    ) {
      risks.push({
        title: "Geänderte IBAN",
        description: "Die erkannte IBAN weicht von der bekannten Lieferanten-IBAN ab.",
        severity: "high",
        recommendation: "IBAN extern verifizieren und Änderung erst danach bestätigen.",
        reason: `Bekannt: ${knownSupplier.knownIban}, erkannt: ${invoice.supplierIban}.`
      });
    }

    const weakPage = invoice.pages?.find(
      (page) => page.qualityStatus !== "accepted" || page.sharpnessScore < 0.65 || page.completenessScore < 0.75
    );
    if (weakPage) {
      risks.push({
        title: "Dokumentqualität eingeschränkt",
        description: "Mindestens eine Seite ist unscharf, unvollständig oder perspektivisch auffällig.",
        severity: weakPage.qualityStatus === "rejected" ? "high" : "medium",
        recommendation: "Originalseite prüfen oder neu hochladen, bevor unsichere Felder übernommen werden.",
        reason: `Seite ${weakPage.pageNumberDetected ?? "unbekannt"}: quality=${weakPage.qualityStatus}, sharpness=${weakPage.sharpnessScore}.`
      });
    }

    const missingPages = pageGroupingService.detectMissingPages(invoice.pages ?? []);
    if (missingPages.length > 0) {
      risks.push({
        title: "Möglicherweise fehlende Seite",
        description: "Die erkannte Seitennummerierung ist nicht vollständig.",
        severity: "medium",
        recommendation: "Upload-Gruppe prüfen und fehlende Seite nachreichen.",
        reason: `Fehlende Seiten: ${missingPages.join(", ")}.`
      });
    }

    if ((invoice.grossAmount ?? 0) >= 10000) {
      risks.push({
        title: "Ungewöhnlich hoher Betrag",
        description: "Der Bruttobetrag liegt über dem internen Demo-Schwellenwert.",
        severity: "medium",
        recommendation: "Freigabeprozess und Empfänger-UID-Anforderung prüfen.",
        reason: `GrossAmount=${invoice.grossAmount}.`
      });
    }

    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : null;
    const today = context.today ?? new Date();
    if (invoiceDate && !Number.isNaN(invoiceDate.getTime()) && invoiceDate.getTime() > today.getTime()) {
      risks.push({
        title: "Zukuenftiges Rechnungsdatum",
        description: "Das erkannte Rechnungsdatum liegt nach dem heutigen Datum.",
        severity: "medium",
        recommendation: "Datum im Originalbeleg pruefen, bevor die Rechnung freigegeben wird.",
        reason: `invoiceDate=${invoiceDate.toISOString().slice(0, 10)}.`
      });
    }

    if (invoice.supplierUid && !/^ATU\d{8}$/.test(invoice.supplierUid)) {
      risks.push({
        title: "UID-Format auffällig",
        description: "Die UID des Lieferanten entspricht nicht dem erwarteten ATU-Format.",
        severity: "medium",
        recommendation: "UID aus dem Beleg manuell mit Lieferantenstammdaten vergleichen.",
        reason: `supplierUid=${invoice.supplierUid}.`
      });
    }

    const zeroTaxWithoutReason = validationResults.some(
      (result) => result.field === "taxAmount" && result.severity === "warning"
    );
    if (zeroTaxWithoutReason) {
      risks.push({
        title: "0,00 USt ohne klare Begründung",
        description: "Die Rechnung weist keine Umsatzsteuer aus, aber der Begründungstext ist unklar oder fehlt.",
        severity: "medium",
        recommendation: "Hinweis auf Steuerbefreiung, Reverse Charge oder nicht steuerbaren Vorgang prüfen.",
        reason: "ValidationResult taxAmount=warning."
      });
    }

    if (invoice.grossAmount === null || invoice.grossAmount === undefined) {
      risks.push({
        title: "Endsumme unklar",
        description: "Keine eindeutige Bruttosumme erkannt.",
        severity: "high",
        recommendation: "Finale Summenbox im Originalbeleg prüfen.",
        reason: "grossAmount missing."
      });
    }

    return risks;
  }
}

export const riskAnalysisService = new DefaultRiskAnalysisService();

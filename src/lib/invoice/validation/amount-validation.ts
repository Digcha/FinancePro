import { financeProConfig } from "@/lib/config";

export type DeterministicCheckStatus = "pass" | "warning" | "error" | "unclear" | "not_applicable";

export interface AmountValidationInput {
  netAmount?: number | null;
  taxAmount?: number | null;
  grossAmount?: number | null;
  taxRate?: number | null;
  zeroTaxReason?: string | null;
  tolerance?: number;
}

export interface AmountValidationResult {
  status: DeterministicCheckStatus;
  severity: "info" | "warning" | "error";
  delta: number | null;
  message: string;
}

export function hasSpecialZeroTaxReason(reason: string | null | undefined) {
  if (!reason) {
    return false;
  }

  const normalized = reason.toLowerCase();
  return [
    "kein steuerbarer vorgang",
    "nicht steuerbar",
    "reverse charge",
    "steuerfrei",
    "steuerbefreit",
    "kleinunternehmer",
    "innergemeinschaftliche lieferung"
  ].some((needle) => normalized.includes(needle));
}

export function validateAmountConsistency(input: AmountValidationInput): AmountValidationResult {
  const tolerance = input.tolerance ?? financeProConfig.amountToleranceEur;
  const { netAmount, taxAmount, grossAmount, taxRate } = input;

  if (netAmount === null || netAmount === undefined || grossAmount === null || grossAmount === undefined) {
    return {
      status: "unclear",
      severity: "error",
      delta: null,
      message: "Netto- oder Bruttobetrag fehlt; Summenpruefung nicht moeglich."
    };
  }

  if (taxAmount === null || taxAmount === undefined) {
    if (hasSpecialZeroTaxReason(input.zeroTaxReason)) {
      return {
        status: "warning",
        severity: "warning",
        delta: null,
        message: "USt-Betrag fehlt, aber ein steuerlicher Sonderhinweis wurde erkannt."
      };
    }

    return {
      status: "unclear",
      severity: "error",
      delta: null,
      message: "USt-Betrag fehlt und es liegt kein erkannter Sonderfall vor."
    };
  }

  const delta = Math.abs(netAmount + taxAmount - grossAmount);
  if (delta > tolerance) {
    return {
      status: "error",
      severity: "error",
      delta,
      message: `Netto + USt weicht um ${delta.toFixed(2)} EUR vom Bruttobetrag ab.`
    };
  }

  if ((taxAmount === 0 || taxRate === 0) && hasSpecialZeroTaxReason(input.zeroTaxReason)) {
    return {
      status: "pass",
      severity: "info",
      delta,
      message: "0,00 USt ist durch einen erkannten Sonderfall plausibel begruendet."
    };
  }

  if ((taxAmount === 0 || taxRate === 0) && !hasSpecialZeroTaxReason(input.zeroTaxReason)) {
    return {
      status: "warning",
      severity: "warning",
      delta,
      message: "0,00 USt wurde erkannt, aber kein klarer Sonderhinweis gefunden."
    };
  }

  if (typeof taxRate === "number") {
    const expectedTax = netAmount * (taxRate / 100);
    const taxDelta = Math.abs(expectedTax - taxAmount);
    if (taxDelta > tolerance) {
      return {
        status: "error",
        severity: "error",
        delta: taxDelta,
        message: `USt-Betrag passt nicht zu Netto x Steuersatz; Abweichung ${taxDelta.toFixed(2)} EUR.`
      };
    }
  }

  return {
    status: "pass",
    severity: "info",
    delta,
    message: "Netto, USt und Brutto sind innerhalb der Rundungstoleranz plausibel."
  };
}

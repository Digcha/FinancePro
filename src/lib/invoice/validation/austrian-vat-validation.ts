import type { DeterministicCheckStatus } from "./amount-validation";

export interface FormatValidationResult {
  status: DeterministicCheckStatus;
  severity: "info" | "warning" | "error";
  message: string;
}

export function validateAustrianUid(uid: string | null | undefined): FormatValidationResult {
  if (!uid) {
    return {
      status: "unclear",
      severity: "warning",
      message: "UID-Nummer fehlt oder wurde nicht erkannt."
    };
  }

  return /^ATU\d{8}$/.test(uid)
    ? {
        status: "pass",
        severity: "info",
        message: "UID-Nummer wirkt formal plausibel."
      }
    : {
        status: "warning",
        severity: "warning",
        message: "UID-Nummer entspricht nicht dem erwarteten ATU-Format."
      };
}

export function validateIban(iban: string | null | undefined): FormatValidationResult {
  if (!iban) {
    return {
      status: "unclear",
      severity: "warning",
      message: "IBAN wurde nicht erkannt. Das ist eine Zahlungswarnung, kein automatischer Formfehler."
    };
  }

  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)
    ? {
        status: "pass",
        severity: "info",
        message: "IBAN wirkt formal plausibel."
      }
    : {
        status: "warning",
        severity: "warning",
        message: "IBAN-Format wirkt unplausibel."
      };
}

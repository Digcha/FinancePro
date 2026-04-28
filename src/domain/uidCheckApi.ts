import { Invoice, RiskSignal, UidVerification } from "./types";
import { nowLabel } from "./utils";

export async function checkUidAutomatically(uid: string): Promise<UidVerification> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/check-vat?uid=${encodeURIComponent(uid)}`);
  if (!response.ok) {
    throw new Error(`UID-Prüfung fehlgeschlagen: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as UidVerification;
}

export function applyUidVerification(invoice: Invoice, verification: UidVerification): Invoice {
  const risk = riskFromVerification(verification);
  return {
    ...invoice,
    uidVerification: verification,
    risks: invoice.risks.map((signal) => (signal.id === "uid-confirmation" ? risk : signal)),
    audit: [
      ...invoice.audit,
      {
        time: nowLabel(),
        label: verification.isValid
          ? `UID ${verification.uid} automatisch über VIES bestätigt`
          : `UID ${verification.uid} automatisch geprüft: ungültig`,
      },
    ],
  };
}

export function financeAtUidUrl(uid: string) {
  return `https://business.finanz.at/tools/uid/?partner=finanz.at#${encodeURIComponent(uid)}`;
}

function riskFromVerification(verification: UidVerification): RiskSignal {
  if (verification.isValid) {
    return {
      id: "uid-confirmation",
      title: "UID-Bestätigung",
      state: "ok",
      blocking: false,
      detail: [
        `VIES gültig am ${new Date(verification.checkedAt).toLocaleString("de-AT")}.`,
        verification.name ? `Name: ${verification.name}.` : "",
        verification.requestIdentifier ? `Nachweis: ${verification.requestIdentifier}.` : "",
      ].filter(Boolean).join(" "),
    };
  }

  return {
    id: "uid-confirmation",
    title: "UID-Bestätigung",
    state: "risk",
    blocking: true,
    detail: `VIES meldet ungültige UID am ${new Date(verification.checkedAt).toLocaleString("de-AT")}${verification.userError ? ` (${verification.userError})` : ""}.`,
  };
}

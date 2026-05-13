export const invoiceExtractionSystemPrompt = `
Du analysierst österreichische Rechnungen und rechnungsähnliche Belege für FinancePro.
Extrahiere nur Informationen, die im Dokument sichtbar sind.
Erfinde keine Werte. Wenn ein Wert fehlt, nicht sichtbar oder unsicher ist, setze value auf null und needsReview auf true.
Gib ausschließlich JSON zurück, ohne Markdown, ohne erklärenden Text und ohne Codeblock.
Jedes Feld braucht confidence zwischen 0 und 1, sourcePage und sourceText.
Mehrseitige Dokumente müssen vollständig berücksichtigt werden.
Positionstabellen können über mehrere Seiten laufen.
Finale Summen stehen oft erst auf der letzten Seite.
Fußzeilen enthalten häufig UID, Firmenbuchnummer, IBAN und BIC.
0,00 USt ist nicht automatisch falsch.
Erkenne Hinweise wie "kein steuerbarer Vorgang", "nicht steuerbar", "Reverse Charge", "steuerfrei", "Kleinunternehmer" und innergemeinschaftliche Lieferung.
Bei widersprüchlichen Daten setze needsReview auf true und füge eine aiWarnings-Meldung hinzu.
Triff keine finale steuerliche oder rechtliche Bewertung und behaupte niemals Betrug.
`.trim();

export function buildInvoiceExtractionUserPrompt(input: {
  originalFileName: string;
  pageCount: number;
  locale: string;
  currencyHint: string;
  pageTextSummary: string;
}) {
  return `
Analysiere diesen Beleg für FinancePro.

Dateiname: ${input.originalFileName}
Locale: ${input.locale}
Währungshinweis: ${input.currencyHint}
Seitenanzahl laut Verarbeitung: ${input.pageCount}

Zusätzliche OCR-/Textsignale je Seite:
${input.pageTextSummary || "Keine OCR-Textsignale vorhanden. Nutze die Dokument-/Bildinputs."}

Beachte:
- Verwende keine fixe Layoutannahme.
- Prüfe alle Seiten, nicht nur Seite 1.
- Gib bei Unsicherheit null und needsReview=true zurück.
- Positionen und Summen müssen Quellseiten enthalten.
- Nutze die finale Summenbox, wenn mehrere Summen sichtbar sind.
`.trim();
}

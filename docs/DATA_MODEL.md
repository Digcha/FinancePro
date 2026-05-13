# Data Model

Das Prisma-Schema liegt in `prisma/schema.prisma` und nutzt SQLite.

## Invoice

Enthält Dokumenttyp, Lieferant, Empfänger, UID/IBAN/BIC, Rechnungsnummer, Datum, Leistungsdaten, Beträge, Status, Review-Status, Validierungsstatus, Risiko, Exportfreigabe und AI-Metadaten.

AI-Felder:

- `aiProvider`
- `aiModel`
- `aiMode` (`openai` oder `mock`)
- `aiStatus`
- `aiErrorCode`
- `aiErrorMessage`
- `aiOverallConfidence`
- `aiRawResultJson`
- `aiNormalizedResultJson`
- `aiAnalyzedAt`

Dokumenttypen:

- `invoice`
- `rental_invoice`
- `cost_assessment`
- `credit_note`
- `receipt`
- `unknown`

## InvoicePage

Speichert jede Seite mit Dateiname, lokalem Pfad, erkannter Seitenzahl, Gesamtseitenzahl, Qualitätswerten und OCR-Rohtext.

## InvoiceLineItem

Speichert Positionen mit Seitenherkunft, Menge, Einheit, Beschreibung, Einzelpreis, Mietdauer, Rabatt, Netto, Steuer, Brutto und Confidence.

## InvoiceExtractedField

Speichert jedes AI-Feld mit:

- `fieldPath`
- `label`
- AI-Wert und finalem Wert
- Werttyp
- Confidence
- Quellseite
- Originaltextausschnitt
- Review-Flag
- Status (`extracted`, `low_confidence`, `missing`, `corrected`, `confirmed`)
- optionaler Bounding Box

## ValidationResult

Speichert Regelresultate je Feld:

- Status: `pass`, `warning`, `error`, `unclear`, `not_applicable`
- Severity: `info`, `warning`, `error`

## RiskIndicator

Speichert erklärbare Auffälligkeiten mit Titel, Beschreibung, Severity, Empfehlung und technischer Begründung.

## BookingSuggestion

Speichert Buchungsdatum, Belegnummer, Lieferant, Buchungstext, Beträge, Steuerkonto, Aufwandskonto, Lieferantenkonto, Kostenstelle und Status.

## AuditLog

Speichert relevante System- und Nutzeraktionen pro Rechnung.

## ExportRecord

Speichert erzeugte Exportdateien, Zielsystem, Format, Status und Validierungszusammenfassung.

Export ist nur möglich, wenn die Rechnung freigegeben ist, keine Validierungsfehler offen sind und keine reviewpflichtigen AI-Felder offen bleiben.

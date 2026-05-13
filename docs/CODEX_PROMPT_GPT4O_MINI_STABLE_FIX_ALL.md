Du bist Senior Full-Stack Developer, AI Integration Engineer und QA Engineer.

Projekt: FinancePro.

Ziel:
Baue die bestehende FinancePro-App so um, dass echte österreichische Rechnungen stabil mit GPT-4o mini verarbeitet werden können. Behebe gleichzeitig bestehende Bugs, falsche Annahmen, fixe Layoutlogik, Mock-only Verhalten und instabile Fehlerbehandlung.

WICHTIG:
Arbeite direkt im bestehenden Projektordner.
Lies zuerst vollständig alle Dateien in /docs, besonders:

- ADR_FinancePro.md
- PRD_FinancePro.md
- SRD_FinancePro.md
- alle CHANGE_REQUEST Dateien
- alle PRD_PATCH Dateien
- alle SRD_PATCH Dateien
- QA_TEST_PLAN_004_REAL_INVOICE_AI.md, falls vorhanden

Falls Dateien fehlen, arbeite trotzdem anhand der vorhandenen Projektstruktur weiter.

HAUPTZIEL:
Die App soll mit echten Rechnungen funktionieren, nicht nur mit Demo-Daten.
Es muss eine stabile AI-Pipeline mit OpenAI GPT-4o mini entstehen.

MODELL:
Verwende OpenAI GPT-4o mini.

Environment:

OPENAI_API_KEY=
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0
AI_MAX_OUTPUT_TOKENS=8000
AI_MAX_PAGES_PER_ANALYSIS=8
AI_ANALYSIS_TIMEOUT_SECONDS=90
AI_USE_MOCK_WHEN_KEY_MISSING=true
MAX_UPLOAD_MB=25
AMOUNT_TOLERANCE_EUR=0.02
LOW_CONFIDENCE_THRESHOLD=0.75

Erstelle/aktualisiere .env.example.
API-Key niemals hardcoden.

SEHR WICHTIG:
Wenn kein OpenAI API-Key vorhanden ist, darf die App NICHT crashen.
Sie muss im Mock-Modus laufen und das sichtbar im UI anzeigen:
„KI nicht konfiguriert — Mock-Modus aktiv“.

ARCHITEKTUR:
Implementiere oder repariere folgende Struktur. Wenn bestehende Struktur anders ist, integriere sauber, aber trenne die Verantwortlichkeiten klar.

src/lib/ai/types.ts
src/lib/ai/invoice-ai-service.ts
src/lib/ai/schemas/invoice-ai-result.schema.ts
src/lib/ai/prompts/invoice-extraction-prompt.ts
src/lib/ai/providers/ai-provider.interface.ts
src/lib/ai/providers/openai-invoice-provider.ts
src/lib/ai/providers/mock-invoice-provider.ts

src/lib/documents/document-processing-service.ts
src/lib/documents/pdf-page-renderer.ts
src/lib/documents/image-preprocessing-service.ts

src/lib/invoice/normalization/invoice-normalization-service.ts
src/lib/invoice/validation/invoice-validation-service.ts
src/lib/invoice/validation/amount-validation.ts
src/lib/invoice/validation/austrian-vat-validation.ts
src/lib/invoice/validation/mandatory-fields-validation.ts
src/lib/invoice/risk/risk-analysis-service.ts
src/lib/invoice/booking/booking-suggestion-service.ts
src/lib/invoice/export/export-service.ts
src/lib/audit/audit-log-service.ts

VERBOTENE LOGIK:
Entferne oder ersetze jede Hauptlogik, die Rechnungsfelder über fixe Positionen oder starre Annahmen erkennt.

Verboten:
- Rechnungsnummer immer oben rechts suchen
- Summe immer unten rechts suchen
- IBAN immer in Fußzeile an fixer Stelle suchen
- nur Seite 1 analysieren
- nur 20 % USt unterstützen
- 0,00 USt automatisch als Fehler markieren
- bei fehlenden Werten Werte erfinden
- Rechnung automatisch freigeben
- Export automatisch erzeugen
- bei AI-Fehler die App crashen lassen

ERLAUBTE STRATEGIE:
- GPT-4o mini für Dokumentverständnis und strukturierte Extraktion
- OCR/Layoutdaten optional ergänzend
- Zod-Schema-Validierung
- Normalisierung
- deterministische Validierung im Code
- manuelle Review- und Korrekturmaske

AI PIPELINE:
Baue diese Pipeline:

1. Upload PDF/JPG/PNG
2. Datei speichern
3. Seitenanzahl erkennen
4. PDF-Seiten als Bilder oder geeignete Inputs vorbereiten
5. Seitenlimit prüfen
6. GPT-4o mini analysiert Rechnung
7. Antwort muss JSON sein
8. JSON mit Zod validieren
9. Daten normalisieren
10. Pflichtmerkmale nach österreichischem § 11 UStG prüfen
11. Beträge Netto/USt/Brutto prüfen
12. steuerliche Sonderfälle prüfen
13. Risiken erzeugen
14. Buchungsvorschlag erzeugen
15. UI zeigt alles mit Confidence, Quelle und Review-Status
16. Nutzer kann korrigieren
17. Export erst nach Review/Freigabe

AI PROVIDER INTERFACE:
Erstelle:

export interface AIInvoiceExtractionProvider {
  extractInvoice(input: InvoiceAIInput): Promise<InvoiceAIExtractionResult>;
  isConfigured(): boolean;
  getProviderName(): string;
  getModelName(): string;
}

OPENAI PROVIDER:
Implementiere OpenAIInvoiceProvider.

Pflichten:
- OpenAI SDK verwenden, falls sinnvoll
- Modell aus env lesen, Default gpt-4o-mini
- Temperatur 0
- structured JSON output erzwingen, soweit technisch möglich
- Timeout berücksichtigen
- Rate Limit Fehler abfangen
- Provider Fehler abfangen
- ungültiges JSON abfangen
- Schemafehler abfangen
- keine unhandled promises

MOCK PROVIDER:
Implementiere MockInvoiceProvider.

Pflichtfälle:
- gültige Rechnung
- mehrseitige Eventtechnik-Rechnung
- Kostenvorschreibung mit 0,00 USt und „kein steuerbarer Vorgang“
- fehlende Rechnungsnummer
- falsche Summe
- niedrige Confidence

UI muss sichtbar anzeigen, ob Mock oder echte KI aktiv ist.

SCHEMA:
Erstelle ein starkes Zod-Schema.

Jedes Feld muss dieses Format haben:

{
  value: T | null,
  confidence: number,
  sourcePage: number | null,
  sourceText: string | null,
  needsReview: boolean,
  boundingBox?: { x, y, width, height } | null
}

Pflichtstruktur:

document:
- documentType
- language
- country
- pageCount
- isMultiPage
- detectedPageNumbers
- missingPages
- overallConfidence

supplier:
- name
- address
- uidNumber
- taxNumber
- companyRegisterNumber
- iban
- bic

customer:
- name
- address
- uidNumber

invoice:
- invoiceNumber
- invoiceDate
- serviceDate
- servicePeriodStart
- servicePeriodEnd
- currency
- paymentTerms
- dueDate
- orderReference
- customerNumber

amounts:
- netAmount
- taxAmount
- grossAmount
- taxRates
- discountAmount
- roundingDifference

lineItems array:
- positionNumber
- description
- quantity
- unit
- unitPrice
- discountPercent
- netAmount
- taxRate
- taxAmount
- grossAmount
- sourcePage
- confidence

specialTaxTreatment:
- isReverseCharge
- isIntraCommunitySupply
- isSmallBusiness
- isNonTaxableTransaction
- isVatExempt
- reasonText
- sourcePage
- confidence

documentQuality:
- readability
- sharpness
- completeness
- missingPages
- pageCount
- warnings

aiWarnings array:
- code
- message
- severity
- sourcePage

AI PROMPT:
Erstelle einen sehr stabilen Prompt in invoice-extraction-prompt.ts.

Der Prompt muss sagen:
- Du analysierst österreichische Rechnungen und rechnungsähnliche Belege.
- Extrahiere nur sichtbare Informationen.
- Erfinde nichts.
- Wenn unsicher oder nicht sichtbar, gib null zurück.
- Gib ausschließlich JSON zurück.
- Keine Markdown-Formatierung.
- Jedes Feld braucht confidence und sourcePage.
- Mehrseitige Dokumente vollständig beachten.
- Positionstabellen können über mehrere Seiten gehen.
- Summen stehen oft auf der letzten Seite.
- Fußzeilen enthalten oft UID, FN, IBAN, BIC.
- 0,00 USt ist nicht automatisch falsch.
- Hinweise wie „kein steuerbarer Vorgang“, „nicht steuerbar“, „Reverse Charge“, „steuerfrei“, „Kleinunternehmer“ müssen erkannt werden.
- Bei widersprüchlichen Daten needsReview true.

NORMALISIERUNG:
Implementiere:
- deutsche Zahlenformate: 1.234,56 -> 1234.56
- Eurozeichen entfernen
- Prozentwerte normalisieren
- Datumsformate DD.MM.YYYY -> ISO
- IBAN Leerzeichen entfernen
- UID großschreiben und normalisieren
- Originalwerte behalten

VALIDIERUNG:
Deterministisch im Code, nicht durch AI.

Prüfe:
- Pflichtmerkmale nach § 11 UStG
- Rechnungsnummer vorhanden
- Rechnungsdatum vorhanden
- Lieferant vorhanden
- Kunde vorhanden
- Leistungsdatum oder Zeitraum vorhanden
- Leistungsbeschreibung vorhanden
- Netto/USt/Brutto vorhanden oder begründeter Sonderfall
- Netto + USt = Brutto mit 0,02 EUR Toleranz
- mehrere Steuersätze möglich
- Rabatt möglich
- 0,00 USt mit Sonderfall möglich
- UID Format plausibel
- IBAN Format plausibel
- mehrseitige Vollständigkeit

Status pro Check:
pass, warning, error, unclear, not_applicable

RISIKOANALYSE:
Erzeuge Risiken für:
- niedrige Confidence
- fehlende Pflichtfelder
- mathematische Abweichung
- doppelte Rechnungsnummer beim selben Lieferanten
- geänderte IBAN
- zukünftiges Rechnungsdatum
- fehlende Seiten
- unlesbare Seiten
- ungewöhnlich hoher Betrag
- unbekannter Lieferant
- ungewöhnliche Steuerlogik

BUCHUNGSVORSCHLAG:
Erzeuge nur Draft-Vorschlag.
Nie automatisch freigeben.

Felder:
- bookingDate
- documentNumber
- supplier
- bookingText
- netAmount
- taxAmount
- grossAmount
- taxAccount
- expenseAccount
- vendorAccount
- costCenter optional
- status: draft/reviewed/approved

UI:
Verbessere Rechnungsdetailseite:

1. AI-Konfigurationsbanner
- OpenAI/gpt-4o-mini aktiv
- oder Mock-Modus aktiv

2. Dokumentvorschau
- Seitenanzahl
- Seiten-Miniaturen
- Seitenstatus

3. Extrahierte Felder
- Wert
- Confidence Badge
- Quelle/Seite
- Originaltextausschnitt
- Bearbeiten
- Bestätigen

4. Positionen
- Tabelle mit Quelle pro Position
- Positionen über mehrere Seiten

5. Summenprüfung
- Netto
- USt
- Brutto
- Differenz
- Status

6. Spezialfälle
- 0 % USt
- kein steuerbarer Vorgang
- Reverse Charge
- steuerfrei
- Kleinunternehmer

7. Review Flow
- Felder mit low confidence markieren
- User kann korrigieren
- Audit Log schreibt Änderungen
- Rechnung kann erst nach Review exportiert werden

8. Analyse erneut starten
- Button „Analyse erneut starten“
- Warnung: „Kann API-Kosten verursachen“
- KEINE automatische Reanalyse bei Refresh

FEHLERBEHANDLUNG:
Implementiere saubere Fehler:
- OPENAI_API_KEY fehlt
- API-Key ungültig
- Rate limit
- Timeout
- ungültiges AI JSON
- Schema validation failed
- Upload zu groß
- falscher Dateityp
- PDF nicht verarbeitbar
- keine lesbaren Seiten
- Datenbankfehler

Keiner dieser Fehler darf die App crashen.

TESTS:
Erstelle oder repariere Tests für:
- App startet ohne API-Key
- Mock Provider liefert valides Schema
- OpenAI Provider erkennt Konfiguration
- ungültiges JSON wird abgefangen
- Zod Schema validiert Confidence
- deutsche Beträge werden normalisiert
- Netto + USt = Brutto
- Rundungstoleranz 0,02
- 0,00 USt + „kein steuerbarer Vorgang“ ist kein automatischer Fehler
- fehlende Rechnungsnummer ist error
- mehrseitige Rechnung pageCount
- fehlende Seiten warning/risk
- niedrige Confidence -> needsReview
- Export gesperrt ohne Review
- Export nutzt korrigierte Werte

BUILD:
Führe am Ende aus:

npm run typecheck
npm run lint
npm run test
npm run build

Falls Scripts fehlen, ergänze sie sinnvoll oder dokumentiere es in README.
Behebe alle Fehler.

DOKUMENTATION:
Aktualisiere:
- README.md
- docs/API_OVERVIEW.md falls vorhanden
- docs/DATA_MODEL.md falls vorhanden
- docs/IMPLEMENTATION_NOTES.md

README muss erklären:
- wie man OpenAI aktiviert
- wie man GPT-4o mini verwendet
- was Mock-Modus ist
- dass API-Nutzung kostenpflichtig ist
- dass Rechnungsdaten bei aktiver KI an OpenAI gesendet werden
- wie man Tests/Build ausführt
- Troubleshooting

AKZEPTANZKRITERIEN:
Am Ende muss gelten:
- App startet ohne OpenAI-Key
- App zeigt Mock-Modus klar an
- mit OpenAI-Key nutzt App GPT-4o mini
- Upload echter PDF/JPG/PNG funktioniert
- mehrseitige Rechnungen werden unterstützt
- AI-Ergebnis wird gespeichert und validiert
- Detailseite zeigt Confidence und Quelle
- 0,00 USt Sonderfälle werden korrekt behandelt
- User kann Felder korrigieren
- Export erst nach Review/Freigabe
- Build läuft fehlerfrei
- Tests laufen fehlerfrei

Gib am Ende eine kurze Zusammenfassung:
- was geändert wurde
- welche Bugs behoben wurden
- welche Dateien neu sind
- welche Commands erfolgreich liefen
- was noch mockbasiert ist
- wie ich OPENAI_API_KEY setzen muss

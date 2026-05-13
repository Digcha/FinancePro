# Implementation Notes

## Architektur

FinancePro ist als Next.js App Router Anwendung mit TypeScript, Tailwind CSS, Prisma und SQLite umgesetzt. Die Geschäftslogik liegt im Server-Layer unter `src/server/services`.

Implementierte Services:

- `DocumentQualityService`
- `PageGroupingService`
- `LayoutAnalysisService`
- `TableExtractionService`
- `InvoiceExtractionService`
- `InvoiceValidationService`
- `RiskAnalysisService`
- `BookingSuggestionService`
- `ExportService`
- `AuditLogService`

## Produktgrenzen

Die App trifft keine finale Steuer- oder Rechtsentscheidung. Risiken werden als Auffälligkeiten formuliert und nicht als Betrugsbehauptung. Unsichere Uploads werden mit Review-Status gespeichert; fehlende Werte werden nicht ausgedacht.

## GPT-4o mini Pipeline

Neue AI-Struktur:

- `src/lib/ai/invoice-ai-service.ts`
- `src/lib/ai/providers/openai-invoice-provider.ts`
- `src/lib/ai/providers/mock-invoice-provider.ts`
- `src/lib/ai/schemas/invoice-ai-result.schema.ts`
- `src/lib/ai/prompts/invoice-extraction-prompt.ts`

Der OpenAI Provider nutzt das Modell aus `AI_MODEL`, Default `gpt-4o-mini`, Temperatur `0`, Timeout aus `AI_ANALYSIS_TIMEOUT_SECONDS` und Zod-validierte strukturierte JSON-Ausgabe. Rate-Limit-, Timeout-, Provider-, JSON- und Schemafehler werden in typisierte Fehler umgewandelt.

Wenn `OPENAI_API_KEY` fehlt und `AI_USE_MOCK_WHEN_KEY_MISSING=true`, verwendet FinancePro den Mock Provider und zeigt im UI „KI nicht konfiguriert — Mock-Modus aktiv“.

## Mehrseitenverarbeitung

Invoice-Seiten werden in `InvoicePage` gespeichert. `PageGroupingService` prüft erkannte Seitenzahlen und meldet fehlende Seiten. Positionen speichern `sourcePageNumber`; finale Summenboxen und Footer-Daten können über `LayoutAnalysisService` priorisiert werden.

## 0,00-USt-Logik

`InvoiceValidationService` bewertet `0,00` USt als plausibel, wenn ein Hinweis auf „kein steuerbarer Vorgang“, „nicht steuerbar“, „Reverse Charge“, „steuerfrei“, „Kleinunternehmer“ oder innergemeinschaftliche Lieferung erkannt wurde. Ohne Begründung wird eine Warnung erzeugt, kein automatischer Fehler.

## Export

`ExportService` erzeugt CSV/JSON. Offene Validierungsfehler, fehlende Review-Freigabe oder reviewpflichtige Felder blockieren den Export. Freigabe ist als Status, `exportApproved` und `BookingSuggestion.status` modelliert.

## Korrekturen und Audit

`PATCH /api/invoices/[id]/fields` speichert korrigierte finale Werte, setzt Feldstatus auf `corrected` oder `confirmed`, schreibt Audit-Logs und berechnet Validierung, Risiken und Buchungsvorschlag neu. Export nutzt die finalen korrigierten Werte.

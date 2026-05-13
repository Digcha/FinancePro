# API Overview

## Rechnungen

`GET /api/invoices`

Gibt alle Rechnungen inklusive Seiten, Positionen, Validierungen, Risiken, Buchungsvorschlag, Exporten und Audit-Logs zurück.

`GET /api/invoices/[id]`

Gibt eine einzelne Rechnung mit allen Detaildaten zurück.

`POST /api/invoices/upload`

Multipart Upload für `files`. Erlaubt sind PDF, PNG und JPEG. Mehrere Dateien werden als eine Dokumentgruppe angelegt. Nach dem Speichern startet genau einmal die AI-Pipeline. Ohne OpenAI-Key wird der Mock Provider genutzt und in der Antwort sichtbar markiert.

Antwort:

```json
{
  "invoiceId": "demo-id",
  "status": "review_required",
  "aiMode": "mock",
  "aiMessage": "KI nicht konfiguriert — Mock-Modus aktiv"
}
```

`PATCH /api/invoices/[id]/fields`

Korrigiert oder bestätigt ein extrahiertes Feld. Danach werden Validierung, Risiken und Buchungsvorschlag neu berechnet.

Input:

```json
{
  "fieldPath": "invoice.invoiceNumber",
  "value": "RE-2026-001",
  "action": "correct"
}
```

`POST /api/invoices/[id]/approve`

Setzt Rechnung und Buchungsvorschlag nur dann auf freigegeben, wenn keine offenen Validierungsfehler und keine reviewpflichtigen Felder vorhanden sind. Andernfalls antwortet die API mit `409`.

`POST /api/invoices/[id]/reanalyze`

Startet die Analyse manuell erneut. Refresh löst keine erneute Analyse aus. Die Aktion schreibt Audit-Logs und kann bei aktivem OpenAI-Key API-Kosten verursachen.

## Export

`GET /api/invoices/[id]/export?target=BMD&format=csv`

Erzeugt eine Download-Datei. Parameter:

- `target`: `BMD`, `RZL`, `DOMIZIL_PLUS`, `BUSINESS_CENTRAL`
- `format`: `csv`, `json`

Bei fehlender Freigabe, reviewpflichtigen Feldern oder Validierungsfehlern antwortet die API mit `409` und den blockierenden Gründen.

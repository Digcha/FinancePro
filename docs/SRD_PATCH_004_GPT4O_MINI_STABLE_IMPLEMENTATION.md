# SRD PATCH 004 — GPT-4o mini Stable Implementation Requirements

Projekt: FinancePro  
Typ: Software Requirements Document Patch  
Priorität: sehr hoch

---

## 1. Technisches Ziel

FinancePro erhält eine robuste, produktionsnahe AI-Rechnungsextraktion mit GPT-4o mini. Die Implementierung muss bestehende Fehler beheben und darf die App nicht instabil machen.

Die Implementierung muss modular sein, sodass später GPT-4o mini, andere OpenAI-Modelle, lokale Modelle oder Mock-Provider austauschbar sind.

---

## 2. Environment Configuration

Erstelle/aktualisiere `.env.example`:

```env
# AI
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=
AI_TEMPERATURE=0
AI_MAX_OUTPUT_TOKENS=8000
AI_MAX_PAGES_PER_ANALYSIS=8
AI_ANALYSIS_TIMEOUT_SECONDS=90
AI_USE_MOCK_WHEN_KEY_MISSING=true

# Upload limits
MAX_UPLOAD_MB=25
ALLOWED_UPLOAD_TYPES=application/pdf,image/png,image/jpeg,image/jpg

# Validation
AMOUNT_TOLERANCE_EUR=0.02
LOW_CONFIDENCE_THRESHOLD=0.75
```

Pflicht:

- API-Key nie hardcoden
- `.env` nie committen
- `.env.example` committen
- App muss ohne API-Key im Mock-Modus starten

---

## 3. Neue/zu prüfende Ordnerstruktur

Falls möglich, diese Struktur verwenden:

```text
src/
  lib/
    ai/
      types.ts
      invoice-ai-service.ts
      schemas/
        invoice-ai-result.schema.ts
      prompts/
        invoice-extraction-prompt.ts
      providers/
        ai-provider.interface.ts
        openai-invoice-provider.ts
        mock-invoice-provider.ts
    documents/
      document-processing-service.ts
      pdf-page-renderer.ts
      image-preprocessing-service.ts
    invoice/
      validation/
        invoice-validation-service.ts
        amount-validation.ts
        austrian-vat-validation.ts
        mandatory-fields-validation.ts
      risk/
        risk-analysis-service.ts
      booking/
        booking-suggestion-service.ts
      export/
        export-service.ts
      normalization/
        invoice-normalization-service.ts
    audit/
      audit-log-service.ts
```

Wenn bestehende Struktur anders ist, keine unnötige Migration erzwingen, aber dieselben Verantwortlichkeiten sauber trennen.

---

## 4. AI Provider Interface

Erstelle ein Interface:

```ts
export interface AIInvoiceExtractionProvider {
  extractInvoice(input: InvoiceAIInput): Promise<InvoiceAIExtractionResult>;
  isConfigured(): boolean;
  getProviderName(): string;
  getModelName(): string;
}
```

`InvoiceAIInput` enthält:

- invoiceId
- originalFileName
- mimeType
- pageCount
- pages als Bilder oder Base64
- optional OCR-Text pro Seite
- locale: `de-AT`
- currencyHint: `EUR`

---

## 5. OpenAI Provider

Implementiere `OpenAIInvoiceProvider`.

Pflichten:

- nutzt `OPENAI_API_KEY`
- nutzt `AI_MODEL`, Default `gpt-4o-mini`
- nutzt Temperatur 0
- sendet Systemprompt + Userprompt + Dokumentseiten
- fordert ausschließlich JSON an
- validiert Antwort gegen Schema
- behandelt Timeouts
- behandelt Rate Limits
- behandelt JSON-Fehler
- gibt typisierte Fehler zurück

Fehlerklassen oder Fehlercodes:

- AI_NOT_CONFIGURED
- AI_TIMEOUT
- AI_RATE_LIMIT
- AI_PROVIDER_ERROR
- AI_INVALID_JSON
- AI_SCHEMA_VALIDATION_FAILED
- AI_FILE_TOO_LARGE
- AI_TOO_MANY_PAGES

---

## 6. Mock Provider

Der Mock Provider ist Pflicht.

Er wird verwendet, wenn:

- kein API-Key vorhanden ist
- `AI_PROVIDER=mock`
- AI-Aufruf im Entwicklungsmodus bewusst deaktiviert ist

Der Mock Provider muss realistische Demo-Ergebnisse liefern:

1. gültige Standardrechnung
2. mehrseitige Eventtechnik-Rechnung
3. Kostenvorschreibung mit 0,00 USt und „kein steuerbarer Vorgang“
4. Rechnung mit fehlender Rechnungsnummer
5. Rechnung mit falscher Summe
6. Rechnung mit niedriger Confidence

Der Mock Provider darf nicht so tun, als wäre echte KI aktiv. UI muss zeigen: „Mock-Modus“.

---

## 7. AI JSON Schema

Erstelle Zod Schema für `InvoiceAIExtractionResult`.

Grundstruktur:

```ts
{
  document: {
    documentType,
    language,
    country,
    pageCount,
    isMultiPage,
    detectedPageNumbers,
    missingPages,
    overallConfidence
  },
  supplier: {...},
  customer: {...},
  invoice: {...},
  amounts: {...},
  lineItems: [...],
  specialTaxTreatment: {...},
  documentQuality: {...},
  aiWarnings: [...]
}
```

Jedes Feld mit Wert muss `ExtractedField<T>` verwenden:

```ts
export type ExtractedField<T> = {
  value: T | null;
  confidence: number;
  sourcePage: number | null;
  sourceText: string | null;
  needsReview: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};
```

Confidence muss zwischen 0 und 1 liegen.

---

## 8. Prompt-Anforderungen

Systemprompt muss enthalten:

- Du analysierst österreichische Rechnungen und rechnungsähnliche Belege.
- Extrahiere nur Informationen, die im Dokument sichtbar sind.
- Erfinde keine Werte.
- Wenn Wert nicht vorhanden/unsicher, nutze `null`.
- Antworte ausschließlich als JSON.
- Keine Markdown-Blöcke.
- Jede Information braucht Quelle und Confidence.
- Mehrseitige Rechnungen vollständig berücksichtigen.
- Positionstabellen können über Seiten laufen.
- Summen stehen oft am Ende.
- Fußzeilen können wichtige Daten enthalten.
- 0,00 USt ist nicht automatisch falsch.
- Erkenne steuerliche Hinweise wie „kein steuerbarer Vorgang“.

---

## 9. Document Processing

Vor AI-Aufruf:

- Dateityp validieren
- Dateigröße validieren
- PDF-Seiten zählen
- PDF-Seiten als Bilder rendern oder geeignete File-Input-Strategie verwenden
- Seitenlimit prüfen
- Bildqualität grob bewerten
- fehlerhafte Seiten markieren

MVP darf einfache Rendering-Methode verwenden, aber muss Fehler sauber behandeln.

---

## 10. Normalisierung

Nach AI-Ergebnis:

- Beträge in Dezimalzahlen normalisieren
- deutsche Zahlenformate unterstützen: `1.234,56`
- negative Werte erkennen
- Prozentwerte normalisieren
- Datumsformate normalisieren: `DD.MM.YYYY` → ISO
- IBAN Leerzeichen entfernen
- UID normalisieren: `ATU...`
- Währung normalisieren

Niemals Originalwerte überschreiben, ohne Original zu speichern.

---

## 11. Validierung

Validierung muss deterministisch sein.

### 11.1 Pflichtmerkmale

Prüfe mindestens:

- Lieferant Name/Anschrift
- Kunde Name/Anschrift
- Rechnungsnummer
- Rechnungsdatum
- Leistungsdatum oder Leistungszeitraum
- Leistungsbeschreibung
- Entgelt/Netto
- Steuerbetrag oder steuerlicher Sonderhinweis
- Steuersatz oder Sonderfall
- Brutto/Gesamtbetrag
- UID, wenn erforderlich/erkennbar

Status pro Merkmal:

- pass
- warning
- error
- unclear
- not_applicable

### 11.2 Betragsprüfung

- pro Steuergruppe prüfen
- Gesamtsummen prüfen
- Rundungstoleranz anwenden
- Rabatte berücksichtigen
- mehrere Steuergruppen erlauben
- 0,00 USt mit Sonderhinweis erlauben

### 11.3 Sonderfälle

Erkenne und klassifiziere:

- reverse_charge
- non_taxable_transaction
- vat_exempt
- small_business
- intra_community_supply
- unknown_special_case

---

## 12. Risikoanalyse

Risiken:

- niedrige AI-Confidence
- fehlende Pflichtfelder
- mathematische Abweichung
- doppelte Rechnungsnummer vom selben Lieferanten
- IBAN geändert
- zukünftiges Rechnungsdatum
- fehlende finale Summe
- fehlende Seiten
- unlesbare Seite
- hoher Betrag
- unbekannter Lieferant
- ungewöhnliche Steuerkonstellation

Risikoobjekt:

```ts
{
  code: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  evidence: string[];
}
```

---

## 13. UI Requirements

### 13.1 AI Configuration Banner

Wenn kein API-Key:

- Banner: „KI nicht konfiguriert — Mock-Modus aktiv“
- Link/Tooltip zu README Setup

Wenn AI aktiv:

- Anzeige: `AI: OpenAI / gpt-4o-mini`

### 13.2 Detailseite Feldanzeige

Jedes Feld zeigt:

- finaler Wert
- AI-Wert
- Confidence Badge
- Quellseite
- Quelltext
- Bearbeiten
- Bestätigen

### 13.3 Review Status

- Felder mit `needsReview` prominent markieren
- Button „Alle sicheren Felder bestätigen“ optional
- Button „Rechnung geprüft“ nur aktiv, wenn keine Fehler offen sind

### 13.4 Analyse erneut starten

- kein automatischer erneuter AI-Aufruf bei Refresh
- Button: „Analyse erneut starten“
- Warnung: „Kann API-Kosten verursachen“

---

## 14. Audit Log

Speichere:

- AI analysis started
- AI analysis completed
- AI analysis failed
- schema validation failed
- field corrected
- field confirmed
- invoice reviewed
- export generated

Bei Feldänderung:

- Feldname
- alter Wert
- neuer Wert
- Nutzer
- Zeitpunkt
- Grund optional

---

## 15. Tests

Pflichttests:

1. App startet ohne API-Key
2. Mock Provider liefert valides Schema
3. OpenAI Provider wird nur mit API-Key aktiv
4. ungültiges JSON wird sauber abgefangen
5. Zod Schema validiert Confidence-Bereich
6. deutsche Betragsformate werden normalisiert
7. Netto + USt = Brutto Test
8. Rundungsdifferenz bis 0,02 erlaubt
9. 0,00 USt + „kein steuerbarer Vorgang“ = kein automatischer Fehler
10. fehlende Rechnungsnummer = error
11. mehrseitige Rechnung = pageCount korrekt
12. fehlende Seiten = warning/high risk
13. niedrige Confidence = needsReview
14. Export gesperrt, wenn Review fehlt
15. Export nutzt korrigierte Werte

---

## 16. Build-Anforderung

Nach Implementierung müssen laufen:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Falls Scripts fehlen, sinnvoll ergänzen oder README dokumentieren.

---

## 17. README-Anforderung

README muss ergänzen:

- OpenAI Setup
- GPT-4o mini Konfiguration
- API-Key Einrichtung
- Mock-Modus
- Kostenhinweis
- Datenschutzhinweis: Rechnungsdaten werden an OpenAI gesendet, wenn AI aktiv ist
- Analyse erneut starten
- Troubleshooting

---

## 18. Definition of Done

- keine feste Layoutlogik mehr als Hauptstrategie
- GPT-4o mini über Provider integriert
- Mock-Modus stabil
- echte Rechnungen werden nicht durch Appfehler abgebrochen
- UI zeigt Confidence/Quelle/Review
- Sonderfälle werden unterstützt
- Tests laufen
- Build läuft


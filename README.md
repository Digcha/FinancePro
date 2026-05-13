# FinancePro

FinancePro ist ein Next.js MVP fuer einen KI-Rechnungsagenten fuer österreichische Eingangsrechnungen. Die App nimmt PDF/JPG/PNG entgegen, speichert Dokumentseiten, verarbeitet sie ueber eine AI-Provider-Schicht, validiert das Ergebnis mit Zod, normalisiert Beträge/Datumswerte/UID/IBAN, prueft deterministisch nach § 11 UStG, erzeugt Risiken, Draft-Buchungsvorschlaege und kontrollierte CSV/JSON-Exports.

## Installation

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Die App laeuft danach unter `http://localhost:3000`.

## OpenAI aktivieren

FinancePro nutzt standardmaessig `AI_PROVIDER=openai` und `AI_MODEL=gpt-4o-mini`.

In `.env` setzen:

```env
OPENAI_API_KEY=dein_key
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0
AI_MAX_OUTPUT_TOKENS=8000
AI_MAX_PAGES_PER_ANALYSIS=8
AI_ANALYSIS_TIMEOUT_SECONDS=90
```

API-Keys werden nie im Code gespeichert. `.env` bleibt lokal, `.env.example` enthaelt nur leere Platzhalter.

Wichtig: Wenn echte KI aktiv ist, werden Rechnungsdaten und Dokumentinputs zur Analyse an OpenAI gesendet. OpenAI API-Nutzung kann kostenpflichtig sein.

## Mock-Modus

Wenn `OPENAI_API_KEY` fehlt und `AI_USE_MOCK_WHEN_KEY_MISSING=true` gesetzt ist, startet die App stabil im Mock-Modus. Das UI zeigt sichtbar:

`KI nicht konfiguriert — Mock-Modus aktiv`

Der Mock Provider liefert realistische Faelle: Standardrechnung, mehrseitige Eventtechnik-Rechnung, Kostenvorschreibung mit `0,00` USt und „kein steuerbarer Vorgang“, fehlende Rechnungsnummer, falsche Summe und niedrige Confidence.

## Pipeline

1. Upload PDF/JPG/PNG
2. Datei lokal unter `uploads/` speichern
3. Seitenanzahl erkennen, PDF als Dateiinput oder Bilder als visuelle Inputs vorbereiten
4. Seitenlimit pruefen
5. GPT-4o mini oder Mock Provider analysiert
6. JSON mit Zod validieren
7. Werte normalisieren
8. § 11 UStG, Beträge und Sonderfaelle deterministisch pruefen
9. Risiken und Draft-Buchungsvorschlag erzeugen
10. Detailseite zeigt Confidence, Quelle, Review-Status
11. Nutzer korrigiert oder bestaetigt Felder
12. Export erst nach Review/Freigabe

Es gibt keine automatische Freigabe, keinen automatischen Export und keine automatische Reanalyse bei Refresh. Die Detailseite bietet dafuer den Button „Analyse erneut starten“ mit Kostenwarnung.

## Seiten

- `/dashboard` zeigt Kennzahlen, neueste Uploads und Statusverteilung.
- `/upload` bietet Drag & Drop fuer PDF/JPG/PNG und Mehrseiten-Gruppen.
- `/invoices` listet alle Demo- und Upload-Rechnungen.
- `/invoices/[id]` zeigt AI-Status, Dokumentvorschau, Confidence-Felder, Positionen, Validierung, Risiken, Review, Buchung und Export.
- `/exports` zeigt freigegebene Belege und Exportrecords.
- `/settings` zeigt Demo-Mandant, Regelversion und Service-Layer.

## Commands

```bash
npm run dev          # lokaler Next.js Server
npm run db:generate  # Prisma Client generieren
npm run db:push      # SQLite Schema anlegen/aktualisieren
npm run db:seed      # Demo-Rechnungen laden
npm run db:reset     # DB zuruecksetzen und Seed neu laden
npm run typecheck    # TypeScript Check
npm run lint         # ESLint
npm run test         # Vitest Unit Tests
npm run build        # Produktionsbuild
```

## Noch mockbasiert

Lokale OCR, echte PDF-Seitenrenderings und Bildverbesserung sind im MVP bewusst einfach gehalten. PDFs werden als Dateiinput an OpenAI gegeben; Bilder als Base64-Bildinput. Ohne OpenAI-Key liefert der Mock Provider strukturierte Ergebnisse, damit Review, Validierung, Risiko, Buchung und Export getestet werden koennen.

## Troubleshooting

- `KI nicht konfiguriert — Mock-Modus aktiv`: `OPENAI_API_KEY` in `.env` setzen und Server neu starten.
- `AI_RATE_LIMIT`: spaeter erneut analysieren oder OpenAI Limits pruefen.
- `AI_TIMEOUT`: `AI_ANALYSIS_TIMEOUT_SECONDS` erhoehen oder Seitenzahl reduzieren.
- `DOC_TOO_LARGE`: `MAX_UPLOAD_MB` pruefen oder kleinere Datei hochladen.
- `DOC_INVALID_TYPE`: Nur PDF, PNG, JPG/JPEG sind erlaubt.
- `Export blockiert`: Offene Validierungsfehler, Review-Felder oder fehlende Freigabe zuerst bearbeiten.

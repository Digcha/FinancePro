# OCR Pipeline

## MVP

Der Upload speichert Dateien lokal unter `uploads/`, erzeugt Seitenobjekte und startet danach die AI-Pipeline. Bei vorhandenem `OPENAI_API_KEY` analysiert der OpenAI Provider mit `gpt-4o-mini`; ohne Key wird der Mock Provider genutzt.

Pipeline:

1. Upload
2. Dateitypprüfung
3. lokale Speicherung
4. Seitenzählung und einfache Qualitätsprüfung
5. PDF als Dateiinput oder Bild als visueller Input vorbereiten
6. GPT-4o mini oder Mock Provider
7. Zod Schema Validation
8. Normalisierung
9. strukturierte Invoice-Anlage mit Confidence, Quelle und Review-Flags
10. § 11 UStG-Regelprüfung
11. Risikoanalyse
12. Draft-Buchungsvorschlag
13. Audit-Log

## Aktuelle Grenzen

Lokale OCR und echtes PDF-Seitenrendering sind weiterhin nicht produktiv ausgebaut. PDFs werden als OpenAI-Dateiinput verwendet; Bilder als Base64-Bildinput. Die App verlässt sich nicht auf fixe Layoutpositionen und erfindet fehlende Werte nicht.

Ein spaeterer OCR-Adapter sollte pro Seite liefern:

- Volltext
- Layoutblöcke
- Tabellenbereiche
- Bounding Boxes
- Confidence
- Engine-Name und Version

Die Extraktion wird JSON-schema-validiert. Fehlende oder unklare Werte dürfen nicht als sicher gespeichert werden.

## Footer-Daten

Footer-Signale wie UID, Firmenbuchnummer, IBAN und BIC werden über `LayoutAnalysisService` modelliert. Für mehrseitige Rechnungen soll insbesondere die letzte Seite und der Fußbereich priorisiert werden.

## Mehrseitige Tabellen

`TableExtractionService` sortiert Positionen nach Seitenherkunft und Positionsnummer. 100-%-Rabatte bleiben zulässig und werden nicht automatisch als Fehler behandelt.

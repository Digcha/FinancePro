# CHANGE REQUEST 004 — GPT-4o mini Stable Real Invoice Processing

Projekt: FinancePro  
Status: verbindliche Änderungsanforderung  
Priorität: sehr hoch  
Ziel: echte österreichische Rechnungen stabil verarbeiten, vorhandene Fehler beheben, GPT-4o mini sauber integrieren

---

## 1. Problemstellung

Die bisherige FinancePro-Version funktioniert nicht zuverlässig mit echten Rechnungen. Das System scheint aktuell zu stark auf feste Layouts, fixe Positionen, Mockdaten oder einfache Regex-Erkennung ausgelegt zu sein. Das ist für echte Rechnungen ungeeignet.

Echte Rechnungen unterscheiden sich stark:

- Beträge stehen nicht immer unten rechts.
- UID, IBAN, BIC und Firmenbuchnummer stehen oft in Fußzeilen.
- Positionstabellen können über mehrere Seiten laufen.
- Die finale Summe steht oft nur auf der letzten Seite.
- Manche Dokumente sind keine klassische Rechnung, sondern Kostenvorschreibung, Vorschreibung, Gutschrift, Storno, Zahlungsaufforderung oder Rechnung mit steuerlichem Sonderfall.
- Fotos/Scans können schief, unscharf, abgeschnitten oder mehrseitig sein.
- OCR kann Reihenfolgen vertauschen oder Tabellen falsch lesen.

FinancePro muss daher von fixer Positionslogik auf eine robuste AI + Validierungs-Pipeline umgebaut werden.

---

## 2. Ziel dieser Änderung

FinancePro soll echte österreichische Rechnungen mithilfe von GPT-4o mini analysieren können.

GPT-4o mini wird verwendet für:

- Dokumentverständnis
- Layoutverständnis
- Feldextraktion
- Erkennung von Positionstabellen
- Erkennung mehrseitiger Rechnungen
- Erkennung steuerlicher Hinweise
- Erkennung von Sonderfällen wie „kein steuerbarer Vorgang“

GPT-4o mini darf jedoch NICHT final entscheiden, ob eine Rechnung gültig ist. Die KI liefert nur strukturierte Kandidaten. Die eigentliche Prüfung erfolgt deterministisch im Code.

---

## 3. Verbindliche Grundregel

Das System darf keine Werte erfinden.

Wenn ein Wert nicht sichtbar oder unsicher ist, muss der Wert `null` sein und `needsReview: true` gesetzt werden.

Jedes extrahierte Feld braucht:

- Wert
- Confidence
- Quellseite
- Quelltextausschnitt
- Review-Flag
- optional Bounding Box

Beispiel:

```json
{
  "invoiceNumber": {
    "value": "2024-00123",
    "confidence": 0.93,
    "sourcePage": 1,
    "sourceText": "Rechnung Nr. 2024-00123",
    "needsReview": false
  }
}
```

---

## 4. Zu behebende Hauptfehler

### 4.1 Keine fixe Layoutlogik mehr

Verboten:

- Feldextraktion über fixe Pixelkoordinaten
- Annahme: Rechnungsnummer ist immer oben rechts
- Annahme: Summe ist immer unten rechts
- Annahme: IBAN steht immer unten links
- Annahme: Seite 1 enthält alle Daten
- Annahme: Dokument hat nur eine Seite
- Annahme: 0,00 USt ist automatisch Fehler
- Annahme: nur 20 % USt ist korrekt

Erlaubt:

- AI-basierte Extraktion
- OCR mit Layoutdaten
- Label-/Synonym-Erkennung
- relative Nähe von Label und Wert
- Tabellenlogik
- Plausibilitätsprüfung
- Nutzerkorrektur

---

### 4.2 Mehrseitige Dokumente korrekt behandeln

Das System muss mehrseitige PDFs vollständig unterstützen.

Pflichten:

- Seitenanzahl erkennen
- jede Seite als Teil desselben Dokuments speichern
- Seitenstatus anzeigen
- Positionen über mehrere Seiten zusammenführen
- finale Summentabelle bevorzugt auf letzter Seite suchen
- Warnung anzeigen, wenn Seiten fehlen oder Reihenfolge unklar ist
- Quellenangabe je Feld/Position speichern

Wenn eine Rechnung „Seite 1 von 4“ bis „Seite 4 von 4“ enthält, muss das System prüfen, ob wirklich alle vier Seiten vorhanden sind.

---

### 4.3 0,00 USt und Sonderfälle korrekt behandeln

0,00 USt darf nicht automatisch als Fehler gelten.

Mögliche valide Sonderfälle:

- kein steuerbarer Vorgang
- nicht steuerbar
- steuerfrei
- Reverse Charge
- innergemeinschaftliche Lieferung
- Kleinunternehmerregelung
- Vorschreibung/Kostenvorschreibung ohne USt
- Mitgliedsbeitrag oder hoheitliche Gebühr, je nach Dokumentart

Das System muss dafür ein Feld `specialTaxTreatment` speichern.

Beispiel:

```json
{
  "specialTaxTreatment": {
    "isNonTaxableTransaction": true,
    "reasonText": "kein steuerbarer Vorgang",
    "confidence": 0.96,
    "sourcePage": 1
  }
}
```

---

### 4.4 Brutto/Netto/USt korrekt prüfen

Die KI extrahiert Beträge. Danach prüft der Code deterministisch:

- Netto + USt = Brutto
- USt-Betrag passt zum Steuersatz
- Rundungsdifferenzen bis konfigurierbarer Toleranz sind erlaubt
- mehrere Steuersätze werden getrennt geprüft
- Rabatte werden berücksichtigt
- 0,00 USt wird über Sonderfalllogik geprüft

Toleranz:

- Standard: 0,02 EUR
- Konfigurierbar über zentrale Konstante

---

### 4.5 Keine automatische Freigabe

Eine Rechnung darf nie automatisch endgültig freigegeben oder exportiert werden.

Workflow:

1. Upload
2. AI-Analyse
3. Systemvalidierung
4. Review durch Nutzer
5. Nutzer korrigiert bei Bedarf
6. Nutzer markiert als geprüft
7. Export wird möglich

---

### 4.6 Fehler dürfen die App nicht crashen

Bei folgenden Fällen muss die App stabil bleiben:

- OpenAI API-Key fehlt
- OpenAI API-Key falsch
- OpenAI Rate Limit
- OpenAI Timeout
- OpenAI liefert kein valides JSON
- JSON passt nicht zum Schema
- PDF-Konvertierung schlägt fehl
- OCR/AI-Analyse schlägt fehl
- Upload zu groß
- Datei nicht lesbar
- einzelne Seite kaputt
- Datenbankfehler

In allen Fällen muss eine verständliche Fehlermeldung im UI erscheinen und ein technisches Log gespeichert werden.

---

## 5. Zielarchitektur

Pipeline:

```text
Upload
→ Datei speichern
→ Dokumentseiten extrahieren
→ Seitenbilder/OCR vorbereiten
→ GPT-4o mini Analyse
→ JSON Schema Validation
→ Normalisierung
→ deterministische Validierung
→ Risikoanalyse
→ Buchungsvorschlag
→ Review UI
→ Nutzerfreigabe
→ Export
```

---

## 6. AI-Modell

Für MVP wird GPT-4o mini verwendet.

Environment:

```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=
AI_TEMPERATURE=0
AI_MAX_OUTPUT_TOKENS=8000
AI_MAX_PAGES_PER_ANALYSIS=8
AI_ANALYSIS_TIMEOUT_SECONDS=90
```

Wenn kein API-Key vorhanden ist, läuft die App im Mock-Modus und zeigt sichtbar:

> KI-Extraktion nicht konfiguriert. Aktuell werden Demo-/Mockdaten verwendet.

---

## 7. AI darf nicht tun

Die AI darf NICHT:

- Werte erfinden
- fehlende UID oder IBAN erraten
- Betrag ausdenken
- Rechnungen final als „gültig“ markieren
- Rechnungen final als „Betrug“ markieren
- Buchungen automatisch freigeben
- Exporte automatisch auslösen
- rechtliche oder steuerliche Beratung formulieren
- Nutzerentscheidung ersetzen
- bei Unsicherheit trotzdem hohe Confidence vergeben

---

## 8. Akzeptanzkriterien

Diese Änderung gilt als erfüllt, wenn:

- Upload von PDF/JPG/PNG funktioniert
- mehrseitige PDF-Rechnungen analysiert werden können
- GPT-4o mini über `.env` aktiviert werden kann
- fehlender API-Key die App nicht crashen lässt
- AI-Ergebnis über Zod/Schema validiert wird
- Felder mit Confidence und Quelle angezeigt werden
- Positionstabellen über mehrere Seiten unterstützt werden
- 0,00 USt mit „kein steuerbarer Vorgang“ nicht automatisch als Fehler gilt
- Netto/USt/Brutto deterministisch geprüft werden
- User Felder korrigieren kann
- Audit Log Änderungen speichert
- Export erst nach Review/Freigabe möglich ist
- Build und Tests fehlerfrei laufen


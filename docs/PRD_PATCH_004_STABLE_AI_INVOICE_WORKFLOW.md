# PRD PATCH 004 — Stabiler GPT-4o mini Rechnungsworkflow

Projekt: FinancePro  
Typ: Product Requirements Patch  
Priorität: sehr hoch

---

## 1. Produktziel

FinancePro soll echte österreichische Rechnungen, Kostenvorschreibungen und ähnliche Belege stabil verarbeiten können. Die App soll nicht nur Demo-Rechnungen oder fixe Layouts lesen, sondern unterschiedliche reale Belegformen analysieren.

GPT-4o mini wird eingesetzt, um Dokumente flexibel zu verstehen. Die Business-Logik von FinancePro bleibt jedoch kontrolliert, deterministisch und nachvollziehbar.

---

## 2. Zielnutzer

- Buchhalterinnen und Buchhalter
- KMU in Österreich
- Steuerberatungskanzleien
- interne Rechnungsprüfer
- Gründer/Projektteam von FinancePro für Demo und MVP

---

## 3. Hauptnutzen

Der Nutzer soll eine echte Rechnung hochladen können und danach sehen:

- welche Daten erkannt wurden
- wie sicher FinancePro bei jedem Feld ist
- von welcher Seite/welchem Text der Wert stammt
- ob formale Pflichtmerkmale fehlen
- ob Beträge rechnerisch passen
- ob steuerliche Sonderfälle erkannt wurden
- ob die Rechnung manuell geprüft werden muss
- ob ein Export möglich ist

---

## 4. User Stories

### 4.1 Rechnung hochladen

Als Buchhalter möchte ich eine PDF-, JPG- oder PNG-Rechnung hochladen, damit FinancePro sie analysiert.

Akzeptanz:

- Drag & Drop funktioniert
- Dateityp wird geprüft
- Dateigröße wird geprüft
- Uploadstatus wird angezeigt
- bei Fehler kommt eine verständliche Meldung

---

### 4.2 Mehrseitige Rechnung analysieren

Als Buchhalter möchte ich eine mehrseitige Rechnung hochladen, damit FinancePro alle Seiten berücksichtigt.

Akzeptanz:

- Seitenanzahl wird angezeigt
- Seitenminiaturen werden angezeigt
- erkannte Positionen enthalten Quellseite
- finale Summen werden korrekt erkannt
- fehlende Seiten erzeugen Warnung

---

### 4.3 AI-Ergebnis prüfen

Als Buchhalter möchte ich bei jedem erkannten Feld sehen, wie sicher das System ist.

Akzeptanz:

- jedes Feld zeigt Confidence
- jedes Feld zeigt Quelle/Seite
- jedes Feld zeigt Originaltextausschnitt
- niedrige Confidence wird hervorgehoben
- Felder können manuell korrigiert werden

---

### 4.4 Sonderfall 0,00 USt erkennen

Als Buchhalter möchte ich, dass FinancePro 0,00 USt nicht automatisch als Fehler bewertet, wenn ein nachvollziehbarer Grund im Dokument steht.

Akzeptanz:

- „kein steuerbarer Vorgang“ wird erkannt
- „nicht steuerbar“ wird erkannt
- Reverse Charge wird erkannt
- Kleinunternehmerhinweise werden erkannt
- Spezialfall wird sichtbar erklärt
- Export bleibt möglich, wenn Review erfolgt ist

---

### 4.5 Rechnung korrigieren

Als Nutzer möchte ich falsch erkannte Daten korrigieren können.

Akzeptanz:

- Feld ist editierbar
- ursprünglicher AI-Wert bleibt im Audit Log nachvollziehbar
- korrigierter Wert ersetzt AI-Wert für Validierung und Export
- geänderte Felder werden markiert

---

### 4.6 Export erst nach Review

Als Unternehmen möchte ich verhindern, dass ungeprüfte Rechnungen exportiert werden.

Akzeptanz:

- Export ist gesperrt, solange Rechnung nicht geprüft ist
- Fehlerstatus blockiert Export
- Warnstatus erlaubt Export nur nach ausdrücklicher Bestätigung
- Export nutzt korrigierte finale Werte

---

## 5. UI-Anforderungen

### 5.1 Rechnungsdetailseite

Die Detailseite muss folgende Bereiche enthalten:

1. Dokumentvorschau
   - Seitenliste
   - Seitenminiaturen
   - Seitenqualität
   - Seitenstatus

2. AI-Extraktion
   - Lieferant
   - Kunde
   - Rechnung
   - Beträge
   - UID/IBAN/BIC
   - Confidence je Feld
   - Quelle je Feld

3. Positionen
   - Tabellenansicht
   - Menge
   - Einheit
   - Beschreibung
   - Einzelpreis
   - Rabatt
   - Netto
   - USt-Satz
   - USt-Betrag
   - Brutto
   - Quellseite

4. Validierung
   - Pflichtmerkmale nach § 11 UStG
   - Status pro Merkmal
   - Erklärung
   - Schweregrad

5. Risikoanalyse
   - Titel
   - Beschreibung
   - Severity
   - Empfehlung
   - Begründung

6. Review & Export
   - Review-Status
   - Freigabe-Button
   - Exportformat-Auswahl
   - Exportvorschau
   - Download

---

## 6. Statusmodell

Invoice Status:

- uploaded
- ai_processing
- ai_failed
- extracted
- validation_failed
- needs_review
- reviewed
- approved
- exported

Field Status:

- extracted
- low_confidence
- missing
- corrected
- confirmed

Validation Status:

- pass
- warning
- error
- not_applicable
- unclear

---

## 7. Fehleranforderungen

Fehlermeldungen müssen für Nutzer verständlich sein.

Beispiele:

- „OpenAI API-Key fehlt. Die KI-Analyse ist nicht aktiviert.“
- „Die Analyse konnte nicht abgeschlossen werden. Bitte erneut versuchen.“
- „Das Dokument konnte nicht gelesen werden. Bitte lade eine schärfere Version hoch.“
- „Das AI-Ergebnis konnte nicht validiert werden. Die Rechnung muss manuell geprüft werden.“
- „Export nicht möglich, weil Pflichtfelder fehlen.“

---

## 8. Nicht-Ziele

FinancePro soll im MVP NICHT:

- echte Steuerberatung ersetzen
- automatisch Buchhaltungssysteme direkt bebuchen
- FinanzOnline oder Banken automatisch verbinden
- UID live über externe Register validieren, außer explizit später umgesetzt
- Betrug rechtlich feststellen
- ohne Nutzerfreigabe exportieren
- Rechnungen permanent an AI senden, wenn sie bereits analysiert wurden

---

## 9. Erfolgskriterien

- echte Rechnungen können hochgeladen werden
- echte Mehrseiten-Rechnungen funktionieren
- keine fixe Koordinatenlogik mehr
- UI zeigt Quellen und Confidence
- 0,00-USt-Sonderfälle werden korrekt behandelt
- Nutzer kann AI-Fehler korrigieren
- Export ist kontrolliert
- System stürzt bei AI-Fehlern nicht ab


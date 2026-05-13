# PRD – Product Requirements Document
# FinancePro – KI-Rechnungsagent für österreichische Unternehmen

**Projekt:** FinancePro  
**Version:** 1.0  
**Stand:** 13.05.2026  
**Erstellt für:** Dimitar Chalakov und Lisa Plaschka  
**Dokumenttyp:** Produktanforderungen

---

## 1. Produktvision

FinancePro ist ein KI-gestützter Rechnungsagent für österreichische Unternehmen, Steuerberatungskanzleien und Buchhaltungsabteilungen. Das Tool hilft dabei, Eingangsrechnungen aus PDF, Scan, Foto oder E-Mail automatisch auszulesen, formal nach österreichischem § 11 UStG zu prüfen, Risiken sichtbar zu machen und kontrollierbare Buchungsvorschläge für bestehende Buchhaltungssysteme zu erzeugen.

FinancePro ersetzt keine Buchhalterin, keinen Buchhalter und keine Steuerberatung. FinancePro soll den wiederkehrenden, fehleranfälligen und zeitaufwendigen Vorbereitungsprozess automatisieren, damit Menschen schneller und sicherer entscheiden können.

---

## 2. Produktversprechen

**Scannen. Prüfen nach § 11 UStG. Risiko erkennen. Verbuchung exportieren.**

FinancePro nimmt eine Rechnung entgegen, prüft die Qualität, liest die Inhalte aus, erkennt fehlende oder widersprüchliche Angaben, schlägt eine Buchung vor und exportiert die Daten in ein gewünschtes Zielsystem.

---

## 3. Problemstellung

Unternehmen erhalten laufend Rechnungen. Diese Rechnungen kommen oft in verschiedenen Formaten:

- PDF per E-Mail
- eingescanntes Dokument
- Foto vom Handy
- Papierbeleg
- schlechte Kopie
- mehrseitige PDF
- Rechnung mit Tabellen
- Rechnung mit Skonto oder mehreren Steuersätzen

Buchhalter müssen dann manuell prüfen:

- Ist die Rechnung vollständig?
- Sind alle Pflichtangaben vorhanden?
- Stimmen Netto, USt und Brutto?
- Gibt es ein Leistungsdatum?
- Ist die UID vorhanden, falls erforderlich?
- Gab es diese Rechnung bereits?
- Ist die IBAN bekannt?
- Welches Konto soll verwendet werden?
- In welchem Format muss das in BMD, RZL, domizil+ oder Business Central importiert werden?

Dieser Prozess kostet Zeit, ist fehleranfällig und bindet Fachpersonal.

---

## 4. Zielgruppe

### 4.1 Primäre Zielgruppe

#### Österreichische KMU

Kleine und mittlere Unternehmen, die regelmäßig Eingangsrechnungen erhalten und Buchhaltung intern oder extern vorbereiten.

Typische Merkmale:

- 20 bis 2.000 Eingangsrechnungen pro Monat
- eine oder mehrere Buchhaltungspersonen
- bestehende Buchhaltungssoftware
- Bedarf an schnellerer Vorbereitung
- wenig Interesse an komplettem Systemwechsel

#### Steuerberatungskanzleien

Kanzleien, die viele Mandanten und Belege verarbeiten.

Typische Merkmale:

- viele Mandanten
- hoher manueller Aufwand
- unterschiedliche Belegqualitäten
- Bedarf an Standardisierung
- Bedarf an Auditierbarkeit

#### Buchhaltungsabteilungen

Interne Teams in größeren Firmen.

Typische Merkmale:

- klare Freigabeprozesse
- wiederkehrende Lieferanten
- mehrere Kostenstellen
- ERP- oder FIBU-System vorhanden

---

## 5. Nicht-Zielgruppen

FinancePro ist nicht primär gedacht für:

- Privatpersonen ohne Buchhaltung
- Unternehmen, die ein komplettes ERP-System suchen
- Unternehmen, die nur Ausgangsrechnungen erstellen wollen
- Unternehmen, die Lohnverrechnung brauchen
- Nutzer, die eine vollautomatische Steuerentscheidung ohne Kontrolle erwarten
- Nutzer, die Belege ohne Prüfung sofort buchen lassen wollen

---

## 6. Produktumfang

FinancePro umfasst im Kern:

1. Upload und Scan von Eingangsrechnungen
2. Qualitätsprüfung des Dokuments
3. OCR und Datenextraktion
4. Prüfung nach österreichischen Rechnungsmerkmalen
5. Risikoanalyse
6. Buchungsvorschlag
7. Nutzerkontrolle und Korrektur
8. Export in Buchhaltungssysteme
9. Audit-Log und Nachvollziehbarkeit

---

## 7. MVP-Ziel

Der MVP soll beweisen, dass FinancePro den Arbeitsaufwand bei Eingangsrechnungen deutlich reduziert und gleichzeitig nachvollziehbare Prüfhinweise erzeugt.

### MVP muss können

- PDF oder Bild hochladen
- Rechnung lesbar machen
- Kernfelder extrahieren
- Pflichtmerkmale prüfen
- Warnungen anzeigen
- Buchungsvorschlag erzeugen
- Nutzerkorrektur ermöglichen
- Export als CSV/XLSX erzeugen
- BMD/RZL-orientierte Exportstruktur vorbereiten
- Rechnungen in Dashboard verwalten

### MVP muss nicht können

- vollständige direkte API-Integration in alle Zielsysteme
- native Mobile App
- automatische Zahlung
- Bankabgleich
- Mahnwesen
- vollständige Steuerberatung
- komplette Buchhaltung
- Ausgangsrechnungen

---

## 8. User Personas

### 8.1 Anna – Buchhalterin in einem KMU

Anna erhält täglich 30 bis 80 Eingangsrechnungen. Viele kommen als PDF, manche als Scan oder Foto. Sie muss die Daten prüfen, Buchungsvorschläge erstellen und am Monatsende alles in die Buchhaltungssoftware bringen.

Ihre Ziele:

- weniger manuell abtippen
- Fehler schneller erkennen
- Rechnungen schneller freigeben
- Exportdateien ohne Chaos erzeugen

Ihre Probleme:

- schlechte Scans
- fehlende Leistungsdaten
- doppelte Rechnungen
- falsche Umsatzsteuerbeträge
- Lieferanten mit neuen IBANs

### 8.2 Markus – Steuerberater

Markus betreut viele Mandanten. Jeder Mandant liefert Belege anders. Manche schicken PDFs, andere Fotos, manche ganze Ordner.

Seine Ziele:

- Mandantenbelege standardisieren
- Risiken früh erkennen
- Export in bestehende Kanzleisoftware
- klare Nachvollziehbarkeit für Rückfragen

### 8.3 Lisa – Geschäftsführerin

Lisa will wissen, ob Rechnungen Risiken enthalten, aber sie möchte nicht jedes Detail der Buchhaltung prüfen.

Ihre Ziele:

- Überblick über offene Rechnungen
- Warnungen bei hohen Beträgen
- keine doppelten Zahlungen
- Kontrolle über Freigaben

---

## 9. Haupt-User-Flows

### 9.1 Rechnung per PDF hochladen

1. Nutzer klickt auf „Rechnung hochladen“.
2. Nutzer wählt PDF oder Bild aus.
3. System prüft Dateityp und Dateigröße.
4. System startet Qualitätsprüfung.
5. System startet OCR.
6. System extrahiert Rechnungsfelder.
7. System zeigt Ergebnis in Review-Ansicht.
8. Nutzer korrigiert bei Bedarf Felder.
9. Nutzer prüft Warnungen.
10. Nutzer bestätigt Buchungsvorschlag.
11. Nutzer exportiert Datei.

### 9.2 Rechnung mit Kamera scannen

1. Nutzer öffnet Scan-Funktion.
2. Kamera erkennt Dokumentrand.
3. System prüft Schärfe.
4. System prüft, ob das ganze Blatt sichtbar ist.
5. System zeigt Scan-Vorschau.
6. Nutzer bestätigt oder scannt neu.
7. System verarbeitet Scan wie normalen Upload.

### 9.3 Rechnung mit Warnung prüfen

1. Rechnung wird verarbeitet.
2. System erkennt fehlendes Leistungsdatum.
3. System markiert Warnung.
4. Nutzer sieht genaue Erklärung.
5. Nutzer ergänzt Leistungsdatum manuell oder markiert Warnung als bewusst akzeptiert.
6. Entscheidung wird im Audit-Log gespeichert.

### 9.4 Doppelte Rechnung erkennen

1. Nutzer lädt Rechnung hoch.
2. System erkennt Lieferant und Rechnungsnummer.
3. System findet bereits vorhandene Rechnung mit gleicher Nummer und gleichem Lieferanten.
4. System zeigt kritische Warnung.
5. Nutzer kann Rechnung ablehnen, prüfen oder als Ausnahme markieren.

### 9.5 Export erzeugen

1. Nutzer öffnet freigegebene Rechnung.
2. Nutzer wählt Zielsystem.
3. System validiert Pflichtfelder für dieses Zielsystem.
4. System erzeugt Exportdatei.
5. Nutzer lädt Datei herunter.
6. Export wird im Audit-Log gespeichert.

---

## 10. Funktionale Anforderungen

## 10.1 Authentifizierung

### Anforderungen

- Nutzer können sich registrieren oder eingeladen werden.
- Nutzer melden sich mit E-Mail und Passwort an.
- Passwort muss sicher gespeichert werden.
- Optional später: SSO, Microsoft Login, Google Login.
- Nutzer gehören zu mindestens einem Mandanten.

### Akzeptanzkriterien

- Ein Nutzer kann sich einloggen.
- Ein Nutzer sieht nur Daten seines Mandanten.
- Session läuft sicher ab.
- Falsche Loginversuche werden begrenzt.

---

## 10.2 Mandantenverwaltung

### Anforderungen

- Ein Mandant entspricht einer Firma oder Kanzleiumgebung.
- Mandant hat Stammdaten:
  - Firmenname
  - Adresse
  - UID
  - Standardwährung
  - Kontenplan-Typ
  - Exportziel
- Ein Mandant kann mehrere Nutzer haben.
- Ein Nutzer kann in mehreren Mandanten sein.

### Was nicht passieren darf

- Rechnungen verschiedener Mandanten dürfen niemals vermischt werden.
- Ein Nutzer darf nicht über URL-Manipulation fremde Belege sehen.

---

## 10.3 Rechnungsupload

### Anforderungen

Unterstützte Dateitypen MVP:

- PDF
- PNG
- JPG/JPEG

Später:

- TIFF
- E-Mail-Anhang
- ZIP mit mehreren Rechnungen

Upload-Prüfung:

- Dateityp erlaubt?
- Datei beschädigt?
- Datei verschlüsselt?
- Datei zu groß?
- PDF enthält Text oder Scan?
- Anzahl Seiten?

### Nicht erlaubt

- unbekannte Dateitypen still akzeptieren
- beschädigte PDFs verarbeiten, ohne Fehler anzuzeigen
- mehrere Rechnungen in einer Datei unkommentiert als eine Rechnung behandeln

---

## 10.4 Scanqualitätsprüfung

### Anforderungen

Das System prüft:

- Schärfe
- Helligkeit
- Kontrast
- sichtbare Blattkanten
- Vollständigkeit des Blatts
- Drehung
- Perspektivverzerrung
- verdeckte Bereiche

### Ergebnis

- Akzeptiert
- Warnung
- Abgelehnt

### Beispiele

Akzeptiert:

- Rechnung vollständig sichtbar
- Text scharf
- gute Beleuchtung

Warnung:

- leichte Perspektive
- etwas dunkler Hintergrund
- OCR wahrscheinlich möglich

Abgelehnt:

- abgeschnittene Rechnung
- unscharfer Text
- starke Schatten
- halbes Blatt fehlt

---

## 10.5 OCR und Datenextraktion

### Zu extrahierende Felder

#### Lieferant

- Name
- Adresse
- UID
- Firmenbuchnummer, falls vorhanden
- E-Mail, falls vorhanden
- Telefonnummer, falls vorhanden
- IBAN
- BIC

#### Empfänger

- Name
- Adresse
- UID, falls erforderlich oder vorhanden

#### Rechnung

- Rechnungsnummer
- Rechnungsdatum
- Leistungsdatum
- Leistungszeitraum
- Fälligkeitsdatum
- Zahlungsbedingungen
- Währung
- Sprache

#### Beträge

- Nettobetrag
- Umsatzsteuersatz
- Umsatzsteuerbetrag
- Bruttobetrag
- mehrere Steuersätze, falls vorhanden
- Skonto, falls vorhanden
- Rundungsdifferenz, falls vorhanden

#### Positionen

- Beschreibung
- Menge
- Einheit
- Einzelpreis
- Nettobetrag
- Steuersatz
- Gesamtbetrag

### Confidence

Jedes erkannte Feld erhält:

- Wert
- Confidence
- Quelle im Dokument, wenn möglich
- OCR-Ausschnitt

### Nicht erlaubt

- fehlende Werte erfinden
- unlesbare Werte als sicher markieren
- UID oder IBAN automatisch vervollständigen, ohne dies zu kennzeichnen
- Zahlen runden, ohne Originalwert zu speichern

---

## 10.6 Prüfung nach § 11 UStG

### Ziel

FinancePro prüft, ob die für eine österreichische Rechnung relevanten formalen Angaben erkannt wurden.

### Zu prüfende Merkmale

- Name und Anschrift des liefernden/le oder leistenden Unternehmens
- Name und Anschrift des Rechnungsempfängers
- Menge und handelsübliche Bezeichnung der Lieferung oder Art und Umfang der Leistung
- Tag der Lieferung oder Leistung beziehungsweise Leistungszeitraum
- Entgelt
- anzuwendender Steuersatz
- Steuerbetrag
- Ausstellungsdatum
- fortlaufende Rechnungsnummer
- UID-Nummer des leistenden Unternehmens, soweit erforderlich
- UID-Nummer des Leistungsempfängers bei entsprechenden Voraussetzungen, insbesondere bei Rechnungen über 10.000 EUR brutto
- Hinweis auf Steuerbefreiung oder Reverse Charge, falls relevant

### Prüfergebnis pro Merkmal

- Erfüllt
- Nicht erkannt
- Widersprüchlich
- Nicht erforderlich
- Manuelle Prüfung erforderlich

### Gesamtstatus

- Grün: keine kritischen formalen Probleme erkannt
- Gelb: Warnungen vorhanden
- Rot: kritische Pflichtangaben fehlen oder widersprechen sich
- Grau: nicht prüfbar wegen schlechter Dokumentqualität

### Wichtig

Das System sagt nicht: „Die Rechnung ist rechtlich gültig.“  
Das System sagt: „Die formalen Merkmale wurden anhand der erkannten Daten geprüft.“

---

## 10.7 Mathematische Prüfung

### Anforderungen

Das System prüft:

- Netto + USt = Brutto
- Netto × Steuersatz = USt
- Summe der Positionen = Rechnungssumme
- mehrere Steuersätze getrennt korrekt
- Währung einheitlich
- Rundungsdifferenzen plausibel

### Toleranz

Kleine Rundungsdifferenzen können als Warnung statt Fehler behandelt werden. Die Toleranz muss konfigurierbar sein.

---

## 10.8 Risikoanalyse

### Risikokategorien

#### Dokumentrisiko

- schlechte Scanqualität
- OCR-Confidence niedrig
- abgeschnittene Seite
- ungewöhnliches Layout

#### Lieferantenrisiko

- neuer Lieferant
- geänderte IBAN
- UID fehlt
- UID Format auffällig
- Adresse weicht von Historie ab

#### Rechnungsrisiko

- doppelte Rechnungsnummer
- gleicher Betrag kurz hintereinander
- ungewöhnlich hoher Betrag
- Rechnungsdatum sehr alt
- Rechnungsdatum in der Zukunft
- Zahlungsziel auffällig kurz

#### Steuer-/Formrisiko

- Pflichtmerkmal fehlt
- USt falsch berechnet
- Reverse-Charge-Hinweis unklar
- mehrere Steuersätze nicht nachvollziehbar

### Risikostufen

- Niedrig
- Mittel
- Hoch
- Kritisch

### Nicht erlaubt

- Das System darf keinen Lieferanten als Betrüger bezeichnen.
- Das System darf keine Zahlung automatisch blockieren.
- Das System darf keine endgültige rechtliche Wertung treffen.

---

## 10.9 Buchungsvorschlag

### Ziel

FinancePro schlägt eine Buchung vor, die vom Nutzer kontrolliert und angepasst werden kann.

### Felder

- Buchungsdatum
- Belegdatum
- Belegnummer
- Lieferantenkonto
- Gegenkonto / Aufwandskonto
- Steuerkonto / Vorsteuer
- Steuercode
- Netto
- USt
- Brutto
- Buchungstext
- Kostenstelle
- Projekt
- Zahlungsziel

### Vorschlagslogik

Das System nutzt:

- Lieferantenhistorie
- ähnliche frühere Rechnungen
- Schlagwörter in Positionen
- manuell hinterlegte Regeln
- Standardkonten
- Steuersatz

### Beispiele

- Rechnung von A1 → Telekommunikation
- Rechnung von Wien Energie → Energieaufwand
- Rechnung von Amazon Business → Bürobedarf oder IT-Zubehör, je nach Position

### Nicht erlaubt

- Konto sicher behaupten, wenn Confidence niedrig ist
- Buchung ohne Nutzerfreigabe finalisieren
- steuerlich komplizierte Sonderfälle ohne Warnung automatisch behandeln

---

## 10.10 Review-Oberfläche

### Muss anzeigen

- Originalbeleg links
- erkannte Felder rechts
- Confidence pro Feld
- Warnungen oben sichtbar
- Pflichtmerkmale-Checkliste
- Betragsprüfung
- Buchungsvorschlag
- Exportvorschau

### Nutzeraktionen

- Feld korrigieren
- Warnung akzeptieren
- Warnung lösen
- Rechnung ablehnen
- Rechnung freigeben
- Export erstellen
- Kommentar hinzufügen

### UX-Grundsatz

Der Nutzer muss sofort verstehen:

- Was wurde erkannt?
- Was ist unsicher?
- Was fehlt?
- Was muss ich tun?

---

## 10.11 Export

### Zielsysteme

- BMD
- RZL
- domizil+
- Microsoft Dynamics 365 Business Central
- Generic CSV/XLSX

### MVP-Export

Im MVP wird mindestens ein generisches CSV/XLSX erzeugt und die Struktur so vorbereitet, dass BMD/RZL-Mapping möglich ist.

### Exportvalidierung

Vor Export prüft das System:

- Sind alle Pflichtfelder für Export vorhanden?
- Ist Rechnung freigegeben?
- Gibt es kritische offene Warnungen?
- Ist das Zielsystem konfiguriert?

### Nicht erlaubt

- Export trotz fehlendem Pflichtfeld ohne Warnung
- Export ohne Audit-Eintrag
- direkte Verbuchung ohne Nutzerfreigabe

---

## 10.12 Dashboard

### Dashboard-Kennzahlen

- neue Rechnungen
- wartend auf Prüfung
- Rechnungen mit Warnungen
- kritische Rechnungen
- freigegebene Rechnungen
- exportierte Rechnungen
- häufigste Warnungen
- Zeitersparnis-Schätzung

### Listenansicht

Spalten:

- Status
- Lieferant
- Rechnungsnummer
- Datum
- Brutto
- Risiko
- Exportstatus
- zuständige Person

Filter:

- Zeitraum
- Mandant
- Status
- Risiko
- Lieferant
- Exportziel

---

## 10.13 Lieferantenverwaltung

### Anforderungen

Für jeden Lieferanten speichert FinancePro:

- Name
- Adresse
- UID
- IBANs
- bisherige Rechnungen
- typische Kontierung
- typische Kostenstelle
- Risikohistorie

### Nicht erlaubt

- Lieferanten automatisch global zwischen Mandanten teilen
- neue IBAN ohne Warnung als Standard übernehmen

---

## 10.14 Audit-Log

### Muss protokollieren

- Upload
- OCR-Ergebnis
- KI-Extraktion
- Nutzerkorrekturen
- Warnungen
- Freigaben
- Exporte
- Rollenänderungen
- Systemregel-Version

### Zweck

Bei einer späteren Rückfrage soll nachvollziehbar sein:

- Wer hat was geändert?
- Wann wurde es geändert?
- Warum wurde eine Warnung akzeptiert?
- Welche Version der Prüfregeln wurde verwendet?

---

## 11. Nicht-funktionale Anforderungen

### 11.1 Performance

- Dashboard lädt unter normalen Bedingungen schnell.
- Upload startet sofort mit sichtbarem Fortschritt.
- OCR darf asynchron laufen.
- Nutzer darf während Verarbeitung weiterarbeiten.

### 11.2 Sicherheit

- HTTPS Pflicht
- sichere Passwortspeicherung
- rollenbasierte Rechte
- Verschlüsselung sensibler Daten
- keine Rechnungsdaten in normalen Logs
- Datei-Upload absichern

### 11.3 Datenschutz

- Mandantentrennung
- Löschkonzept
- Datenexport möglich
- keine KI-Trainingsnutzung ohne Zustimmung
- EU/Österreich-Hosting bevorzugt

### 11.4 Zuverlässigkeit

- Verarbeitungsschritte wiederholbar
- Fehlerzustände sichtbar
- kein stilles Scheitern
- Exportdateien reproduzierbar

### 11.5 Nachvollziehbarkeit

Jede KI-Aussage braucht eine technische Grundlage:

- erkannter Text
- Feldposition
- Confidence
- Regelresultat

---

## 12. Design- und UX-Anforderungen

### Stil

FinancePro soll modern, ruhig und professionell wirken.

Designrichtung:

- 2026 SaaS-Look
- clean
- dunkel/hell optional
- klare Karten
- wenig visuelles Chaos
- starke Statusfarben, aber nicht überladen
- Finance-/Compliance-Vertrauen

### UI-Prinzipien

- Warnungen müssen sofort sichtbar sein.
- Grüne Checks dürfen nicht übertreiben.
- Unsicherheit muss ehrlich dargestellt werden.
- Nutzer darf nie das Gefühl haben, dass die KI heimlich etwas entscheidet.
- Originalbeleg und extrahierte Daten müssen nebeneinander sichtbar sein.

### Sprachstil im Produkt

Gut:

- „Leistungsdatum wurde nicht erkannt.“
- „Bitte prüfen: IBAN weicht von bisheriger Lieferanten-IBAN ab.“
- „Betragsberechnung plausibel.“

Nicht gut:

- „Diese Rechnung ist illegal.“
- „Alles korrekt.“
- „KI hat entschieden.“
- „Du kannst sicher Vorsteuer abziehen.“

---

## 13. Was FinancePro ausdrücklich nicht machen soll

FinancePro soll nicht:

1. vollständige Buchhaltungssoftware ersetzen
2. Steuerberatung ersetzen
3. Rechtsberatung geben
4. Rechnungen ohne Nutzerfreigabe final verbuchen
5. Zahlungen auslösen
6. Bankkonten verwalten
7. Lohnverrechnung machen
8. Mahnungen schreiben
9. Ausgangsrechnungen im MVP erstellen
10. fehlende Rechnungsdaten erfinden
11. unsichere Daten als sicher darstellen
12. Kunden- oder Lieferantendaten zwischen Mandanten vermischen
13. Rechnungen als Betrug bezeichnen
14. ohne Einwilligung Kundendaten zum KI-Training verwenden
15. gesetzliche Sonderfälle ohne Warnung automatisch entscheiden
16. Exportdateien erzeugen, wenn kritische Pflichtfelder fehlen, ohne deutlich zu warnen
17. Nutzerkorrekturen überschreiben, ohne zu fragen
18. Belege löschen, ohne Audit-Log
19. Dateianhänge blind verarbeiten, ohne Sicherheitsprüfung
20. ein Zielsystem vortäuschen, wenn das Format nicht sauber unterstützt wird

---

## 14. Erfolgskriterien

### Produktmetriken

- Zeit pro Rechnung reduziert
- Anteil automatisch erkannter Felder
- OCR-/Extraktionsgenauigkeit
- Anzahl erkannter Doppelrechnungen
- Anzahl vermiedener manueller Korrekturen
- Export-Erfolgsrate
- Nutzerakzeptanz bei Buchhaltern

### Zielwerte MVP

- 80 % der Kernfelder bei guten PDFs korrekt erkannt
- klare Warnung bei schlechter Scanqualität
- Exportdatei für mindestens ein Zielsystem erzeugbar
- jede Nutzerkorrektur auditierbar
- keine Rechnung kann ohne Freigabe exportiert werden

---

## 15. Roadmap

### Phase 1 – MVP

- Upload
- OCR
- Feldextraktion
- § 11 Basisprüfung
- Risiko-Basislogik
- Buchungsvorschlag basic
- Review UI
- CSV/XLSX Export

### Phase 2 – Österreichische FIBU-Integration

- BMD Exportadapter verfeinern
- RZL Exportadapter verfeinern
- domizil+ Exportanalyse
- Business Central Export/API-Konzept
- Lieferantenhistorie
- Kontierungsregeln

### Phase 3 – Automatisierung und Kanzleiworkflow

- E-Mail-Import
- Mandantenportal
- Freigabeprozesse
- wiederkehrende Lieferantenregeln
- bessere Risikoanalyse

### Phase 4 – Enterprise

- SSO
- private Cloud / On-Premise
- API-Integrationen
- erweiterte Compliance-Reports
- mehrsprachige Rechnungsverarbeitung

---

## 16. Quellen / fachliche Grundlage

- RIS: Umsatzsteuergesetz 1994 § 11
- USP Österreich: Rechnung und umsatzsteuerliche Formerfordernisse
- WKO: Rechnung richtig ausstellen
- BMD: FIBU Standardschnittstellen / Importmöglichkeiten
- RZL: FIBU Import Schnittstelle und Datenimport Buchungen
- Microsoft Learn: Dynamics 365 / Business Central Journal Import Grundlagen

---

## 17. Zusammenfassung

FinancePro soll ein präzises, nachvollziehbares und österreichspezifisches Tool für Eingangsrechnungen werden. Der größte Wert liegt nicht darin, dass die KI „magisch bucht“, sondern darin, dass sie monotone Vorarbeit übernimmt, Fehler sichtbar macht und Menschen bessere Entscheidungen ermöglicht.

# ADR – Architecture Decision Record
# FinancePro – KI-Rechnungsagent für österreichische Unternehmen

**Projekt:** FinancePro  
**Version:** 1.0  
**Stand:** 13.05.2026  
**Erstellt für:** Dimitar Chalakov und Lisa Plaschka  
**Ziel:** Technische Architektur-Entscheidungen für MVP und spätere Skalierung

---

## 1. Zweck dieses Dokuments

Dieses ADR-Dokument beschreibt die wichtigsten Architekturentscheidungen für FinancePro. Es soll Entwicklern, Codex, Produktverantwortlichen und späteren technischen Partnern eindeutig erklären, wie das System aufgebaut werden soll, warum bestimmte technische Entscheidungen getroffen werden und welche Dinge ausdrücklich nicht gebaut werden sollen.

FinancePro ist kein normales Rechnungsprogramm und keine vollständige Buchhaltungssoftware. FinancePro ist ein intelligenter Vorprozess für Eingangsrechnungen. Das System soll Rechnungen erfassen, prüfen, Risiken erkennen, strukturierte Daten erzeugen und Buchungsvorschläge für bestehende Buchhaltungssysteme exportieren.

---

## 2. Produktkontext

Österreichische Unternehmen erhalten laufend Eingangsrechnungen per E-Mail, PDF, Scan, Foto oder Papier. Diese Rechnungen müssen normalerweise manuell geprüft, erfasst, kontiert und in eine Buchhaltungssoftware übertragen werden. FinancePro automatisiert diesen Vorgang so weit wie möglich, ohne die menschliche Kontrolle vollständig zu entfernen.

Der Kernprozess lautet:

1. Rechnung wird hochgeladen, fotografiert oder aus einer Mailquelle importiert.
2. FinancePro prüft, ob das Dokument lesbar und vollständig ist.
3. OCR und Dokumentanalyse extrahieren relevante Rechnungsdaten.
4. Das System prüft die formalen Rechnungsmerkmale nach österreichischem § 11 UStG.
5. Risikoindikatoren werden erkannt.
6. Ein Buchungsvorschlag wird erzeugt.
7. Der Nutzer kontrolliert und bestätigt.
8. Export erfolgt in ein Zielsystem wie BMD, RZL, domizil+ oder Microsoft Dynamics 365 Business Central.

---

## 3. Architekturziele

Die Architektur muss folgende Ziele erfüllen:

- Österreich-Fokus mit § 11 UStG als zentrale Prüfgrundlage
- Hohe Nachvollziehbarkeit jeder KI-Entscheidung
- Menschliche Freigabe vor jeder finalen Buchung oder jedem Export
- Mandantenfähigkeit für mehrere Firmen oder Steuerberatungskanzleien
- Datenschutzfreundliche Verarbeitung sensibler Rechnungsdaten
- Erweiterbare Exportstruktur für mehrere Buchhaltungssysteme
- Robuste OCR-Pipeline für PDF, Scan und Foto
- Klare Trennung zwischen Dokumenterkennung, Rechtsprüfung, Risikoanalyse und Buchungsvorschlag
- Keine automatische Steuerberatung ohne Hinweis und Nutzerkontrolle
- Keine endgültige Buchung direkt in fremden Systemen ohne Bestätigung

---

## 4. Grundsatzentscheidung: Modularer Aufbau statt Monolith mit KI-Blackbox

### Entscheidung

FinancePro wird als modularer Backend-Service mit klar getrennten Domänenmodulen gebaut:

- Dokumenteingang
- Scan-Qualitätsprüfung
- OCR und Layout-Erkennung
- Rechnungsdaten-Extraktion
- § 11 UStG-Prüfengine
- Risiko-Engine
- Buchungsvorschlags-Engine
- Export-Engine
- Nutzer-Review und Freigabe
- Audit-Log
- Admin- und Mandantenverwaltung

### Begründung

Die Verarbeitung einer Rechnung besteht aus mehreren fachlich unterschiedlichen Schritten. Wenn alles als eine große KI-Blackbox gebaut wird, kann später niemand nachvollziehen, warum eine Rechnung als ungültig markiert wurde oder warum ein bestimmtes Konto vorgeschlagen wurde. Für ein Finanzprodukt ist Nachvollziehbarkeit wichtiger als maximale Automatisierung.

### Konsequenz

Jeder Schritt erzeugt ein eigenes Zwischenergebnis. Diese Zwischenergebnisse werden gespeichert und im UI sichtbar gemacht. Beispiel:

- OCR-Rohtext
- erkannte Rechnungsfelder
- Confidence-Werte pro Feld
- Prüfungsergebnis pro Pflichtmerkmal
- Risikoindikatoren
- vorgeschlagene Buchungssätze
- Exportstatus

---

## 5. Systemübersicht

### 5.1 Hauptkomponenten

#### 5.1.1 Frontend Web-App

Die Web-App ist das Hauptinterface für Buchhalter, Admins und Steuerberater. Sie enthält:

- Login
- Dashboard
- Rechnung hochladen
- Rechnungsprüfung ansehen
- Belegdaten korrigieren
- Buchungsvorschlag prüfen
- Exportziel auswählen
- Exportdatei herunterladen oder später API-Export auslösen
- Mandanten verwalten
- Lieferantenhistorie ansehen
- Risikowarnungen nachvollziehen
- Audit-Log anzeigen

#### 5.1.2 Mobile Scan-App oder Mobile Web Scan

FinancePro soll eine Scan-Funktion bieten. Im MVP kann diese als mobile Web-Funktion umgesetzt werden. Später kann daraus eine native App entstehen.

Pflichten:

- Kamera öffnen
- Blattkanten erkennen
- Schärfe prüfen
- Beleuchtung prüfen
- Vollständigkeit prüfen
- Perspektive korrigieren
- Bild zuschneiden
- Scan nur akzeptieren, wenn Qualität ausreichend ist

Nicht erlaubt:

- Unscharfe Fotos stillschweigend akzeptieren
- abgeschnittene Rechnungen als gültig verarbeiten
- dem Nutzer verschweigen, wenn das Dokument schlecht lesbar ist

#### 5.1.3 Backend API

Das Backend stellt alle Kernfunktionen bereit:

- Authentifizierung
- Mandantenverwaltung
- Upload-Verarbeitung
- OCR-Orchestrierung
- Datenextraktion
- Prüfregeln
- Risikoanalyse
- Buchungsvorschläge
- Export-Erzeugung
- Audit-Logging
- Benutzerrechte

#### 5.1.4 OCR-Service

Der OCR-Service verarbeitet PDFs, Scans und Fotos. Er erzeugt:

- Volltext
- Layoutinformationen
- Tabellenbereiche
- Positionen von Rechnungsfeldern
- Confidence-Werte

Mögliche Technologien für MVP:

- Tesseract OCR für lokale Tests
- Google Document AI, Azure AI Document Intelligence oder AWS Textract für bessere Qualität
- später hybride Lösung: Cloud-OCR für MVP, lokale/private OCR für sensible Kunden

#### 5.1.5 KI-Extraktionsservice

Die KI darf nicht einfach frei raten. Sie soll strukturierte Rechnungsdaten aus OCR-Text und Layoutdaten extrahieren.

Ausgabe muss immer JSON-konform sein.

Beispiel-Ausgabe:

```json
{
  "supplier_name": "Muster GmbH",
  "supplier_address": "Musterstraße 1, 1010 Wien",
  "supplier_uid": "ATU12345678",
  "customer_name": "Beispiel GmbH",
  "invoice_number": "RE-2026-0012",
  "invoice_date": "2026-05-13",
  "service_date": "2026-05-10",
  "net_amount": 1000.00,
  "vat_rate": 20,
  "vat_amount": 200.00,
  "gross_amount": 1200.00,
  "currency": "EUR",
  "iban": "AT611904300234573201",
  "line_items": []
}
```

Die KI muss zu jedem Feld zusätzlich eine Confidence liefern.

#### 5.1.6 Regelbasierte Prüfengine

Die Prüfung nach § 11 UStG darf nicht vollständig von einem Sprachmodell entschieden werden. Sie muss regelbasiert und nachvollziehbar erfolgen.

Die KI kann Felder extrahieren. Die formale Entscheidung trifft die Regelengine.

Beispiel:

- Wenn Rechnungsbetrag > 10.000 EUR brutto und Empfänger Unternehmer ist, dann UID des Empfängers prüfen.
- Wenn Rechnungsnummer fehlt, Status = kritisch.
- Wenn Leistungsdatum fehlt, Status = kritisch oder Warnung, je nach Kontext.
- Wenn Umsatzsteuerbetrag mathematisch nicht zum Netto- und Bruttobetrag passt, Status = kritisch.

#### 5.1.7 Risiko-Engine

Die Risiko-Engine erkennt auffällige Situationen:

- Doppelte Rechnungsnummer beim selben Lieferanten
- gleicher Betrag und gleicher Lieferant innerhalb kurzer Zeit
- IBAN weicht von Lieferantenhistorie ab
- UID fehlt oder wirkt ungültig
- Lieferant ist unbekannt
- ungewöhnlich hoher Betrag im Vergleich zur Historie
- OCR-Confidence niedrig
- Rechnungsdatum liegt auffällig weit in der Vergangenheit oder Zukunft
- Dateiname oder Dokumentinhalt wirkt manipuliert
- Netto, USt und Brutto passen nicht zusammen

Die Risiko-Engine darf keine endgültige Betrugsbehauptung ausgeben. Sie darf nur Warnungen und Risikostufen erzeugen.

Formulierungen im UI:

- Gut: „Auffälligkeit erkannt: IBAN weicht von bisher gespeicherter Lieferanten-IBAN ab.“
- Nicht erlaubt: „Diese Rechnung ist Betrug.“

#### 5.1.8 Buchungsvorschlags-Engine

Die Engine schlägt Buchungsdaten vor:

- Lieferantenkonto
- Aufwandskonto
- Vorsteuerkonto
- Buchungstext
- Belegnummer
- Belegdatum
- Leistungsdatum
- Netto, USt, Brutto
- Steuercode
- Kostenstelle, falls bekannt

Die Vorschläge basieren auf:

- Lieferantenhistorie
- Artikel-/Leistungsbeschreibung
- Regeln des Unternehmens
- vorherigen Nutzerkorrekturen
- Kontenplan
- Steuersatz

Wichtig: Buchungsvorschläge sind Vorschläge. Sie dürfen nicht ohne Nutzerfreigabe endgültig exportiert oder gebucht werden.

#### 5.1.9 Export-Engine

Die Export-Engine erzeugt Zielformate für:

- BMD
- RZL
- domizil+
- Microsoft Dynamics 365 Business Central
- generisches CSV/XLSX-Format
- später DATEV-kompatible Formate, falls sinnvoll

Für jedes Zielsystem gibt es einen eigenen Exportadapter.

---

## 6. Entscheidung: Human-in-the-loop ist Pflicht

### Entscheidung

FinancePro darf im MVP keine Rechnung vollständig automatisch ohne Nutzerprüfung verbuchen.

### Begründung

Rechnungen betreffen Steuer, Buchhaltung, Vorsteuerabzug und Unternehmensrisiko. Fehler können finanzielle und rechtliche Folgen haben. Deshalb muss ein Mensch jede kritische Entscheidung prüfen können.

### Umsetzung

Jede Rechnung bekommt einen Status:

- Hochgeladen
- Scanqualität geprüft
- OCR abgeschlossen
- Daten extrahiert
- Formale Prüfung abgeschlossen
- Risikoanalyse abgeschlossen
- Buchungsvorschlag erstellt
- Warten auf Nutzerprüfung
- Freigegeben
- Exportiert
- Abgelehnt
- Manuelle Nachbearbeitung erforderlich

Export ist nur möglich, wenn:

- Mindestfelder vorhanden sind
- Nutzer die Rechnung freigegeben hat
- kritische Warnungen entweder gelöst oder bewusst übersteuert wurden
- Übersteuerung im Audit-Log dokumentiert wurde

---

## 7. Entscheidung: Keine direkte Steuerberatung durch KI

### Entscheidung

FinancePro gibt keine endgültige steuerliche Beratung. Das System liefert technische und formale Prüfhinweise.

### Nicht erlaubt

Die KI darf nicht schreiben:

- „Diese Rechnung ist steuerlich vollständig korrekt.“
- „Sie dürfen die Vorsteuer sicher abziehen.“
- „Diese Rechnung ist rechtsgültig.“
- „Sie müssen diese Rechnung so buchen.“
- „Diese Rechnung ist illegal.“

### Erlaubt

Das System darf schreiben:

- „Die formalen Pflichtangaben wurden anhand der erkannten Daten vollständig gefunden.“
- „Es wurde kein Leistungsdatum erkannt.“
- „Der erkannte Umsatzsteuerbetrag passt nicht zur Berechnung Netto × Steuersatz.“
- „Bitte durch Buchhaltung oder Steuerberatung prüfen lassen.“

---

## 8. Entscheidung: Prüfregeln versionieren

### Entscheidung

Alle Prüfregeln werden versioniert.

### Begründung

Gesetze, Schwellenwerte und technische Regeln können sich ändern. Eine Rechnung aus 2026 muss später nachvollziehbar mit dem damaligen Regelstand geprüft worden sein.

### Umsetzung

Jede Prüfung speichert:

- Regelset-Version
- Prüfdatum
- erkannte Felder
- angewendete Regeln
- Ergebnis pro Regel
- Nutzerkorrekturen
- finaler Status

Beispiel:

```json
{
  "rule_set": "AT_USTG_11_2026_01",
  "checked_at": "2026-05-13T10:15:00Z",
  "result": "warning",
  "failed_rules": ["AT_USTG_11_SERVICE_DATE_MISSING"]
}
```

---

## 9. Entscheidung: Mandantenfähige Architektur

### Entscheidung

FinancePro wird von Anfang an mandantenfähig gebaut.

### Begründung

Steuerberatungskanzleien können mehrere Firmen betreuen. Auch ein Unternehmen kann mehrere Gesellschaften haben. Daten dürfen niemals zwischen Mandanten vermischt werden.

### Umsetzung

Jede zentrale Datenbanktabelle enthält eine `tenant_id`.

Beispiele:

- users
- tenants
- companies
- invoices
- suppliers
- booking_suggestions
- exports
- audit_logs

Zugriff wird immer über Tenant-Kontext geprüft.

Nicht erlaubt:

- globale Rechnungsabfragen ohne Tenantfilter
- Lieferantenhistorie zwischen Mandanten ohne ausdrückliche Freigabe teilen
- KI-Training über Kundendaten ohne Einwilligung

---

## 10. Entscheidung: Datenschutz und Hosting

### Entscheidung MVP

Für den MVP ist eine sichere Cloud-Architektur erlaubt, aber mit klarer Vorbereitung auf spätere EU-/Österreich-Hosting-Optionen.

### Mindestanforderungen

- Transportverschlüsselung über HTTPS/TLS
- Verschlüsselung gespeicherter Dokumente
- getrennte Mandantendaten
- rollenbasierte Zugriffe
- Audit-Log
- Löschkonzept
- Exportierbarkeit der Kundendaten
- keine Nutzung von Kundendaten zum allgemeinen KI-Training ohne explizite Zustimmung

### Spätere Option

Für größere Kunden kann eine private Cloud oder On-Premise-Variante angeboten werden.

---

## 11. Entscheidung: Datenbank

### Entscheidung

Für den MVP wird PostgreSQL als Hauptdatenbank verwendet.

### Begründung

PostgreSQL ist stabil, relational, gut für Finanzdaten geeignet und unterstützt JSONB für flexible Extraktionsdaten.

### Datenhaltung

Strukturierte Daten:

- Rechnungsfelder
- Lieferanten
- Buchungsvorschläge
- Nutzer
- Rollen
- Mandanten
- Prüfresultate

Semistrukturierte Daten:

- OCR-Ergebnisse
- KI-Rohausgaben
- Confidence-Werte
- Regelengine-Details

Dateien:

- PDF und Bilddateien werden in Object Storage gespeichert.
- In der Datenbank liegt nur der sichere Verweis.

---

## 12. Entscheidung: Event-basierte Verarbeitung für Dokumentpipeline

### Entscheidung

Die Rechnungspipeline wird als asynchroner Job-Prozess gebaut.

### Begründung

OCR, KI-Extraktion und Risikoanalyse können länger dauern. Der Nutzer soll nicht in einem blockierenden Request warten müssen.

### Umsetzung

Nach Upload wird ein Job erzeugt:

1. `DOCUMENT_UPLOADED`
2. `QUALITY_CHECK_STARTED`
3. `QUALITY_CHECK_COMPLETED`
4. `OCR_STARTED`
5. `OCR_COMPLETED`
6. `EXTRACTION_STARTED`
7. `EXTRACTION_COMPLETED`
8. `LEGAL_CHECK_STARTED`
9. `LEGAL_CHECK_COMPLETED`
10. `RISK_ANALYSIS_COMPLETED`
11. `BOOKING_SUGGESTION_CREATED`

Geeignete Technologien:

- Queue: Redis Queue, RabbitMQ oder BullMQ
- Worker: Node.js, Python oder separate Services
- Statusupdates: Polling im MVP, später WebSocket/SSE

---

## 13. Entscheidung: API-first

### Entscheidung

Backend und Frontend kommunizieren über eine dokumentierte API.

### Begründung

Später können mobile App, Kanzleiportal, Integrationen oder externe Partner dieselbe API verwenden.

### API-Stil

Für MVP:

- REST API
- OpenAPI/Swagger Dokumentation

Später optional:

- Webhooks
- GraphQL für komplexe Dashboard-Abfragen
- direkte ERP-API-Anbindungen

---

## 14. Rollen- und Rechtekonzept

### Rollen

#### Owner

- Mandant erstellen
- Nutzer verwalten
- Systemeinstellungen ändern
- Exportziele konfigurieren
- alle Rechnungen sehen

#### Admin

- Nutzer einladen
- Regeln konfigurieren
- Lieferanten verwalten
- Exporte konfigurieren

#### Accountant / Buchhaltung

- Rechnungen hochladen
- Daten prüfen
- Buchungsvorschläge bearbeiten
- Rechnungen freigeben
- Export erzeugen

#### Reviewer / Prüfer

- Rechnungen ansehen
- Warnungen prüfen
- Freigaben erteilen oder ablehnen

#### Read-only

- Rechnungen ansehen
- Reports ansehen
- keine Änderungen

### Nicht erlaubt

- Jeder Nutzer darf alles
- Exporte ohne Berechtigung
- Löschen ohne Audit-Spur
- Adminaktionen ohne Protokollierung

---

## 15. Audit-Log-Entscheidung

### Entscheidung

Jede relevante Aktion wird unveränderbar protokolliert.

### Beispiele

- Upload einer Rechnung
- OCR abgeschlossen
- Feld durch KI erkannt
- Feld durch Nutzer geändert
- Warnung ignoriert
- Rechnung freigegeben
- Export erzeugt
- Export heruntergeladen
- Nutzerrolle geändert

### Audit-Felder

- timestamp
- tenant_id
- user_id
- action_type
- entity_type
- entity_id
- previous_value
- new_value
- reason/comment
- system_version
- rule_set_version

---

## 16. Export-Architektur

### Entscheidung

Exportziele werden über Adapter umgesetzt.

Interface:

```ts
interface ExportAdapter {
  systemName: string;
  validate(input: BookingExportInput): ExportValidationResult;
  generate(input: BookingExportInput): ExportFile | ExportPayload;
}
```

### Adapter

- `BmdExportAdapter`
- `RzlExportAdapter`
- `DomizilPlusExportAdapter`
- `BusinessCentralExportAdapter`
- `GenericCsvExportAdapter`

### Grundsatz

Die interne FinancePro-Datenstruktur bleibt unabhängig vom Zielsystem. Jeder Adapter übersetzt die internen Daten in das jeweilige Format.

---

## 17. KI-Grenzen

### Die KI darf

- Rechnungsfelder extrahieren
- Vorschläge machen
- Texte strukturieren
- mögliche Konten vorschlagen
- Warnungen sprachlich erklären
- Ähnlichkeiten zu früheren Buchungen erkennen

### Die KI darf nicht

- final entscheiden, ob eine Rechnung rechtlich gültig ist
- final entscheiden, ob Vorsteuer abziehbar ist
- ohne Regelengine Pflichtmerkmale bewerten
- Buchungen ohne Nutzerfreigabe exportieren
- fehlende Werte erfinden
- UID-Nummern oder IBANs erraten
- aus unsicheren OCR-Daten sichere Aussagen machen
- manipulierte Dokumente als Betrug bezeichnen
- sensible Daten für Training speichern, wenn keine Einwilligung existiert

---

## 18. Fehlerbehandlung

### Grundsatz

Fehler müssen sichtbar, verständlich und bearbeitbar sein.

Beispiele:

- OCR konnte Dokument nicht lesen
- Rechnung ist abgeschnitten
- Pflichtfeld nicht erkannt
- Beträge passen mathematisch nicht zusammen
- Exportadapter kann Datei nicht erzeugen
- Zielsystem erfordert ein Pflichtfeld, das fehlt

Jeder Fehler erhält:

- Fehlercode
- verständliche Nachricht
- technische Details für Entwickler
- Handlungsempfehlung für Nutzer

---

## 19. MVP-Architektur

### Enthalten im MVP

- Login
- Mandant anlegen
- Rechnung hochladen
- PDF/Bild-Verarbeitung
- Scanqualitätsprüfung basic
- OCR
- Extraktion zentraler Felder
- § 11 UStG-Prüfung basic
- Risikowarnungen basic
- Buchungsvorschlag basic
- manuelle Korrektur
- Export als CSV/XLSX
- erste Adapter für BMD/RZL als Datei-Export
- Audit-Log basic

### Nicht im MVP

- vollständige native iOS/Android-App
- vollautomatische Verbuchung über API
- Bankkontoabgleich
- Zahlungsfreigabe
- Mahnwesen
- Ausgangsrechnungen
- Lohnverrechnung
- vollständiges ERP
- automatische Steuerberatung
- KI-Training auf Kundendaten

---

## 20. Langfristige Architektur

Spätere Erweiterungen:

- direkte E-Mail-Postfach-Anbindung
- Lieferantenportal
- automatische Lieferantenstammdatenprüfung
- UID-Prüfung über offizielle Quellen
- Firmenbuch-/KSV-Risikocheck, wenn rechtlich und vertraglich möglich
- direkte Business-Central-API-Integration
- BMD/RZL tiefere Integration, falls Schnittstellenzugang vorhanden
- Kanzlei-Workflow mit Mandantenfreigabe
- mobile native Scan-App
- KI-Lernsystem aus Nutzerkorrekturen
- mehrsprachige Rechnungen
- Reverse-Charge-Sonderfälle
- innergemeinschaftliche Lieferungen
- Kleinbetragsrechnungen

---

## 21. Technologievorschlag

### Frontend

- React oder Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui oder eigenes FinancePro Designsystem
- TanStack Query
- Zod für Validierung

### Backend

- Node.js/NestJS oder Python/FastAPI
- PostgreSQL
- Redis Queue
- Object Storage
- OpenAPI

### OCR/KI

- MVP: Cloud OCR oder Tesseract plus KI-Extraktion
- KI: strukturiertes JSON mit Schema-Validierung
- Validierung: Zod/Pydantic

### Infrastruktur

- Docker
- CI/CD
- EU-Hosting
- getrennte Umgebungen: dev, staging, production

---

## 22. Sicherheitsentscheidungen

- Keine Rechnungsdaten in Logs schreiben
- Keine vollständigen IBANs in normalen Debug-Logs
- Zugriffstokens sicher speichern
- Rate Limiting
- Datei-Upload validieren
- Viren-/Malware-Scan für Uploads prüfen
- PDF-Sandboxing erwägen
- Rollenprüfung auf jeder API-Route
- Audit-Log für alle kritischen Aktionen

---

## 23. Quellen / fachliche Grundlage

- RIS: Umsatzsteuergesetz 1994 § 11, tagesaktuelle Fassung
- USP Österreich: Rechnung und umsatzsteuerliche Formerfordernisse
- WKO: Rechnung richtig ausstellen / Rechnungsmerkmale
- BMD: Hinweise zu FIBU-Standardschnittstellen und Importformaten
- RZL: FIBU Import Schnittstelle und RZL Format Buchungen
- Microsoft Learn: Dynamics 365 / Business Central / General Journal Import und Finance Journal Entities

---

## 24. Finale Architekturentscheidung

FinancePro wird als mandantenfähiges, API-first, human-in-the-loop System gebaut. Die KI unterstützt Extraktion, Erklärung und Vorschläge, aber die verbindliche Prüfung erfolgt über nachvollziehbare Regeln und die finale Freigabe durch den Nutzer. Exportadapter sorgen dafür, dass FinancePro mit bestehenden Buchhaltungssystemen zusammenarbeitet, ohne selbst eine vollständige Buchhaltungssoftware zu werden.

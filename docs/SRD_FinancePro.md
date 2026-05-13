# SRD – Software Requirements Document
# FinancePro – Technische Softwareanforderungen

**Projekt:** FinancePro  
**Version:** 1.0  
**Stand:** 13.05.2026  
**Erstellt für:** Dimitar Chalakov und Lisa Plaschka  
**Dokumenttyp:** Software Requirements Document

---

## 1. Zweck dieses Dokuments

Dieses SRD beschreibt die konkreten technischen Softwareanforderungen für FinancePro. Es ist so geschrieben, dass ein Entwicklerteam oder ein KI-Coding-Agent wie Codex daraus eine echte Anwendung planen und implementieren kann.

Das SRD beschreibt:

- Systemmodule
- Datenmodelle
- API-Endpunkte
- Verarbeitungslogik
- Validierungsregeln
- Fehlerfälle
- Rollen und Rechte
- Exportlogik
- Nicht-Ziele
- Akzeptanzkriterien

---

## 2. Systembeschreibung

FinancePro ist eine Webanwendung mit Backend, Datenbank, Dokumentverarbeitung, OCR/KI-Extraktion, Regelprüfung, Risikoanalyse und Exportgenerator.

Das System verarbeitet Eingangsrechnungen für österreichische Unternehmen. Es erzeugt aus unstrukturierten Dokumenten strukturierte Buchhaltungsdaten, prüft formale Rechnungsmerkmale und ermöglicht den Export in bestehende Buchhaltungssysteme.

---

## 3. Systemgrenzen

### FinancePro übernimmt

- Dokumentannahme
- Scanqualitätsprüfung
- OCR
- Rechnungsdatenextraktion
- formale Rechnungsprüfung
- Risikoanalyse
- Buchungsvorschlag
- Nutzerreview
- Exportdateien
- Audit-Logging

### FinancePro übernimmt nicht

- finale Steuerberatung
- finale Rechtsberatung
- automatische Zahlung
- Banktransaktionen
- Lohnverrechnung
- vollständige ERP-Funktionen
- automatische Buchung ohne Freigabe
- Garantien für Vorsteuerabzug

---

## 4. Technischer Zielaufbau

### 4.1 Frontend

Empfohlener Stack:

- Next.js oder React
- TypeScript
- Tailwind CSS
- shadcn/ui oder eigene Komponenten
- TanStack Query für Server State
- Zod für Formularvalidierung

### 4.2 Backend

Empfohlener Stack:

- NestJS mit TypeScript oder FastAPI mit Python
- REST API
- OpenAPI Dokumentation
- Worker-System für asynchrone Jobs

### 4.3 Datenbank

- PostgreSQL
- JSONB für OCR-/KI-Rohdaten
- relationale Tabellen für Rechnungen, Nutzer, Mandanten, Exporte

### 4.4 File Storage

- Object Storage für PDFs/Bilder
- lokale Speicherung nur in Entwicklungsumgebung
- produktiv verschlüsselte Speicherung

### 4.5 Queue / Jobs

- Redis Queue, BullMQ, Celery oder RabbitMQ
- getrennte Worker für OCR, Extraktion, Prüfung, Export

---

## 5. Hauptmodule

## 5.1 Auth-Modul

### Funktionen

- Registrierung
- Login
- Logout
- Passwort-Hashing
- Session-/Tokenverwaltung
- Einladung zu Mandant
- Rollenprüfung

### Anforderungen

- Passwörter niemals im Klartext speichern.
- JWT oder serverseitige Session sicher implementieren.
- Tokenablauf unterstützen.
- Brute-Force-Schutz einbauen.

### API-Beispiele

`POST /auth/register`  
`POST /auth/login`  
`POST /auth/logout`  
`POST /auth/invite`  
`GET /auth/me`

---

## 5.2 Tenant-Modul

### Funktionen

- Mandant erstellen
- Mandant bearbeiten
- Nutzer zu Mandant hinzufügen
- Rollen vergeben
- Exportziel konfigurieren

### Datenmodell: tenants

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  address TEXT,
  uid_number TEXT,
  default_currency TEXT DEFAULT 'EUR',
  default_export_system TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Datenmodell: tenant_users

```sql
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### Rollen

- OWNER
- ADMIN
- ACCOUNTANT
- REVIEWER
- READ_ONLY

---

## 5.3 Document-Modul

### Funktionen

- Datei hochladen
- Dateityp prüfen
- Datei speichern
- Dokumentstatus verwalten
- Seiten extrahieren
- Vorschau erzeugen

### Unterstützte Dateitypen MVP

- application/pdf
- image/png
- image/jpeg

### Einschränkungen MVP

- maximale Dateigröße konfigurierbar, z. B. 25 MB
- maximal 20 Seiten pro Dokument
- verschlüsselte PDFs werden abgelehnt oder als manuell erforderlich markiert

### Datenmodell: documents

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  page_count INT,
  status TEXT NOT NULL,
  quality_status TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Statuswerte

- UPLOADED
- QUALITY_CHECK_PENDING
- QUALITY_CHECK_FAILED
- OCR_PENDING
- OCR_COMPLETED
- EXTRACTION_COMPLETED
- CHECK_COMPLETED
- REVIEW_REQUIRED
- APPROVED
- EXPORTED
- REJECTED

---

## 5.4 Scan-Quality-Modul

### Ziel

Vor OCR soll erkannt werden, ob ein Scan oder Foto ausreichend gut ist.

### Prüfungen

- Blur Detection
- Helligkeit
- Kontrast
- Dokumentrand sichtbar
- vollständiges Blatt sichtbar
- Textbereich erkennbar
- perspektivische Verzerrung
- Rotation

### Datenmodell: document_quality_checks

```sql
CREATE TABLE document_quality_checks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,
  blur_score NUMERIC,
  brightness_score NUMERIC,
  contrast_score NUMERIC,
  edge_detection_score NUMERIC,
  completeness_score NUMERIC,
  result TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP NOT NULL
);
```

### Result-Werte

- ACCEPTED
- WARNING
- REJECTED

### Logik

Wenn Dokument abgeschnitten oder stark unscharf ist, darf OCR nicht als normaler Prozess weiterlaufen. Der Nutzer muss einen neuen Scan hochladen oder bewusst manuell fortsetzen.

---

## 5.5 OCR-Modul

### Funktionen

- Text aus PDF extrahieren
- OCR auf Bild/Scan ausführen
- Seitenweise Ergebnisse speichern
- Layoutinformationen speichern
- Confidence speichern

### Datenmodell: ocr_results

```sql
CREATE TABLE ocr_results (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,
  page_number INT NOT NULL,
  raw_text TEXT,
  layout_json JSONB,
  average_confidence NUMERIC,
  engine_name TEXT,
  engine_version TEXT,
  created_at TIMESTAMP NOT NULL
);
```

### Anforderungen

- OCR-Ergebnis muss reproduzierbar gespeichert werden.
- OCR-Engine und Version müssen gespeichert werden.
- Bei schlechter OCR-Confidence muss Review-Status gesetzt werden.

---

## 5.6 Invoice-Extraction-Modul

### Ziel

Aus OCR-Text und Layoutdaten werden strukturierte Rechnungsfelder erzeugt.

### Datenmodell: invoices

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  document_id UUID NOT NULL,
  supplier_id UUID,
  status TEXT NOT NULL,
  invoice_number TEXT,
  invoice_date DATE,
  service_date DATE,
  service_period_start DATE,
  service_period_end DATE,
  due_date DATE,
  currency TEXT DEFAULT 'EUR',
  net_amount NUMERIC(14,2),
  vat_amount NUMERIC(14,2),
  gross_amount NUMERIC(14,2),
  vat_rate NUMERIC(5,2),
  extraction_confidence NUMERIC,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Datenmodell: invoice_extracted_fields

```sql
CREATE TABLE invoice_extracted_fields (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_value TEXT,
  confidence NUMERIC,
  source_text TEXT,
  page_number INT,
  bounding_box JSONB,
  corrected_by_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Zu extrahierende Pflichtfelder

- supplier_name
- supplier_address
- supplier_uid
- customer_name
- customer_address
- customer_uid
- invoice_number
- invoice_date
- service_date oder service_period
- description
- net_amount
- vat_rate
- vat_amount
- gross_amount
- currency
- iban

### Schema-Validierung

KI-Ausgaben müssen gegen ein JSON-Schema validiert werden. Ungültige KI-Ausgaben dürfen nicht direkt gespeichert werden, sondern müssen als Fehler protokolliert werden.

---

## 5.7 Supplier-Modul

### Datenmodell: suppliers

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT,
  address TEXT,
  uid_number TEXT,
  default_iban TEXT,
  default_account_code TEXT,
  default_cost_center TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Datenmodell: supplier_bank_accounts

```sql
CREATE TABLE supplier_bank_accounts (
  id UUID PRIMARY KEY,
  supplier_id UUID NOT NULL,
  iban TEXT NOT NULL,
  bic TEXT,
  first_seen_invoice_id UUID,
  last_seen_at TIMESTAMP,
  is_default BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL
);
```

### IBAN-Status

- NEW
- KNOWN
- CHANGED
- BLOCKED
- VERIFIED

### Anforderungen

- Neue IBAN bei bekanntem Lieferanten erzeugt Warnung.
- IBAN-Wechsel darf nicht automatisch als sicher gelten.
- Nutzer kann IBAN als verifiziert markieren.

---

## 5.8 Legal-Check-Modul

### Ziel

Regelbasierte Prüfung der formalen Rechnungsmerkmale.

### Datenmodell: invoice_checks

```sql
CREATE TABLE invoice_checks (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  rule_set_version TEXT NOT NULL,
  overall_status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### Datenmodell: invoice_check_results

```sql
CREATE TABLE invoice_check_results (
  id UUID PRIMARY KEY,
  invoice_check_id UUID NOT NULL,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence JSONB,
  created_at TIMESTAMP NOT NULL
);
```

### Statuswerte pro Regel

- PASSED
- FAILED
- WARNING
- NOT_APPLICABLE
- NEEDS_MANUAL_REVIEW

### Severity

- INFO
- LOW
- MEDIUM
- HIGH
- CRITICAL

### Beispielregeln

#### AT_USTG11_SUPPLIER_NAME_REQUIRED

Wenn Lieferantenname fehlt, dann FAILED/HIGH.

#### AT_USTG11_SUPPLIER_ADDRESS_REQUIRED

Wenn Lieferantenadresse fehlt, dann FAILED/HIGH.

#### AT_USTG11_INVOICE_NUMBER_REQUIRED

Wenn Rechnungsnummer fehlt, dann FAILED/CRITICAL.

#### AT_USTG11_INVOICE_DATE_REQUIRED

Wenn Ausstellungsdatum fehlt, dann FAILED/HIGH.

#### AT_USTG11_SERVICE_DATE_REQUIRED

Wenn Leistungsdatum oder Leistungszeitraum fehlt, dann FAILED/HIGH.

#### AT_USTG11_AMOUNT_VAT_REQUIRED

Wenn Steuerbetrag bei steuerpflichtiger Rechnung fehlt, dann FAILED/HIGH.

#### AT_USTG11_CUSTOMER_UID_OVER_10000

Wenn Bruttobetrag über 10.000 EUR liegt und Empfänger-UID nicht erkannt wurde, dann WARNING oder FAILED je nach Konfiguration.

### Wichtig

Die Regelengine arbeitet mit erkannten Daten. Wenn OCR unsicher ist, muss Ergebnis „NEEDS_MANUAL_REVIEW“ möglich sein.

---

## 5.9 Mathematical-Validation-Modul

### Prüfungen

```text
net_amount + vat_amount == gross_amount
net_amount * vat_rate == vat_amount
sum(line_items.net_amount) == net_amount
sum(vat_groups.vat_amount) == vat_amount
```

### Toleranz

Konfigurierbar, z. B. 0,02 EUR.

### Fehlerfälle

- Beträge fehlen
- mehrere Steuersätze erkannt, aber nicht sauber gruppiert
- Rundungsdifferenz zu groß
- Bruttosumme stimmt nicht mit Positionen überein

---

## 5.10 Risk-Modul

### Datenmodell: invoice_risks

```sql
CREATE TABLE invoice_risks (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  risk_code TEXT NOT NULL,
  risk_category TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);
```

### Risikocodes

- DUPLICATE_INVOICE_NUMBER
- DUPLICATE_AMOUNT_SUPPLIER_DATE
- NEW_SUPPLIER
- SUPPLIER_IBAN_CHANGED
- LOW_OCR_CONFIDENCE
- MISSING_REQUIRED_FIELD
- VAT_CALCULATION_MISMATCH
- UNUSUAL_AMOUNT_FOR_SUPPLIER
- FUTURE_INVOICE_DATE
- VERY_OLD_INVOICE_DATE
- MULTIPLE_VAT_RATES_UNCLEAR

### Risikologik

Jedes Risiko muss Evidence speichern. Beispiel:

```json
{
  "current_iban": "AT...3201",
  "known_iban": "AT...1111",
  "supplier_id": "...",
  "previous_invoice_id": "..."
}
```

### Nicht erlaubt

- Risiko ohne Begründung anzeigen
- Betrug behaupten
- harte Ablehnung ohne Nutzeroption

---

## 5.11 Booking-Suggestion-Modul

### Datenmodell: booking_suggestions

```sql
CREATE TABLE booking_suggestions (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  status TEXT NOT NULL,
  booking_date DATE,
  document_date DATE,
  supplier_account TEXT,
  expense_account TEXT,
  tax_account TEXT,
  tax_code TEXT,
  cost_center TEXT,
  project_code TEXT,
  booking_text TEXT,
  net_amount NUMERIC(14,2),
  vat_amount NUMERIC(14,2),
  gross_amount NUMERIC(14,2),
  confidence NUMERIC,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Status

- GENERATED
- NEEDS_REVIEW
- EDITED_BY_USER
- APPROVED
- REJECTED

### Vorschlagsquellen

- supplier.default_account_code
- vergangene Rechnungen desselben Lieferanten
- Keyword-Mapping
- manuelle Regeln
- Standardkonten je Mandant

### Beispiel Keyword-Mapping

```json
{
  "telefon": "Telekommunikationsaufwand",
  "internet": "Telekommunikationsaufwand",
  "strom": "Energieaufwand",
  "büromaterial": "Büroaufwand",
  "software": "Softwareaufwand"
}
```

### Wichtig

Wenn Confidence niedrig ist, muss Status `NEEDS_REVIEW` sein.

---

## 5.12 Export-Modul

### Datenmodell: exports

```sql
CREATE TABLE exports (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  export_system TEXT NOT NULL,
  export_format TEXT NOT NULL,
  storage_key TEXT,
  status TEXT NOT NULL,
  validation_result JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### Export-Systeme

- GENERIC_CSV
- GENERIC_XLSX
- BMD
- RZL
- DOMIZIL_PLUS
- BUSINESS_CENTRAL

### Exportvalidierung

Vor Export:

- Rechnung existiert
- Nutzer hat Zugriff
- Rechnung ist freigegeben oder explizit exportierbar
- keine ungelösten kritischen Risiken
- Buchungsvorschlag vorhanden
- Pflichtfelder des Exportformats vorhanden

### Generisches Exportfeldset

- invoice_id
- supplier_name
- supplier_uid
- invoice_number
- invoice_date
- service_date
- booking_date
- booking_text
- supplier_account
- expense_account
- tax_code
- net_amount
- vat_amount
- gross_amount
- currency
- cost_center
- document_file_reference

### BMD-Adapter

Der BMD-Adapter soll interne Felder in ein BMD-orientiertes Importformat mappen. Im MVP genügt eine CSV/XLSX-Struktur, die später an echte BMD-Feldanforderungen angepasst werden kann.

### RZL-Adapter

Der RZL-Adapter soll interne Felder in ein RZL-orientiertes Importformat mappen. Besonderheit: Sammelkonten und Steuerkonten dürfen je nach Schnittstelle nicht falsch doppelt in der Importdatei enthalten sein. Zielsystemlogik muss pro Adapter dokumentiert werden.

### Business-Central-Adapter

Für Business Central soll zunächst ein Journal-Line-orientierter Export vorbereitet werden. Später kann eine API-Anbindung an General Journal Batches/Lines erfolgen.

### domizil+-Adapter

Für domizil+ muss im MVP ein generisches Mapping vorbereitet werden. Genaues Format muss durch Schnittstellendokumentation oder Herstellerkontakt bestätigt werden.

---

## 5.13 Review-Modul

### UI-Anforderungen

Die Review-Seite besteht aus:

- Dokumentviewer links
- Feldpanel rechts
- Warnungsbereich oben
- Checklistenbereich
- Buchungsvorschlag
- Exportbereich
- Audit-Timeline

### Aktionen

- Feld bearbeiten
- Feld als korrekt markieren
- Warnung lösen
- Warnung akzeptieren
- Kommentar hinzufügen
- Rechnung freigeben
- Rechnung ablehnen
- Export erzeugen

### Validierung

Beim Speichern eines Feldes:

- Datentyp prüfen
- Pflichtfeldstatus aktualisieren
- abhängige Regeln neu ausführen
- Audit-Log schreiben

---

## 5.14 Audit-Modul

### Datenmodell: audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  comment TEXT,
  system_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL
);
```

### Aktionen

- DOCUMENT_UPLOADED
- OCR_COMPLETED
- EXTRACTION_COMPLETED
- FIELD_CORRECTED
- RULE_CHECK_COMPLETED
- RISK_CREATED
- RISK_RESOLVED
- BOOKING_SUGGESTION_CREATED
- BOOKING_SUGGESTION_EDITED
- INVOICE_APPROVED
- INVOICE_REJECTED
- EXPORT_CREATED
- USER_ROLE_CHANGED

---

## 6. API-Anforderungen

## 6.1 Invoice APIs

### `POST /invoices/upload`

Upload einer Rechnung.

Input:

- multipart file
- tenant_id

Output:

```json
{
  "document_id": "uuid",
  "invoice_id": "uuid",
  "status": "UPLOADED"
}
```

### `GET /invoices`

Liste aller Rechnungen für Mandant.

Filter:

- status
- risk_level
- supplier
- date_from
- date_to
- export_status

### `GET /invoices/{id}`

Detailansicht mit:

- Rechnungsdaten
- extrahierte Felder
- Checkresultate
- Risiken
- Buchungsvorschlag
- Audit-Log

### `PATCH /invoices/{id}/fields`

Felder manuell korrigieren.

### `POST /invoices/{id}/approve`

Rechnung freigeben.

### `POST /invoices/{id}/reject`

Rechnung ablehnen.

---

## 6.2 Risk APIs

### `GET /invoices/{id}/risks`

Gibt alle Risiken der Rechnung zurück.

### `POST /risks/{id}/resolve`

Markiert Risiko als gelöst.

Input:

```json
{
  "resolution_comment": "IBAN wurde telefonisch mit Lieferant bestätigt."
}
```

### `POST /risks/{id}/accept`

Akzeptiert Risiko bewusst.

---

## 6.3 Booking APIs

### `GET /invoices/{id}/booking-suggestion`

Buchungsvorschlag abrufen.

### `PATCH /booking-suggestions/{id}`

Buchungsvorschlag bearbeiten.

### `POST /booking-suggestions/{id}/approve`

Buchungsvorschlag freigeben.

---

## 6.4 Export APIs

### `POST /invoices/{id}/exports`

Export erstellen.

Input:

```json
{
  "export_system": "BMD",
  "format": "CSV"
}
```

Output:

```json
{
  "export_id": "uuid",
  "status": "CREATED",
  "download_url": "signed-url"
}
```

### `GET /exports/{id}/download`

Exportdatei herunterladen.

---

## 7. Verarbeitungspipeline

### Pipeline-Schritte

1. Upload
2. Dokumentvalidierung
3. Qualitätsprüfung
4. OCR
5. KI-Extraktion
6. Schema-Validierung
7. Rechnungsobjekt erstellen/aktualisieren
8. Lieferant matchen
9. mathematische Prüfung
10. § 11 Regelprüfung
11. Risikoanalyse
12. Buchungsvorschlag
13. Review erforderlich
14. Freigabe
15. Export

### Pseudocode

```pseudo
onDocumentUploaded(document):
  validateFile(document)
  quality = runQualityCheck(document)

  if quality.result == REJECTED:
    setStatus(document, QUALITY_CHECK_FAILED)
    notifyUser()
    stop

  ocrResult = runOCR(document)
  extracted = extractInvoiceFields(ocrResult)
  validateExtractionSchema(extracted)

  invoice = createOrUpdateInvoice(extracted)
  supplier = matchOrCreateSupplier(invoice)

  runMathValidation(invoice)
  runLegalChecks(invoice)
  runRiskAnalysis(invoice)
  createBookingSuggestion(invoice)

  setStatus(invoice, REVIEW_REQUIRED)
```

---

## 8. Validierungsregeln

## 8.1 Dateivalidierung

- Dateityp muss erlaubt sein.
- Datei darf nicht leer sein.
- Datei darf maximale Größe nicht überschreiten.
- PDF darf nicht verschlüsselt sein, außer manueller Modus.

## 8.2 Feldvalidierung

- Datum muss parsebar sein.
- Rechnungsnummer darf nicht leer sein.
- Beträge müssen numerisch sein.
- Währung muss ISO-Code sein.
- UID-Format für Österreich plausibel: ATU + Ziffernstruktur.
- IBAN-Format muss plausibel sein.

## 8.3 Buchungsvalidierung

- Buchungsdatum vorhanden
- Belegnummer vorhanden
- Konto vorhanden oder Review required
- Betrag > 0
- Steuerlogik plausibel

---

## 9. KI-Anforderungen

### 9.1 Input an KI

Die KI erhält:

- OCR-Text
- Layoutdaten, falls vorhanden
- Seiteninformationen
- gewünschtes JSON-Schema
- klare Anweisung: keine Werte erfinden

### 9.2 Output der KI

Nur JSON. Kein Fließtext.

```json
{
  "fields": {
    "invoice_number": {
      "value": "RE-2026-001",
      "confidence": 0.94,
      "source_text": "Rechnung Nr. RE-2026-001"
    }
  }
}
```

### 9.3 KI darf nicht

- halluzinieren
- steuerliche Endentscheidungen treffen
- fehlende Werte schätzen
- Formatregeln ignorieren
- mehrere mögliche Werte ohne Unsicherheit als eindeutig ausgeben

### 9.4 KI-Fallback

Wenn KI-Ausgabe ungültig ist:

- Fehler speichern
- Retry mit stärker eingeschränktem Prompt
- wenn erneut ungültig: manuelle Prüfung

---

## 10. Fehlercodes

### Dokumentfehler

- DOC_INVALID_TYPE
- DOC_TOO_LARGE
- DOC_ENCRYPTED_PDF
- DOC_CORRUPTED
- DOC_TOO_MANY_PAGES

### Qualitätsfehler

- QUALITY_TOO_BLURRY
- QUALITY_PAGE_CUT_OFF
- QUALITY_TOO_DARK
- QUALITY_NO_DOCUMENT_DETECTED

### OCR-Fehler

- OCR_FAILED
- OCR_LOW_CONFIDENCE
- OCR_NO_TEXT_FOUND

### Extraktionsfehler

- EXTRACTION_SCHEMA_INVALID
- EXTRACTION_REQUIRED_FIELDS_MISSING
- EXTRACTION_MULTIPLE_INVOICES_DETECTED

### Prüfungsfehler

- CHECK_MISSING_INVOICE_NUMBER
- CHECK_MISSING_SERVICE_DATE
- CHECK_VAT_MISMATCH
- CHECK_MISSING_SUPPLIER_ADDRESS

### Exportfehler

- EXPORT_MISSING_REQUIRED_FIELD
- EXPORT_UNSUPPORTED_SYSTEM
- EXPORT_VALIDATION_FAILED
- EXPORT_FILE_GENERATION_FAILED

---

## 11. Security Requirements

### Auth

- Passwort Hashing mit bcrypt/argon2
- sichere Session Cookies oder JWT mit kurzer Laufzeit
- Refresh Token sicher speichern
- Rate Limiting

### API

- jede Route prüft tenant_id und Rolle
- keine fremden IDs zugänglich
- Inputvalidierung auf allen Endpunkten
- CORS restriktiv

### Dateien

- Uploadgrößenlimit
- MIME-Type prüfen
- Dateiendung nicht allein vertrauen
- Malware-Scan prüfen
- PDFs sicher rendern

### Logs

Nicht loggen:

- vollständige Rechnungsinhalte
- vollständige IBANs
- Passwörter
- Tokens
- personenbezogene Daten unnötig

---

## 12. Datenschutzanforderungen

- Mandantendaten strikt trennen
- Löschung von Rechnungen ermöglichen, soweit rechtlich zulässig
- Export aller eigenen Daten ermöglichen
- KI-Anbieter dürfen Kundendaten nicht für Training nutzen, wenn keine Zustimmung existiert
- EU-Hosting bevorzugt
- Verarbeitungsverzeichnis vorbereiten

---

## 13. Testanforderungen

### Unit Tests

- Betragsprüfung
- UID-Formatprüfung
- IBAN-Formatprüfung
- Regelengine
- Risikoengine
- Exportmapping

### Integration Tests

- Upload → OCR → Extraktion → Prüfung
- Rechnung mit fehlender Nummer
- Rechnung mit falscher USt
- Rechnung mit doppelter Rechnungsnummer
- Rechnung mit neuer IBAN
- Export mit fehlendem Pflichtfeld

### E2E Tests

- Nutzer lädt Rechnung hoch
- System erkennt Felder
- Nutzer korrigiert Feld
- Warnung wird aktualisiert
- Buchungsvorschlag wird freigegeben
- Export wird erzeugt

---

## 14. Beispiel-Akzeptanzszenarien

### Szenario 1: Gute PDF-Rechnung

Gegeben eine klare PDF-Rechnung mit allen Pflichtangaben.  
Wenn der Nutzer sie hochlädt.  
Dann soll FinancePro die Kernfelder erkennen, keine kritischen Warnungen anzeigen und einen Buchungsvorschlag erzeugen.

### Szenario 2: Fehlendes Leistungsdatum

Gegeben eine Rechnung ohne Leistungsdatum.  
Wenn die Prüfung ausgeführt wird.  
Dann soll eine Warnung oder kritische Meldung angezeigt werden.  
Und Export darf nur nach Nutzerentscheidung erfolgen.

### Szenario 3: Doppelte Rechnungsnummer

Gegeben eine vorhandene Rechnung mit derselben Nummer und demselben Lieferanten.  
Wenn eine zweite Rechnung hochgeladen wird.  
Dann muss das System eine kritische Doppelungswarnung anzeigen.

### Szenario 4: Neue IBAN

Gegeben ein bekannter Lieferant mit gespeicherter IBAN.  
Wenn eine neue Rechnung desselben Lieferanten eine andere IBAN enthält.  
Dann muss das System eine Warnung anzeigen und Nutzerbestätigung verlangen.

### Szenario 5: Schlechter Scan

Gegeben ein unscharfes Foto.  
Wenn es hochgeladen wird.  
Dann soll das System den Scan ablehnen oder als schlechte Qualität markieren und keine sichere Extraktion behaupten.

---

## 15. Entwicklungsreihenfolge

### Sprint 1 – Foundation

- Projektsetup
- Auth
- Tenantmodell
- Datenbank
- Upload
- Dokumentstatus

### Sprint 2 – OCR und Extraktion

- OCR-Service
- OCR-Ergebnisspeicherung
- KI-Extraktion
- JSON-Schema
- erste Reviewansicht

### Sprint 3 – Prüfengine

- Pflichtmerkmale-Regeln
- mathematische Prüfung
- Statusmodell
- Warnungen

### Sprint 4 – Risiko und Buchung

- Risikoengine
- Lieferantenmatching
- Buchungsvorschlag
- Nutzerkorrektur

### Sprint 5 – Export und Audit

- CSV/XLSX Export
- BMD/RZL-Mapping basic
- Audit-Log
- Freigabeprozess

### Sprint 6 – UI Polish und Beta

- Dashboard
- Filter
- Fehlerbehandlung
- Testdaten
- Beta-Deployment

---

## 16. Definition of Done

Eine Funktion gilt als fertig, wenn:

- Backend implementiert
- Frontend nutzbar
- API validiert
- Fehlerfälle behandelt
- Rollenrechte geprüft
- Audit-Log geschrieben, falls relevant
- Tests vorhanden
- keine sensiblen Daten unnötig geloggt
- Nutzerfeedback verständlich

---

## 17. Offene technische Fragen

- Welcher OCR-Anbieter wird für MVP genutzt?
- Soll MVP lokal, EU-Cloud oder hybrid laufen?
- Welche genauen BMD/RZL-Feldformate werden zuerst unterstützt?
- Gibt es Zugang zu domizil+ Schnittstellendokumentation?
- Soll Business Central zuerst über Datei oder API angebunden werden?
- Welche Kontenpläne werden standardmäßig unterstützt?
- Wie detailliert sollen Positionen im MVP extrahiert werden?

---

## 18. Quellen / fachliche Grundlage

- RIS: Umsatzsteuergesetz 1994 § 11
- USP Österreich: Rechnung und umsatzsteuerliche Formerfordernisse
- WKO: Rechnungsmerkmale und Rechnung richtig ausstellen
- BMD: FIBU Standardschnittstellen und Importmöglichkeiten
- RZL: FIBU Import Schnittstelle / RZL Format Buchungen
- Microsoft Learn: General Journal Import / Dynamics 365 Finance und Business Central Grundlagen

---

## 19. Zusammenfassung

Das SRD definiert FinancePro als kontrolliertes, nachvollziehbares und modulares System. Die wichtigste technische Leitlinie lautet: KI darf helfen, aber nicht heimlich entscheiden. Jede Rechnung muss transparent verarbeitet werden, jede Warnung muss erklärbar sein und jeder Export muss auf freigegebenen Daten basieren.

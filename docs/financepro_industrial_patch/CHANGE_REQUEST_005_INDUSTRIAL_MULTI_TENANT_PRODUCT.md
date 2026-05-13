# CHANGE REQUEST 005 – FinancePro Industrial Mode, Multi-Tenant Accounts, Licenses & Accountant Workflow

## 1. Ziel dieses Change Requests
FinancePro soll von einem MVP/Demo-Rechnungsviewer zu einem industriell verwendbaren SaaS-Produkt für österreichische Unternehmen, Buchhalterinnen/Buchhalter und Steuerberatungskanzleien weiterentwickelt werden.

Der aktuelle Stand zeigt bereits Upload, AI-Analyse, Dokumentseiten, Confidence, Validierung, Buchungsvorschlag und Export-Grundlagen. Die App wirkt aber noch zu technisch und zu sehr wie ein Entwicklungs-MVP. Für einen echten Firmenbetrieb fehlen:

- Mandanten-/Firmenstruktur
- Benutzerkonten mit Rollen
- Lizenz-/Seat-Verwaltung
- Admin-Bereich für den Anbieter FinancePro
- Firma-spezifische Datenisolierung
- einfache Bedienung für nicht-technische Buchhalter
- klare Inbox-/Review-/Freigabe-/Export-Workflows
- bessere echte Dokumentvorschau statt Mock-Seitenkarten
- weniger technische AI-/OCR-Begriffe in der normalen Nutzeroberfläche
- bessere AI-Pipeline für gescannte PDFs/Fotos
- klarer Speicherort pro Firma
- Audit, Berechtigungen, Kostenkontrolle und Support-Funktionen

## 2. Ausgangslage im bestehenden Projekt
Das bestehende Projekt ist ein Next.js/TypeScript MVP mit Prisma, SQLite, OpenAI, Zod, Tailwind, Vitest und bereits vorhandenen Seiten wie Dashboard, Upload, Rechnungen, Invoice Detail, Exports und Settings.

Wichtige bereits vorhandene Grundkonzepte, die erhalten und verbessert werden sollen:

- Upload von PDF/JPG/PNG
- AI-Provider-Schicht
- GPT-4o-mini / Mock-Modus
- Rechnungsdetailseite
- InvoicePage, InvoiceExtractedField, InvoiceLineItem
- ValidationResult, RiskIndicator
- BookingSuggestion
- ExportRecord
- AuditLog
- Export für CSV/JSON

Wichtig: Bestehendes Projekt nicht löschen und nicht neu von Null anfangen. Bestehende Services verwenden, aber professionell umbauen.

## 3. Produktziel nach diesem Patch
FinancePro soll nach dem Patch wie ein echtes B2B-SaaS-System funktionieren:

1. FinancePro-Betreiber loggt sich als Super Admin ein.
2. Super Admin erstellt eine Firma/Mandantin.
3. Super Admin legt Lizenzpaket, Anzahl Seats und erlaubte Module fest.
4. Super Admin erstellt Nutzerkonten für diese Firma.
5. Firma erhält Username/Passwort oder Einladung.
6. Nutzer loggen sich ein.
7. Nutzer sehen nur Daten ihrer eigenen Firma.
8. Buchhalter lädt Rechnungen hoch.
9. FinancePro erkennt Dokumente, liest Daten aus und erstellt Review-Aufgaben.
10. Buchhalter prüft nur die unklaren Felder.
11. Reviewer/Freigeber gibt Rechnungen frei.
12. Export wird pro Firma und Zielsystem erstellt.
13. Admin kann Nutzer, Lizenzen, Firmenordner, Nutzung und Fehler überwachen.

## 4. Nicht-Ziele
Folgende Dinge dürfen NICHT eingebaut werden oder sollen bewusst entfernt/versteckt werden:

- keine öffentlich sichtbare Spielerei/Demo-Seite im Produktbereich
- keine technisch überladene UI für normale Buchhalter
- keine Anzeige von AI-Rohdaten im Standard-Workflow
- keine separate „Risiken“-Hauptseite, wenn Risiken sinnvoll im Rechnungsreview angezeigt werden können
- keine offene Datenansicht über alle Firmen für normale Nutzer
- keine globale Rechnungsliste für normale Nutzer
- keine automatische Buchung oder Export ohne Freigabe
- keine harte Kopplung an eine einzige Firma oder demo-tenant
- keine Speicherung von Uploads aller Firmen in einem gemeinsamen unstrukturierten Ordner
- keine fixe Feldpositionen bei Rechnungen
- keine erfundenen Werte durch KI
- keine endgültige Steuerberatungsaussage
- keine UI-Begriffe wie „Zod“, „Provider“, „JSON Schema“, „OCR-Auszug“ für normale User
- keine Account-Erstellung durch Kunden selbst im MVP, wenn der Betreiber die Accounts vergeben will

## 5. Neuer Ziel-Workflow für den Buchhalter
Der normale User soll nicht über Technik nachdenken. Er sieht nur:

### 5.1 Rechnungseingang
- Button: „Rechnungen hochladen“
- Drag & Drop
- Mehrere Dateien gleichzeitig
- Fortschritt
- Status: Wird gelesen, Prüfung nötig, Bereit zur Freigabe, Exportiert

### 5.2 Prüfqueue
Eine Inbox mit Spalten:
- Lieferant
- Rechnungsnummer
- Datum
- Betrag
- Status
- Probleme
- Zuständig
- Aktion

Status-Beispiele:
- Neu
- Wird analysiert
- Prüfung nötig
- Fehler gefunden
- Bereit zur Freigabe
- Freigegeben
- Exportiert
- Abgelehnt / Duplikat

### 5.3 Rechnung prüfen
Die Detailseite soll zweigeteilt sein:

Links:
- echte Dokumentvorschau
- Seiten-Thumbnails
- Zoom
- Öffnen in großem Viewer
- PDF/Bild herunterladen/öffnen

Rechts:
- die wichtigsten Felder gruppiert
- Lieferant
- Kunde
- Rechnungsdaten
- Beträge/Steuern
- Positionen
- Hinweise/Fehler
- Buchungsvorschlag
- Freigabe-/Export-Buttons

Der User muss mit möglichst wenigen Klicks erkennen:
- Was wurde erkannt?
- Was fehlt?
- Was muss ich korrigieren?
- Kann ich freigeben?
- Kann ich exportieren?

### 5.4 Freigabe
Regeln:
- Buchhalter kann vorbereiten.
- Reviewer/Manager kann freigeben.
- Export nur nach Freigabe oder je nach Firmenregel.
- Alles wird im Audit Log gespeichert.

### 5.5 Export
Der User wählt:
- BMD
- RZL
- Business Central
- CSV/JSON generic

Exportpaket enthält:
- Buchungsdatei
- Metadaten
- Originalbeleg oder Link/Referenz
- Exportprotokoll

## 6. Multi-Tenant Struktur
FinancePro muss strikt zwischen Firmen trennen.

### 6.1 Tenant/Firma
Jede Firma hat:
- id
- name
- slug
- legalName
- address
- vatId / UID
- billingEmail
- defaultCurrency
- defaultExportTarget
- licensePlan
- maxUsers
- maxInvoicesPerMonth
- storageLimitMb
- aiMonthlyBudgetCents optional
- active/inactive/suspended status
- createdAt/updatedAt

### 6.2 User
Jeder User gehört zu genau einer Firma, außer Super Admins.

User-Felder:
- id
- tenantId nullable for platform super admin
- email
- username
- passwordHash
- displayName
- role
- status
- lastLoginAt
- mustChangePassword
- createdBy
- createdAt/updatedAt

### 6.3 Rollen
System-Rollen:

1. SUPER_ADMIN
   - gehört zu FinancePro-Betreiber
   - sieht alle Firmen
   - erstellt Firmen
   - erstellt Nutzer
   - vergibt Lizenzen
   - sieht Nutzung/Kosten/Fehler
   - darf keine Kundendaten unnötig öffnen; Zugriff muss auditierbar sein

2. TENANT_ADMIN
   - Admin innerhalb einer Firma
   - verwaltet Nutzer der eigenen Firma
   - sieht Lizenznutzung der eigenen Firma
   - setzt Firmenregeln und Exportziel

3. ACCOUNTANT
   - lädt Rechnungen hoch
   - prüft und korrigiert Rechnungsdaten
   - erstellt Buchungsvorschläge
   - kann je nach Einstellung freigeben oder nur vorbereiten

4. REVIEWER
   - prüft vorbereitete Rechnungen
   - gibt Rechnungen frei oder lehnt ab
   - sieht keine Platform-Admin-Funktionen

5. VIEWER
   - nur Lesen
   - kein Upload
   - keine Korrektur
   - kein Export

Optional später:
- TAX_ADVISOR
- EXTERNAL_AUDITOR
- API_USER

## 7. Lizenz- und Account-Workflow
Der MVP soll folgenden Vertriebsprozess unterstützen:

1. Kunde kauft FinancePro.
2. Betreiber erstellt Firma im Admin-Bereich.
3. Betreiber wählt Lizenzpaket:
   - Starter
   - Professional
   - Kanzlei
   - Enterprise
4. Betreiber setzt:
   - Anzahl Accounts/Seats
   - monatliches Dokumentlimit
   - Speicherlimit
   - AI-Budgetlimit
   - erlaubte Exportziele
5. Betreiber erstellt Nutzer.
6. Nutzer bekommt Username + temporäres Passwort.
7. Beim ersten Login muss Passwort geändert werden.
8. Firma kann danach arbeiten.

## 8. Große Environment-Ebene und User-Ebene
Der Nutzer hat beschrieben:
„Es gibt einmal ein großes Env für alle User von der Firma und einmal nur für den einzelnen User.“

Das wird so umgesetzt:

### 8.1 Tenant Settings / Firmenumgebung
Gilt für alle Nutzer der Firma:
- Firmenname
- UID
- Standard-Exportziel
- Standard-Kontenrahmen/Vorlagen
- Standard-Kostenstellen
- erlaubte Exportformate
- Freigaberegeln
- Betragsschwellen
- AI-Modus
- Sprache
- Belegnummernlogik
- Lieferantenstammdaten
- IBAN-Vertrauensliste
- E-Mail-Eingang später

### 8.2 User Settings / persönliche Umgebung
Gilt nur für einzelnen Nutzer:
- Anzeigename
- Sprache
- Theme
- bevorzugte Tabellenansicht
- Standardfilter
- Benachrichtigungen
- zuletzt geöffnete Firma nur bei Super Admin
- persönliche Review-Queue

## 9. Speicherstruktur pro Firma
Uploads dürfen nicht mehr nur in einem gemeinsamen Ordner liegen.

Neue Struktur:

uploads/
  tenants/
    {tenantSlug}/
      invoices/
        {invoiceId}/
          original.pdf
          page-001.png
          page-002.png
          preview.jpg
          ai-input.json
          export/
            bmd-export.csv
            metadata.json

Regeln:
- Dateipfade nie direkt aus Userinput zusammensetzen.
- tenantSlug normalisieren.
- Zugriff immer über tenantId prüfen.
- Keine Datei darf über URL erreichbar sein, wenn User nicht berechtigt ist.
- Download/Preview nur über geschützte API-Route.

## 10. UI-Aufräumung
Entfernen/verstecken für normale User:
- technische AI-Rohdaten
- rohe OCR-Auszüge als Hauptinhalt
- Provider-/Schema-Begriffe
- unnötige separate technische Seiten
- überladene Sidebar

Neue Hauptnavigation für normale Firmenuser:
- Eingang
- Hochladen
- Prüfung
- Freigaben
- Exporte
- Lieferanten
- Einstellungen

Neue Navigation für Super Admin:
- Übersicht
- Firmen
- Nutzer
- Lizenzen
- Nutzung & Kosten
- Systemfehler
- Audit
- Support-Login/Impersonation mit Audit

## 11. Dokumentvorschau / Invoice View
Die aktuelle Ansicht zeigt Karten, die eher wie generische Page-Signale aussehen. Das soll geändert werden.

Neue Anforderungen:
- echte PDF/Bild-Vorschau anzeigen
- Thumbnails links
- ausgewählte Seite groß anzeigen
- Klick öffnet Vollbild-Viewer
- Zoom +/−
- Seitenwechsel
- Download Original
- Rotationsbutton
- „Feld im Dokument anzeigen“ später optional
- Page Quality nur als kleiner Hinweis, nicht als Hauptinhalt

Wenn echte PDF-Rendering technisch nicht sofort möglich ist:
- Original-PDF in iframe/object anzeigen
- Bilder direkt anzeigen
- Thumbnails aus PDF später nachrüsten
- kein Fake-Dokument als Ersatz anzeigen, wenn echtes Dokument vorhanden ist

## 12. Bessere AI-Usage
Die AI soll im Hintergrund stärker werden, aber die UI einfacher.

### 12.1 AI Pipeline Ziel
- Dokument vorbereiten
- Bildqualität verbessern
- PDF-Seiten rendern oder original als File Input senden
- GPT-4o mini für Extraktion verwenden
- JSON strikt validieren
- deterministische Regeln prüfen
- nur unsichere Felder dem User hervorheben

### 12.2 AI darf nicht
- Werte erfinden
- Beträge runden ohne Kennzeichnung
- Freigabe durchführen
- Export automatisch auslösen
- Steuerberatung ersetzen
- Daten anderer Firmen sehen

### 12.3 Verbesserungen
- mehrere Seiten gemeinsam als zusammenhängende Rechnung analysieren
- Positionen über Seiten zusammenführen
- Endsumme auf letzter Seite erkennen
- Fußzeilen mit UID/IBAN/BIC/FN auslesen
- Rabatte erkennen
- 0,00 USt + Begründung erkennen
- Confidence je Feld speichern
- bei niedriger Confidence Review erzwingen

## 13. Buchhalterisch notwendige Funktionen
Für echte Nutzung braucht ein Buchhalter weniger technische Details und mehr Arbeitslogik:

- Rechnungseingang
- Duplikatsprüfung
- Lieferantenerkennung
- UID/IBAN-Plausibilität
- Netto/USt/Brutto-Prüfung
- Leistungsdatum/Rechnungsdatum prüfen
- Kostenstelle optional
- Aufwandskonto vorschlagen
- Freigabestatus
- Exportstatus
- OP-/Zahlungsreferenz optional
- Zahlungsziel erkennen
- Belegbild speichern
- Audit-Trail
- Filter nach Status, Lieferant, Betrag, Zeitraum

Unnötig für MVP:
- komplizierte AI-Debugseiten für User
- vollständige Zahlungsabwicklung
- Bankanbindung
- automatisches Mahnwesen
- vollständiges ERP
- komplette Steuerberatung
- komplexes DMS mit Versionierung über alle Dokumenttypen

## 14. Sicherheitsanforderungen
- Passwort-Hashing mit bcrypt/argon2
- Sessions über sichere Cookies
- CSRF-Schutz bei Mutationen
- serverseitige Zugriffskontrolle bei jeder API-Route
- tenantId darf nicht vom Client vertraut werden
- jeder Query muss tenant-scoped sein
- Super Admin Aktionen müssen auditierbar sein
- Datei-Download muss Zugriff prüfen
- keine OpenAI API Keys im Client
- keine Kundendaten in Browser Console loggen

## 15. Akzeptanzkriterien
Nach Umsetzung muss gelten:

- Super Admin kann sich einloggen.
- Super Admin kann Firma erstellen.
- Super Admin kann Lizenz/Seats setzen.
- Super Admin kann Nutzer für Firma erstellen.
- User von Firma A sieht keine Daten von Firma B.
- Uploads werden pro Firma in getrennten Ordnern gespeichert.
- Normale User sehen keine Admin-Plattformseiten.
- Rechnungsvorschau zeigt echtes Dokument oder echtes Bild/PDF, kein Fake-Placeholder.
- Rechnungsreview ist einfacher und weniger technisch.
- AI-Analyse funktioniert über GPT-4o mini oder Mock fallback.
- Ohne OpenAI Key crasht die App nicht.
- Export ist erst nach Review/Freigabe möglich.
- Build, Typecheck, Lint und Tests laufen erfolgreich.

# PRD PATCH 005 – FinancePro als industrielles Buchhalter-Produkt

## 1. Produktvision
FinancePro wird ein B2B-SaaS für österreichische Rechnungseingangsverarbeitung. Das Produkt soll Buchhalterinnen und Buchhaltern die tägliche Arbeit mit Eingangsrechnungen erleichtern, ohne dass sie technisches Wissen über AI, OCR oder Datenformate brauchen.

Der Nutzer soll denken:

> „Ich lade Rechnungen hoch, kontrolliere nur die markierten Stellen und exportiere sauber in unser Buchhaltungssystem.“

## 2. Zielgruppen

### 2.1 Primäre Zielgruppe
- Buchhalter in österreichischen KMU
- interne Buchhaltungsabteilungen
- Steuerberatungskanzleien mit mehreren Mandanten
- Geschäftsführer kleiner Firmen, die Belege vorbereiten wollen

### 2.2 Sekundäre Zielgruppe
- externe Reviewer/Freigeber
- Kanzleimitarbeiter
- FinancePro-Betreiber/Super Admin

## 3. Kernproblem
Buchhalter bekommen Rechnungen in vielen Layouts:
- PDF
- Scan
- Foto
- Mehrseitenrechnung
- Kostenvorschreibung
- Mietrechnung
- Rechnung mit Rabatten
- Rechnung ohne USt wegen Sonderfall

Manuelle Arbeit:
- Daten suchen
- Rechnungsnummer erfassen
- Lieferant erkennen
- UID/IBAN prüfen
- Netto/USt/Brutto kontrollieren
- Positionen verstehen
- Duplikate vermeiden
- Freigabe einholen
- Export vorbereiten

FinancePro soll diese Schritte strukturieren und automatisieren, aber die finale Kontrolle beim Menschen lassen.

## 4. Produktprinzipien

1. Einfachheit vor Technik
   - Normale User sehen keine technischen Debugbegriffe.
   - AI arbeitet im Hintergrund.

2. Mensch entscheidet
   - Keine automatische Freigabe.
   - Keine automatische Buchung.
   - Keine automatische Steuerberatung.

3. Nachvollziehbarkeit
   - Jeder erkannte Wert hat Quelle, Confidence und Audit.

4. Firmenisolation
   - Firma A darf nie Daten von Firma B sehen.

5. Industrielle Bedienung
   - Inbox, Status, Review, Freigabe, Export.

6. Korrekturfreundlich
   - User korrigiert direkt im Feld.
   - System lernt später optional aus Korrekturen.

## 5. Hauptmodule

### 5.1 Login & Account
Funktionen:
- Login mit Username oder E-Mail + Passwort
- Passwort ändern beim ersten Login
- Logout
- Session Handling
- Rollenbasierte Navigation

Nicht nötig im MVP:
- Self-Service Registrierung
- Social Login
- SSO/SAML
- 2FA, kann später kommen

### 5.2 Super Admin Bereich
Nur für FinancePro-Betreiber.

Seiten:
- `/admin` Dashboard
- `/admin/tenants` Firmenliste
- `/admin/tenants/new` Firma erstellen
- `/admin/tenants/[id]` Firma verwalten
- `/admin/users` Nutzer über alle Firmen
- `/admin/licenses` Lizenzpakete
- `/admin/usage` AI-, Upload- und Speicherverbrauch
- `/admin/audit` Plattform-Audit
- `/admin/system` Fehler/Health

Funktionen:
- Firma erstellen/bearbeiten/deaktivieren
- Seats festlegen
- Lizenzpaket wählen
- erlaubte Module wählen
- Nutzer erstellen
- temporäres Passwort erzeugen
- User aktivieren/deaktivieren
- Support-Zugriff nur mit Audit

### 5.3 Firmen-/Tenant Admin Bereich
Für Admins innerhalb einer Firma.

Seiten:
- Firmenprofil
- Nutzer der Firma
- Rollen
- Lizenznutzung
- Export-Einstellungen
- Kontierungsvorlagen
- Lieferantenstamm
- Freigaberegeln

### 5.4 Rechnungseingang
Zentrale Arbeitsseite für Buchhalter.

Route: `/app/inbox`

Funktionen:
- Liste aller Rechnungen der eigenen Firma
- Filter: Status, Lieferant, Datum, Betrag, Zuständig, Risiko
- Suche
- Batch-Aktionen: erneut analysieren, zuweisen, archivieren
- klare Status-Badges

Spalten:
- Beleg
- Lieferant
- Rechnungsnummer
- Datum
- Betrag
- Status
- Probleme
- Zuständig
- Aktion

### 5.5 Upload
Route: `/app/upload`

Funktionen:
- Drag & Drop
- Mehrfachupload
- PDF/JPG/PNG
- direkte Zuordnung zur Firma des Users
- Upload in Firmenordner
- Anzeige der Upload-Liste
- automatische Erstellung von Invoice Records
- Analyse optional automatisch nach Upload oder per Button, je nach Firmenregel

### 5.6 Rechnungsdetail / Review
Route: `/app/invoices/[id]`

Layout:
- Links: Dokumentviewer
- Rechts: Review Panel

Bereiche:
1. Kopfdaten
2. Lieferant
3. Kunde
4. Beträge & Steuer
5. Positionen
6. Hinweise & Fehler
7. Buchungsvorschlag
8. Freigabe & Export
9. Verlauf

User-Aktionen:
- Feld korrigieren
- Feld bestätigen
- Kommentar hinzufügen
- Rechnung als Duplikat markieren
- Rechnung freigeben
- Rechnung zurückweisen
- Export erstellen

### 5.7 Freigaben
Route: `/app/approvals`

Funktionen:
- Liste aller Rechnungen, die Freigabe brauchen
- Betragsschwellen
- Vier-Augen-Prinzip optional
- Freigabe/Ablehnung mit Kommentar

### 5.8 Exporte
Route: `/app/exports`

Funktionen:
- Exporthistorie
- Download Exportpakete
- Zielsystem auswählen
- BMD/RZL/Business Central/Generic CSV/JSON
- Exportstatus

### 5.9 Lieferanten
Route: `/app/vendors`

Funktionen:
- Lieferantenliste aus Rechnungen
- UID
- IBAN
- letzte Rechnung
- Vertrauensstatus
- Warnung bei neuer IBAN
- Standard-Aufwandskonto
- Standard-Kostenstelle

## 6. Rollen und Rechte

| Feature | SUPER_ADMIN | TENANT_ADMIN | ACCOUNTANT | REVIEWER | VIEWER |
|---|---|---|---|---|---|
| Firmen erstellen | Ja | Nein | Nein | Nein | Nein |
| Lizenzen setzen | Ja | Nein | Nein | Nein | Nein |
| Nutzer global verwalten | Ja | Nein | Nein | Nein | Nein |
| Nutzer der eigenen Firma verwalten | Ja | Ja | Nein | Nein | Nein |
| Upload | Support/Audit | Ja | Ja | Nein/optional | Nein |
| Rechnung prüfen | Support/Audit | Ja | Ja | Ja | Lesen |
| Rechnung freigeben | Nein/Support | Ja | optional | Ja | Nein |
| Export erstellen | Nein/Support | Ja | Ja nach Regel | Nein | Nein |
| Daten anderer Firmen sehen | Ja mit Audit | Nein | Nein | Nein | Nein |

## 7. Statusmodell Rechnung

Invoice Status:
- uploaded
- analyzing
- review_required
- validation_failed
- ready_for_approval
- approval_requested
- approved
- rejected
- export_ready
- exported
- archived

Review Status:
- not_started
- in_progress
- needs_correction
- completed

AI Status:
- not_started
- queued
- processing
- completed
- failed
- fallback_mock

Export Status:
- blocked
- ready
- generated
- downloaded
- failed

## 8. Was aus der Website entfernt oder vereinfacht werden soll

### Entfernen/verstecken für normale User
- technische OCR-Auszug-Boxen als zentrale Anzeige
- Seitenkarten mit „Schärfe 86%“ als Hauptnavigation
- AI Provider Details
- Raw JSON
- interne Debug-Status
- zu viele Hauptmenüpunkte
- Settings-Seite mit technischen Implementierungsdetails

### Behalten, aber anders anzeigen
- Confidence: als Ampel/Review-Hinweis, nicht als AI-Debug
- Page Quality: klein im Dokumentviewer
- Audit: als Verlauf, nicht als Entwicklerlog
- Risiken: als „Hinweise“ direkt im Review

## 9. AI UX
Statt „AI/OCR“ soll der User sehen:

- „Dokument wird gelesen …“
- „3 Felder brauchen Prüfung“
- „Summe stimmt“
- „Neue IBAN erkannt“
- „Leistungsdatum fehlt“

Nicht:
- „Zod validation failed“
- „Provider error“
- „JSON parse exception“
- „OpenAI File Input error“

Technische Fehler gehen in Admin/Systemlogs.

## 10. Erfolgskriterien

Nach Umsetzung ist FinancePro produktnah, wenn:
- ein nicht-technischer Buchhalter Rechnungen ohne Erklärung hochladen und prüfen kann
- Admin Firmen und Nutzer anlegen kann
- Lizenzlimits greifen
- Firmen komplett getrennt sind
- echte Dokumente als Vorschau sichtbar sind
- Invoice Review schneller und klarer ist
- Export erst nach Kontrolle möglich ist
- AI besser erkennt und Unsicherheit sauber markiert


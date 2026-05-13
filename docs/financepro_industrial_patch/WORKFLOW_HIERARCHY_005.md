# FinancePro Workflow & Hierarchy 005

## 1. Platform Hierarchy

FinancePro Platform
└── Super Admins
    ├── create tenants / companies
    ├── create licenses / seat limits
    ├── create initial users
    ├── monitor usage
    └── support with audit

Tenant / Company X
├── Tenant Admin
│   ├── manage company settings
│   ├── manage company users within seat limit
│   ├── define export target
│   ├── define approval rules
│   └── manage vendor defaults
├── Accountant
│   ├── upload invoices
│   ├── review extracted fields
│   ├── correct invoice data
│   ├── prepare booking suggestion
│   └── create export if allowed
├── Reviewer
│   ├── approve invoices
│   ├── reject invoices
│   └── add comments
└── Viewer
    └── read-only access to approved/exported invoices

## 2. Sales-to-Activation Workflow

1. Firma X will FinancePro nutzen.
2. FinancePro-Betreiber verhandelt Preis und Accountanzahl.
3. Super Admin erstellt Firma X.
4. Super Admin wählt Lizenz:
   - Plan
   - Anzahl Seats
   - Dokumentlimit
   - AI Budget
   - Exportmodule
5. Super Admin erstellt Benutzer.
6. System erzeugt temporäre Passwörter.
7. Betreiber sendet Login-Daten an Firma X.
8. Nutzer loggen sich ein und ändern Passwort.
9. Firma X verwendet FinancePro.

## 3. Company Data Environment

Tenant Environment / Firmenumgebung:
- gilt für alle User einer Firma
- enthält Firmenprofil, Exportziel, Kontenlogik, Freigaberegeln, Lieferantenstamm, Limits

User Environment / persönliche Umgebung:
- gilt nur für einen User
- enthält Sprache, Ansicht, Filter, Benachrichtigungen, persönliche Queue

## 4. Invoice Workflow

### 4.1 Standard Path
Upload
→ Analyse
→ Review nur bei offenen Punkten
→ Buchungsvorschlag
→ Freigabe
→ Export
→ Archiv

### 4.2 Exception Path
Upload
→ Analyse
→ Fehler/Warnung
→ User korrigiert
→ erneute Prüfung
→ wenn ok: Freigabe
→ wenn nicht ok: Ablehnen / Rückfrage / Archivieren

### 4.3 Duplicate Path
Upload
→ Duplikat erkannt
→ User sieht Vergleich
→ Als Duplikat markieren oder trotzdem weiterprüfen

### 4.4 No-Tax/Special Case Path
Upload
→ AI erkennt 0,00 USt + Grund
→ System markiert Sonderfall
→ nicht automatisch Fehler
→ Review bestätigt
→ Export mit Sondersteuerlogik

## 5. Accountant Screen Flow

### Login
User sieht direkt:
- offene Prüfungen
- neue Uploads
- Freigaben
- Exportbereit

### Inbox
Priorität:
1. Fehlerhafte Rechnungen
2. Rechnungen mit niedriger Confidence
3. Freigabe wartend
4. Exportbereit

### Review
User sieht:
- Dokument links
- Felder rechts
- rote/orange Hinweise oben
- grüner Status, wenn alles passt

### Export
User sieht:
- Zielsystem
- Vorschau
- Exportdatei
- Download

## 6. What a Non-Technical User Should Never Need to Know

Der Buchhalter muss nicht wissen:
- welches Modell genutzt wird
- was ein Token ist
- was Zod ist
- was JSON ist
- was ein Provider ist
- wo Dateien technisch liegen
- was ein Stacktrace ist

Er muss nur wissen:
- Rechnung hochladen
- markierte Felder prüfen
- freigeben
- exportieren

## 7. Minimum Industrial Product Navigation

Normal User:
- Eingang
- Hochladen
- Freigaben
- Exporte
- Lieferanten
- Einstellungen

Tenant Admin extra:
- Nutzer
- Firma
- Regeln

Super Admin:
- Firmen
- Nutzer
- Lizenzen
- Nutzung
- Audit
- System

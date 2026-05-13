Du bist Senior Full-Stack Engineer, SaaS Architect, Product Engineer und Security Engineer.

Ich habe bereits ein bestehendes FinancePro-Projekt auf GitHub/lokal. Es ist ein Next.js/TypeScript MVP mit Prisma, SQLite, OpenAI/gpt-4o-mini, Upload, Rechnungsdetailseite, Validierung, Risiken, Buchungsvorschlag und Export.

Ziel dieses Prompts:
Baue FinancePro jetzt in „Industrial Mode“ um: Multi-Tenant, Accounts, Lizenz/Seats, Super Admin, Firmen-Admin, echter Buchhalter-Workflow, bessere AI-Pipeline, bessere Dokumentvorschau, strikte Datenisolation und weniger unnötige/technische UI.

WICHTIG:
Nicht neu von Null beginnen. Bestehendes Projekt analysieren, sauber umbauen, vorhandene Services wiederverwenden, aber professionell machen.

LIES ZUERST ALLE DOKUMENTE IM docs-ORDNER, INSBESONDERE:
- ADR_FinancePro.md
- PRD_FinancePro.md
- SRD_FinancePro.md
- CHANGE_REQUEST_005_INDUSTRIAL_MULTI_TENANT_PRODUCT.md
- PRD_PATCH_005_INDUSTRIAL_ACCOUNTANT_PRODUCT.md
- SRD_PATCH_005_MULTI_TENANT_SECURITY_AI_IMPLEMENTATION.md
- WORKFLOW_HIERARCHY_005.md
- QA_TEST_PLAN_005_INDUSTRIAL_MODE.md

Falls ältere Patch-Dateien vorhanden sind, betrachte 005 als höchste Priorität und aktuellste Version.

====================================================================
1. AKTUELLES PROBLEM
====================================================================
Die App funktioniert bisher wie ein MVP:
- zu technisch
- keine echten Accounts
- kein Super Admin
- keine Firmen/Mandantenstruktur
- keine Lizenz/Seat-Verwaltung
- Rechnungsansicht wirkt wie OCR/Page-Debug statt echte Dokumentvorschau
- User sieht zu viele technische Signale
- Daten sind nicht sauber pro Firma getrennt
- Workflow ist noch nicht wie in echter Buchhaltung

Ziel:
Ein echter Buchhalter soll ohne technisches Wissen arbeiten können.

====================================================================
2. PRODUKT-WORKFLOW
====================================================================
Implementiere folgenden Produktablauf:

1. FinancePro-Betreiber loggt sich als SUPER_ADMIN ein.
2. SUPER_ADMIN erstellt Firma/Tenant.
3. SUPER_ADMIN setzt Lizenzpaket, Seat-Anzahl, Limits und erlaubte Module.
4. SUPER_ADMIN erstellt Nutzer für diese Firma.
5. Nutzer bekommt Username/Passwort.
6. Nutzer loggt sich ein und ändert bei erstem Login Passwort.
7. Nutzer sieht nur Daten seiner Firma.
8. Nutzer lädt Rechnungen hoch.
9. AI liest Daten aus.
10. System prüft § 11 UStG, Summen, Sonderfälle, Duplikate.
11. Buchhalter korrigiert nur markierte Felder.
12. Reviewer/Freigeber gibt frei.
13. Export wird erstellt.

====================================================================
3. ROLLEN
====================================================================
Baue Rollen ein:

SUPER_ADMIN:
- FinancePro Betreiber
- sieht Admin Bereich
- erstellt Firmen
- erstellt Nutzer
- verwaltet Lizenzen
- sieht Nutzung/Kosten/Systemfehler
- Support-Zugriff auf Kundendaten nur mit Audit

TENANT_ADMIN:
- Admin einer Firma
- verwaltet eigene Firmenuser innerhalb Seat-Limit
- setzt Firmenregeln
- setzt Exportziel

ACCOUNTANT:
- lädt Rechnungen hoch
- prüft/korrigiert Daten
- erstellt Buchungsvorschläge
- exportiert, wenn erlaubt

REVIEWER:
- prüft und genehmigt Rechnungen
- lehnt Rechnungen ab

VIEWER:
- nur Lesen

====================================================================
4. DATENMODELL
====================================================================
Erweitere Prisma Schema sauber und formatiert.

Füge mindestens hinzu:
- Tenant
- User
- TenantSetting
- UserSetting
- LicenseEvent
- UsageRecord
- PlatformAuditLog
- Vendor

Erweitere bestehende Models:
- Invoice mit Tenant Relation, uploadedByUserId, assignedToUserId, approvedByUserId, approvedAt, rejectedAt, originalFileName, originalMimeType, storageRoot, documentPreviewPath, currentWorkflowStep
- InvoicePage mit echten Preview/Thumbnail/File Pfaden
- AuditLog mit tenantId und actorUserId
- ExportRecord mit tenantId und createdByUserId

Wichtig:
- tenantId darf nicht nur Deko sein.
- Jede kundenbezogene Abfrage muss tenant-scoped sein.
- Keine normale User-Abfrage darf Daten anderer Firmen sehen.

====================================================================
5. AUTHENTIFIZIERUNG
====================================================================
Baue einfache, stabile Auth.

Anforderungen:
- Login mit username/email + password
- Passwort Hashing mit bcryptjs oder argon2
- httpOnly Session Cookie
- Logout
- Change Password
- mustChangePassword beim ersten Login
- getCurrentSession Helper
- requireUser, requireRole, requireSuperAdmin

Routen:
- /login
- /change-password
- /logout oder API logout

API:
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/change-password
- GET /api/auth/me

Keine API Keys oder Passwörter im Client loggen.

====================================================================
6. ADMIN-BEREICH
====================================================================
Baue Super Admin Bereich:

Routen:
- /admin
- /admin/tenants
- /admin/tenants/new
- /admin/tenants/[id]
- /admin/users
- /admin/licenses
- /admin/usage
- /admin/audit
- /admin/system

Funktionen:
- Firma erstellen
- Firma bearbeiten/deaktivieren
- Lizenzplan wählen
- maxUsers setzen
- maxInvoicesPerMonth setzen
- storageLimitMb setzen
- aiMonthlyBudgetCents setzen
- Nutzer erstellen
- temporäres Passwort anzeigen/generieren
- User deaktivieren
- Nutzung anzeigen
- Systemfehler anzeigen

Wichtig:
Normale Firmenuser dürfen /admin nie sehen.

====================================================================
7. FIRMEN-APP-BEREICH
====================================================================
Baue normalen App-Bereich für Firmenuser.

Routen:
- /app/inbox
- /app/upload
- /app/invoices/[id]
- /app/approvals
- /app/exports
- /app/vendors
- /app/settings

Leite alte Routen sinnvoll weiter:
- /dashboard -> /app/inbox
- /invoices -> /app/inbox
- /upload -> /app/upload
- /exports -> /app/exports
- /settings -> /app/settings

Sidebar normaler User:
- Eingang
- Hochladen
- Freigaben
- Exporte
- Lieferanten
- Einstellungen

Topbar:
- Firmenname
- Username
- Rolle
- Logout

====================================================================
8. LIZENZEN UND LIMITS
====================================================================
Implementiere LicenseService.

Limits:
- maxUsers
- maxInvoicesPerMonth
- storageLimitMb
- aiMonthlyBudgetCents optional
- allowedExportTargets optional

Bei Limit-Überschreitung:
- Userfreundliche Fehlermeldung
- kein Crash
- Audit/Event speichern

====================================================================
9. STORAGE PRO FIRMA
====================================================================
Uploads müssen pro Firma gespeichert werden:

uploads/tenants/{tenantSlug}/invoices/{invoiceId}/original/original.pdf
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/pages/page-001.png
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/thumbs/page-001.jpg
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/exports/{exportId}/...

Erstelle TenantStorageService:
- createInvoiceFolder
- saveOriginalFile
- getProtectedFileStream
- savePagePreview
- saveThumbnail

Wichtig:
- niemals public uploads für vertrauliche Kundendokumente
- Download/Preview nur über geschützte API Routes
- Zugriff immer tenant-scoped prüfen

API:
- POST /api/app/invoices/upload
- GET /api/app/invoices/[id]/file/original
- GET /api/app/invoices/[id]/file/page/[pageNumber]
- GET /api/app/invoices/[id]/file/thumb/[pageNumber]

====================================================================
10. DOKUMENTVORSCHAU VERBESSERN
====================================================================
Die aktuelle Ansicht zeigt Seitenkarten und Text wie:
„Lokale PDF-Text/OCR-Extraktion ist nicht verlässlich...“
Das ist für Buchhalter ungeeignet.

Neue Detailseite:
- Links echte Dokumentvorschau
- Rechts Review Panel

Dokumentviewer:
- PDF im object/iframe anzeigen
- JPG/PNG als Bild anzeigen
- Klick auf Vorschau öffnet große Ansicht
- Button „Original öffnen“
- Button „Herunterladen“
- Zoom +/− für Bilder
- Seitenliste/Thumbnails
- Page Quality nur klein anzeigen, nicht zentral

Wenn echtes PDF vorhanden ist:
- kein Fake-Dokument anzeigen
- kein generischer OCR-Auszug als Hauptinhalt

Komponenten:
- components/document/document-viewer.tsx
- components/document/document-thumbnail-list.tsx
- components/document/document-toolbar.tsx
- components/invoice/invoice-review-panel.tsx

====================================================================
11. UI AUFRÄUMEN
====================================================================
Entferne/verstecke für normale User:
- Raw JSON
- Zod Errors
- Provider Details
- technische OCR-Auszüge als Hauptbox
- AI Debug Sprache
- Page Signals als Hauptinhalt
- unnötige Seiten wie separate Risiko-Seite, wenn Risiken im Review besser sind

Stattdessen:
- „3 Felder brauchen Prüfung“
- „Summe stimmt“
- „Leistungsdatum fehlt“
- „Neue IBAN erkannt“
- „Bereit zur Freigabe“

Technische Details nur im Admin/System Bereich.

====================================================================
12. RECHNUNGSDETAIL / REVIEW PANEL
====================================================================
Invoice Detail Layout:

Left 55%:
- DocumentViewer

Right 45%:
- Status Summary
- Tabs:
  1. Überblick
  2. Felder
  3. Positionen
  4. Prüfung
  5. Buchung
  6. Verlauf

Felder müssen inline editierbar sein:
- value
- confidence as simple badge
- source page
- source text on hover/expand
- confirmed/corrected status

Buttons:
- Analyse erneut starten mit Kostenwarnung
- Als geprüft markieren
- Freigabe anfordern
- Freigeben
- Ablehnen
- Export erstellen

====================================================================
13. AI PIPELINE UPGRADE
====================================================================
Behalte GPT-4o-mini als Standardmodell.

.env:
OPENAI_API_KEY=
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0
AI_MAX_OUTPUT_TOKENS=8000
AI_MAX_PAGES_PER_ANALYSIS=8
AI_USE_MOCK_WHEN_KEY_MISSING=true

Verbessere:
- DocumentPreparationService
- OpenAIInvoiceProvider
- AI Schema
- AI Prompt
- Fehlerbehandlung

AI soll:
- mehrseitige PDFs verstehen
- Endsumme auf letzter Seite erkennen
- Positionen über Seiten zusammenführen
- Fußzeilen mit UID/IBAN/BIC/FN erkennen
- Rabatt erkennen
- 0,00 USt + Grund erkennen
- Confidence + sourcePage + sourceText pro Feld liefern

AI darf NICHT:
- Werte erfinden
- automatisch freigeben
- automatisch exportieren
- Steuerberatung ersetzen

Bei Fehler:
- invoice.aiStatus = failed
- review_required setzen
- userfreundliche Fehlermeldung
- technischer Fehler nur Admin/Systemlog

====================================================================
14. ACCOUNTING WORKFLOW SERVICES
====================================================================
Erstelle/verbessere:

src/lib/invoice/workflow/invoice-workflow-service.ts
- markUploaded
- startAnalysis
- completeAnalysis
- markReviewRequired
- completeReview
- requestApproval
- approveInvoice
- rejectInvoice
- markExportReady
- markExported

src/lib/vendors/vendor-service.ts
- findOrCreateVendorFromInvoice
- detectNewIbanForVendor
- updateVendorDefaults
- getTenantVendors

src/lib/license/license-service.ts
- canCreateUser
- canUploadInvoice
- canRunAiAnalysis
- recordUsage
- enforceStorageLimit

src/lib/auth/session.ts
src/lib/auth/permissions.ts
src/lib/db/tenant-scope.ts
src/lib/storage/tenant-storage-service.ts

====================================================================
15. EXPORT WORKFLOW
====================================================================
Export darf nur möglich sein, wenn:
- Rechnung geprüft
- keine blockierenden Fehler
- falls erforderlich freigegeben
- User Rolle erlaubt Export
- Lizenz erlaubt Zielsystem

Export Records tenant-scoped speichern.
Exportdateien in Firmenordner speichern.

Zielsysteme:
- BMD
- RZL
- Business Central
- Generic CSV
- Generic JSON

UI zeigt:
- Exportvorschau
- Status
- Download
- Exportprotokoll

====================================================================
16. SEED DATA
====================================================================
Seed muss erstellen:

Super Admin:
- email: admin@financepro.local
- username: admin
- password: Admin123!
- role: SUPER_ADMIN
- mustChangePassword: false

Tenant 1:
- Austria Wirtschaftsservice Gesellschaft mbH Demo
- users:
  - tenantadmin@aws-demo.local / Tenant123!
  - accountant@aws-demo.local / User123!
  - reviewer@aws-demo.local / User123!

Tenant 2:
- Testfirma Handwerk GmbH
- eigene User
- eigene Rechnungen

Wichtig:
Tenant 1 User dürfen Tenant 2 Rechnungen nicht sehen.

====================================================================
17. TESTS
====================================================================
Erstelle Tests für:
- Auth permissions
- Tenant isolation
- License limits
- Workflow transitions
- Storage path generation
- Export blocked before approval
- Viewer cannot upload
- Accountant cannot access admin
- AI fallback without key
- 0,00 USt special case

====================================================================
18. README AKTUALISIEREN
====================================================================
README muss enthalten:
- Installation
- env setup
- Seed logins
- Rollenmodell
- Tenant-Konzept
- Upload Storage Konzept
- OpenAI Setup
- Mock Mode
- wichtigste Routen
- Commands
- Security Hinweise

====================================================================
19. AKZEPTANZKRITERIEN
====================================================================
Am Ende muss funktionieren:

- App startet lokal
- Super Admin Login funktioniert
- Super Admin kann Firma erstellen
- Super Admin kann Nutzer erstellen
- Lizenz Seat Limit funktioniert
- User Login funktioniert
- User sieht nur eigene Firma
- User kann Rechnung hochladen
- Upload landet im Firmenordner
- Invoice Detail zeigt echte Dokumentvorschau
- AI Analyse funktioniert oder Mock Fallback ohne Crash
- Review Panel ist einfach und nicht technisch
- Rechnung kann geprüft/freigegeben/exportiert werden
- Export ist vor Freigabe blockiert
- Tenant A kann Tenant B Dateien nicht öffnen
- typecheck/lint/test/build laufen erfolgreich

====================================================================
20. AUSFÜHRUNG
====================================================================
Arbeite direkt im Projekt.
Installiere nur notwendige Dependencies.
Ändere bestehende Dateien sauber.
Lösche keine wichtigen Dateien ohne Grund.
Führe am Ende aus:

npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run typecheck
npm run lint
npm run test
npm run build

Behebe alle Fehler.

Gib am Ende eine kurze Zusammenfassung:
- was geändert wurde
- welche Logins existieren
- welche Routen neu sind
- welche Tests laufen
- was noch Mock/Limitierung ist

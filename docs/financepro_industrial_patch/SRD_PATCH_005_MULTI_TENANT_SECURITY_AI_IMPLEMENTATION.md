# SRD PATCH 005 – Technische Umsetzung: Multi-Tenant, Accounts, Lizenzen, Admin, Dokumentviewer, AI Upgrade

## 1. Technisches Ziel
Das bestehende FinancePro Next.js/TypeScript Projekt soll zu einer multi-tenant SaaS-Anwendung erweitert werden.

Prioritäten:
1. Datenmodell auf Firmen/Tenants und User erweitern
2. Authentifizierung und Rollen einbauen
3. Zugriff strikt tenant-scoped machen
4. Upload-Dateien pro Tenant speichern
5. UI für Accountant Workflow vereinfachen
6. Super Admin und Tenant Admin Bereiche bauen
7. Dokumentviewer mit echter Vorschau bauen
8. AI-Pipeline robust machen
9. Tests für Security und Workflow ergänzen

## 2. Architektur-Regeln

### 2.1 Tenant Isolation
Jede Datenbankabfrage auf kundenbezogene Daten muss tenantId verwenden.

Beispiele:
- Invoice.findMany: immer where: { tenantId: session.tenantId }
- Invoice.findUnique: zusätzlich tenantId prüfen
- ExportRecord: über Invoice tenant scopen oder eigenes tenantId Feld setzen
- File serving: tenantId über DB prüfen, nicht aus URL vertrauen

### 2.2 Server-first Security
- Keine Berechtigung nur im Frontend prüfen.
- Jede API Route prüft Session, Role und Tenant.
- Client darf tenantId nicht frei setzen.
- tenantId kommt aus Session.

### 2.3 Keine Datenlecks
- Keine Uploads aus public/ ausliefern.
- Upload-Preview über API Route streamen.
- Keine absoluten Serverpfade im Client anzeigen.
- Keine OpenAI API Responses mit sensiblen Daten in Console loggen.

## 3. Datenmodell Erweiterung Prisma

Die bestehende schema.prisma ist aktuell einzeilig und enthält Invoice mit tenantId als String. Das muss sauber formatiert und erweitert werden.

### 3.1 Neue Models

model Tenant {
  id String @id @default(cuid())
  name String
  slug String @unique
  legalName String?
  uidNumber String?
  address String?
  billingEmail String?
  defaultCurrency String @default("EUR")
  defaultExportTarget String @default("generic_csv")
  status String @default("active")
  licensePlan String @default("starter")
  maxUsers Int @default(3)
  maxInvoicesPerMonth Int @default(100)
  storageLimitMb Int @default(1024)
  aiMonthlyBudgetCents Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users User[]
  invoices Invoice[]
  settings TenantSetting[]
  usageRecords UsageRecord[]
  auditLogs PlatformAuditLog[]
}

model User {
  id String @id @default(cuid())
  tenantId String?
  email String @unique
  username String @unique
  passwordHash String
  displayName String
  role String
  status String @default("active")
  mustChangePassword Boolean @default(true)
  lastLoginAt DateTime?
  createdByUserId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant? @relation(fields: [tenantId], references: [id])
  userSettings UserSetting[]
}

model TenantSetting {
  id String @id @default(cuid())
  tenantId String
  key String
  valueJson String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@unique([tenantId, key])
}

model UserSetting {
  id String @id @default(cuid())
  userId String
  key String
  valueJson String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, key])
}

model LicenseEvent {
  id String @id @default(cuid())
  tenantId String
  eventType String
  oldValueJson String?
  newValueJson String?
  actorUserId String?
  createdAt DateTime @default(now())
}

model UsageRecord {
  id String @id @default(cuid())
  tenantId String
  period String
  invoicesUploaded Int @default(0)
  aiAnalyses Int @default(0)
  aiInputTokens Int @default(0)
  aiOutputTokens Int @default(0)
  storageUsedMb Float @default(0)
  estimatedAiCostCents Int @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@unique([tenantId, period])
}

model PlatformAuditLog {
  id String @id @default(cuid())
  tenantId String?
  actorUserId String?
  action String
  targetType String?
  targetId String?
  description String
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  tenant Tenant? @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
  @@index([actorUserId])
}

model Vendor {
  id String @id @default(cuid())
  tenantId String
  name String
  normalizedName String
  uidNumber String?
  iban String?
  bic String?
  address String?
  defaultExpenseAccount String?
  defaultCostCenter String?
  trustStatus String @default("unknown")
  lastInvoiceAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@index([tenantId, normalizedName])
}

### 3.2 Bestehende Models erweitern
Invoice:
- tenantId muss Relation zu Tenant werden
- uploadedByUserId String?
- assignedToUserId String?
- approvedByUserId String?
- approvedAt DateTime?
- rejectedByUserId String?
- rejectedAt DateTime?
- rejectionReason String?
- originalFileName String?
- originalMimeType String?
- storageRoot String?
- documentPreviewPath String?
- currentWorkflowStep String @default("review")

InvoicePage:
- tenantId String hinzufügen oder über Invoice scopen
- mimeType String?
- pageImagePath String?
- thumbnailPath String?
- originalPageFilePath String?

AuditLog:
- tenantId String
- actorUserId String?
- actionType String
- beforeJson String?
- afterJson String?

ExportRecord:
- tenantId String
- createdByUserId String?
- downloadPath String?
- packagePath String?

## 4. Authentifizierung

### 4.1 MVP Auth
Implementiere einfache sichere Session Auth ohne externe SaaS-Abhängigkeit.

Dependencies:
- bcryptjs oder argon2
- jose oder iron-session oder Next Auth/Auth.js, wenn sauber integrierbar

MVP akzeptabel:
- eigene Login API
- httpOnly secure Cookie
- session table optional oder signed JWT cookie

Routen:
- `/login`
- `/change-password`
- `/logout`
- `/admin/...`
- `/app/...`

### 4.2 Auth API
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/change-password`
- GET `/api/auth/me`

### 4.3 Session Objekt
Session muss enthalten:
- userId
- tenantId
- role
- displayName
- email
- isSuperAdmin

## 5. Authorization Helpers
Erstelle zentrale Helpers:

src/lib/auth/session.ts
- getCurrentSession()
- requireUser()
- requireRole(roles)
- requireSuperAdmin()
- requireTenantAccess(tenantId)

src/lib/auth/permissions.ts
- canUploadInvoice(user)
- canReviewInvoice(user, invoice)
- canApproveInvoice(user, invoice)
- canExportInvoice(user, invoice)
- canManageTenantUsers(user)

src/lib/db/tenant-scope.ts
- tenantWhere(session)
- assertInvoiceAccess(invoiceId, session)
- scopedInvoiceFindMany(session, args)

## 6. Routenstruktur

Neue App-Struktur:

src/app/(public)/login/page.tsx
src/app/(public)/change-password/page.tsx
src/app/(app)/app/layout.tsx
src/app/(app)/app/inbox/page.tsx
src/app/(app)/app/upload/page.tsx
src/app/(app)/app/invoices/[id]/page.tsx
src/app/(app)/app/approvals/page.tsx
src/app/(app)/app/exports/page.tsx
src/app/(app)/app/vendors/page.tsx
src/app/(app)/app/settings/page.tsx

src/app/(admin)/admin/layout.tsx
src/app/(admin)/admin/page.tsx
src/app/(admin)/admin/tenants/page.tsx
src/app/(admin)/admin/tenants/new/page.tsx
src/app/(admin)/admin/tenants/[id]/page.tsx
src/app/(admin)/admin/users/page.tsx
src/app/(admin)/admin/licenses/page.tsx
src/app/(admin)/admin/usage/page.tsx
src/app/(admin)/admin/audit/page.tsx
src/app/(admin)/admin/system/page.tsx

Legacy routes like /dashboard, /invoices can redirect to /app/inbox or be removed if unused.

## 7. Upload und Storage

### 7.1 Storage Service
Erstelle:

src/lib/storage/tenant-storage-service.ts

Methoden:
- getTenantStorageRoot(tenant)
- createInvoiceFolder(tenant, invoiceId)
- saveOriginalFile(tenant, invoiceId, file)
- savePagePreview(tenant, invoiceId, pageNumber, buffer)
- getProtectedFileStream(session, invoiceId, fileType, pageNumber?)
- deleteInvoiceFiles(tenant, invoiceId)

### 7.2 Upload Pfad
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/original/{filename}
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/pages/page-001.png
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/thumbs/page-001.jpg
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/exports/{exportId}/...

### 7.3 API Routes
- POST `/api/app/invoices/upload`
- GET `/api/app/invoices/[id]/file/original`
- GET `/api/app/invoices/[id]/file/page/[pageNumber]`
- GET `/api/app/invoices/[id]/file/thumb/[pageNumber]`

Every route must call assertInvoiceAccess.

## 8. Dokumentviewer

### 8.1 Komponenten
src/components/document/document-viewer.tsx
src/components/document/document-thumbnail-list.tsx
src/components/document/document-toolbar.tsx
src/components/document/invoice-preview-pane.tsx

Features:
- real PDF displayed via object/iframe when file is PDF
- image displayed via img when JPG/PNG
- thumbnail list if generated, otherwise page buttons
- zoom controls for image pages
- open original in new protected route
- download original
- rotate image view client-side
- no fake page cards when real document exists

### 8.2 Fallbacks
- If PDF preview not supported: show Open PDF button + embedded object.
- If thumbnail not generated: show simple page list.
- If file missing: show error and admin support link.

## 9. UI Vereinfachung

### 9.1 Normal User Layout
Sidebar:
- Eingang
- Hochladen
- Freigaben
- Exporte
- Lieferanten
- Einstellungen

Topbar:
- Firma
- User
- Rolle
- Logout

### 9.2 Invoice Detail Layout
Left 55%: Document viewer
Right 45%: Review panel

Review Panel Tabs:
- Überblick
- Felder
- Positionen
- Prüfung
- Buchung
- Verlauf

Default tab: Überblick.

## 10. AI Pipeline Upgrade

### 10.1 Input Preparation
Erstelle:

src/lib/ai/document-preparation-service.ts

Aufgaben:
- Dateityp erkennen
- PDF file input vorbereiten
- Bilder ggf. komprimieren
- große Bilder skalieren, aber lesbar halten
- Seitenlimit prüfen
- Metadaten an AI Prompt übergeben

### 10.2 OpenAI Provider
Existing OpenAI provider verbessern:
- use model from env, default gpt-4o-mini
- temperature 0
- strict JSON schema, soweit SDK unterstützt
- response JSON parse hardened
- retry for transient errors
- timeout
- token usage speichern, falls vorhanden
- no API call if invoice already analyzed unless explicit re-analyze

### 10.3 AI Output Schema
Erweitere Schema um:
- vendorCandidate
- duplicateSignals
- paymentReference
- bookingHints
- confidenceSummary
- missingCriticalFields
- suggestedReviewerMessage

### 10.4 Prompt Anforderungen
Prompt muss erklären:
- österreichische Eingangsrechnung
- Rechnung/Kostenvorschreibung/Mietrechnung erkennen
- mehrseitige Dokumente zusammenführen
- endgültige Summen bevorzugt aus Summenbereich verwenden
- Fußzeilen können Stammdaten enthalten
- 0 % / 0,00 USt mit Grund nicht als Fehler extrahieren
- keine Werte erfinden
- Quellenangabe pro Feld

## 11. Accounting Workflow Services

### 11.1 Invoice Workflow Service
src/lib/invoice/workflow/invoice-workflow-service.ts

Methoden:
- markUploaded(invoiceId)
- startAnalysis(invoiceId)
- completeAnalysis(invoiceId)
- markReviewRequired(invoiceId)
- completeReview(invoiceId)
- requestApproval(invoiceId)
- approveInvoice(invoiceId, userId)
- rejectInvoice(invoiceId, userId, reason)
- markExportReady(invoiceId)
- markExported(invoiceId)

### 11.2 Vendor Service
src/lib/vendors/vendor-service.ts

Methoden:
- findOrCreateVendorFromInvoice
- detectNewIbanForVendor
- updateVendorDefaults
- getTenantVendors

### 11.3 License Service
src/lib/license/license-service.ts

Methoden:
- canCreateUser(tenantId)
- canUploadInvoice(tenantId)
- canRunAiAnalysis(tenantId)
- recordUsage(tenantId, type, amount)
- enforceStorageLimit(tenantId)

## 12. API Fehlercodes
Standardisierte Fehler:
- AUTH_REQUIRED
- FORBIDDEN
- TENANT_NOT_FOUND
- USER_LIMIT_REACHED
- INVOICE_LIMIT_REACHED
- STORAGE_LIMIT_REACHED
- AI_BUDGET_REACHED
- FILE_TOO_LARGE
- FILE_TYPE_NOT_ALLOWED
- INVOICE_NOT_FOUND
- INVOICE_ACCESS_DENIED
- EXPORT_BLOCKED
- APPROVAL_REQUIRED

Userfreundliche Texte im UI anzeigen.

## 13. Seeds
Seed muss erstellen:
- Super Admin: admin@financepro.local / Admin123! / mustChangePassword false
- Tenant 1: Austria Wirtschaftsservice GmbH Demo
- Tenant 2: Testfirma Handwerk GmbH
- je 3 User pro Tenant
- Rechnungen pro Tenant
- Keine Tenant-übergreifende Sichtbarkeit

## 14. Tests

### 14.1 Unit Tests
- permission helpers
- tenant scope helpers
- license limit checks
- invoice workflow transitions
- AI schema parsing
- special tax cases
- duplicate detection

### 14.2 Integration-like Tests
- User A from tenant A cannot access tenant B invoice
- Viewer cannot upload
- Accountant cannot access admin routes
- Export blocked before approval
- Super admin can create tenant
- maxUsers limit enforced

### 14.3 Manual QA
- Login as Super Admin
- Create company
- Create users
- Login as accountant
- Upload PDF
- Review invoice
- Approve invoice
- Export
- Verify files in tenant folder

## 15. Build Requirements
Codex must run:
- npm install if needed
- npm run db:generate
- npm run db:push
- npm run db:seed
- npm run typecheck
- npm run lint
- npm run test
- npm run build

Fix all errors before final answer.

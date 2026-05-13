# FinancePro Industrial Mode

FinancePro ist ein Next.js/TypeScript MVP für österreichische Eingangsrechnungen. Der aktuelle Industrial Mode ergänzt Mandanten, Accounts, Rollen, Lizenzlimits, tenant-geschützte Uploads, Review/Freigabe und Export.

## Installation

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

## Environment

Kopieren Sie `.env.example` nach `.env` und setzen Sie mindestens:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="long-random-secret"
UPLOAD_DIR="./uploads"
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0
AI_MAX_OUTPUT_TOKENS=8000
AI_MAX_PAGES_PER_ANALYSIS=8
AI_USE_MOCK_WHEN_KEY_MISSING=true
OPENAI_API_KEY=
```

Ohne `OPENAI_API_KEY` läuft FinancePro stabil im Mock-Modus.

## Seed Logins

Super Admin:
- `admin@financepro.local` / `Admin123!`
- Username: `admin`

Tenant 1: Austria Wirtschaftsservice Gesellschaft mbH Demo
- `tenantadmin@aws-demo.local` / `Tenant123!`
- `accountant@aws-demo.local` / `User123!`
- `reviewer@aws-demo.local` / `User123!`

Tenant 2: Testfirma Handwerk GmbH
- `tenantadmin@handwerk-demo.local` / `Tenant123!`
- `accountant@handwerk-demo.local` / `User123!`
- `reviewer@handwerk-demo.local` / `User123!`

Tenant-User müssen beim ersten Login ihr Passwort ändern.

## Rollenmodell

- `SUPER_ADMIN`: FinancePro Betreiber, Firmen, Lizenzen, Nutzer, Nutzung und Audit.
- `TENANT_ADMIN`: Firmenadmin innerhalb einer Firma, Nutzerverwaltung im Seat-Limit.
- `ACCOUNTANT`: Upload, Review, Korrektur, Buchungsvorschlag und Export.
- `REVIEWER`: Freigabe und Ablehnung.
- `VIEWER`: Lesen ohne Upload oder Änderungen.

## Tenant-Konzept

Normale User gehören genau zu einer Firma. Jede kundenbezogene Rechnung, Seite, Vendor, Export- und Audit-Zeile trägt `tenantId`. API-Routen verwenden den Tenant aus der Session, nicht aus Client-Input.

## Upload Storage

Kundendokumente liegen nicht in `public/`, sondern unter:

```text
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/original/original.pdf
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/pages/page-001.png
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/thumbs/page-001.jpg
uploads/tenants/{tenantSlug}/invoices/{invoiceId}/exports/{exportId}/...
```

Preview und Download laufen über geschützte Routen:
- `/api/app/invoices/[id]/file/original`
- `/api/app/invoices/[id]/file/page/[pageNumber]`
- `/api/app/invoices/[id]/file/thumb/[pageNumber]`

## Wichtige Routen

Public:
- `/login`
- `/change-password`
- `/logout`

Super Admin:
- `/admin`
- `/admin/tenants`
- `/admin/tenants/new`
- `/admin/tenants/[id]`
- `/admin/users`
- `/admin/licenses`
- `/admin/usage`
- `/admin/audit`
- `/admin/system`

Firmen-App:
- `/app/inbox`
- `/app/upload`
- `/app/invoices/[id]`
- `/app/approvals`
- `/app/exports`
- `/app/vendors`
- `/app/settings`

Legacy-Routen wie `/dashboard`, `/invoices`, `/upload`, `/exports`, `/settings` leiten in den neuen App-Bereich um.

## OpenAI Setup

Standardmodell ist `gpt-4o-mini`. Die AI-Pipeline verlangt strukturierte JSON-Ausgaben mit Confidence und Quellenangaben. Die deterministische Validierung prüft danach Beträge, Pflichtfelder und Sonderfälle wie `0,00 USt` mit Begründung.

## Commands

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run typecheck
npm run lint
npm run test
npm run build
```

## Security Hinweise

- Passwörter werden mit `bcryptjs` gehasht.
- Sessions liegen in einem httpOnly Cookie.
- `/admin` ist nur für `SUPER_ADMIN`.
- Tenant-Dateien werden nie direkt öffentlich ausgeliefert.
- Normale User können keine fremden Tenant-Rechnungen oder Dateien über URL-Manipulation öffnen.
- Super-Admin-Zugriff auf Kundendaten wird über `PlatformAuditLog` protokolliert.
- API Keys, Passwörter und vollständige Rechnungsdaten dürfen nicht im Client geloggt werden.

## Aktuelle Limitierungen

- SQLite bleibt lokale MVP-Datenbank; für Produktion ist PostgreSQL vorgesehen.
- PDF-Thumbnails werden vorbereitet, aber der Viewer nutzt für PDFs zunächst das geschützte Original im `object`/`iframe`.
- AI läuft ohne Key im Mock-Modus.
- BMD/RZL/Business-Central-Adapter sind exportorientierte Datei-Mappings, keine direkten API-Integrationen.

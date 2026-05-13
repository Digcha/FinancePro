import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

function databasePath() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!url.startsWith("file:")) {
    throw new Error("Only SQLite file: DATABASE_URL values are supported by scripts/db-push.ts");
  }

  const value = url.slice("file:".length);
  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(process.cwd(), "prisma", value);
}

const dbPath = databasePath();
const reset = process.argv.includes("--reset");

mkdirSync(path.dirname(dbPath), { recursive: true });

if (reset && existsSync(dbPath)) {
  rmSync(dbPath);
}

const sql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL DEFAULT 'demo-tenant',
  "documentType" TEXT NOT NULL,
  "supplierName" TEXT,
  "supplierAddress" TEXT,
  "supplierUid" TEXT,
  "supplierIban" TEXT,
  "supplierBic" TEXT,
  "supplierCompanyRegisterNumber" TEXT,
  "customerName" TEXT,
  "customerAddress" TEXT,
  "customerUid" TEXT,
  "customerNumber" TEXT,
  "invoiceNumber" TEXT,
  "invoiceDate" DATETIME,
  "deliveryDate" DATETIME,
  "servicePeriod" TEXT,
  "orderNumber" TEXT,
  "offerNumber" TEXT,
  "deliveryNoteNumber" TEXT,
  "paymentReference" TEXT,
  "zeroTaxReason" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "netAmount" REAL,
  "taxAmount" REAL,
  "taxRate" REAL,
  "grossAmount" REAL,
  "paymentTerms" TEXT,
  "status" TEXT NOT NULL DEFAULT 'review_required',
  "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
  "validationStatus" TEXT NOT NULL DEFAULT 'warning',
  "riskLevel" TEXT NOT NULL DEFAULT 'medium',
  "exportApproved" BOOLEAN NOT NULL DEFAULT false,
  "aiProvider" TEXT,
  "aiModel" TEXT,
  "aiMode" TEXT NOT NULL DEFAULT 'mock',
  "aiStatus" TEXT NOT NULL DEFAULT 'not_started',
  "aiErrorCode" TEXT,
  "aiErrorMessage" TEXT,
  "aiOverallConfidence" REAL,
  "aiRawResultJson" TEXT,
  "aiNormalizedResultJson" TEXT,
  "aiAnalyzedAt" DATETIME,
  "lastReviewedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InvoiceExtractedField" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "fieldPath" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "aiValue" TEXT,
  "finalValue" TEXT,
  "valueType" TEXT NOT NULL DEFAULT 'string',
  "confidence" REAL NOT NULL,
  "sourcePageNumber" INTEGER,
  "sourceText" TEXT,
  "needsReview" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'extracted',
  "boundingBoxJson" TEXT,
  "correctedBy" TEXT,
  "correctedAt" DATETIME,
  "confirmedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceExtractedField_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "InvoicePage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalFilePath" TEXT NOT NULL,
  "previewImagePath" TEXT,
  "pageNumberDetected" INTEGER,
  "totalPagesDetected" INTEGER,
  "qualityStatus" TEXT NOT NULL,
  "sharpnessScore" REAL NOT NULL,
  "completenessScore" REAL NOT NULL,
  "perspectiveScore" REAL NOT NULL,
  "extractedText" TEXT NOT NULL,
  CONSTRAINT "InvoicePage_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "InvoiceLineItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "sourcePageNumber" INTEGER,
  "positionNumber" TEXT,
  "quantity" REAL,
  "unit" TEXT,
  "description" TEXT NOT NULL,
  "unitPrice" REAL,
  "duration" TEXT,
  "discountPercent" REAL,
  "netAmount" REAL,
  "taxRate" REAL,
  "grossAmount" REAL,
  "confidence" REAL NOT NULL,
  CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ValidationResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "sourcePageNumber" INTEGER,
  CONSTRAINT "ValidationResult_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RiskIndicator" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  CONSTRAINT "RiskIndicator_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "BookingSuggestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "bookingDate" DATETIME,
  "documentNumber" TEXT,
  "supplier" TEXT,
  "bookingText" TEXT NOT NULL,
  "netAmount" REAL,
  "taxAmount" REAL,
  "grossAmount" REAL,
  "taxAccount" TEXT,
  "expenseAccount" TEXT,
  "supplierAccount" TEXT,
  "costCenter" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  CONSTRAINT "BookingSuggestion_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ExportRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "targetSystem" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "fileName" TEXT,
  "validationSummary" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExportRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingSuggestion_invoiceId_key" ON "BookingSuggestion"("invoiceId");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_idx" ON "Invoice"("tenantId");
CREATE INDEX IF NOT EXISTS "Invoice_supplierName_invoiceNumber_idx" ON "Invoice"("supplierName", "invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceExtractedField_invoiceId_fieldPath_key" ON "InvoiceExtractedField"("invoiceId", "fieldPath");
CREATE INDEX IF NOT EXISTS "InvoiceExtractedField_invoiceId_idx" ON "InvoiceExtractedField"("invoiceId");
CREATE INDEX IF NOT EXISTS "InvoicePage_invoiceId_idx" ON "InvoicePage"("invoiceId");
CREATE INDEX IF NOT EXISTS "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "ValidationResult_invoiceId_idx" ON "ValidationResult"("invoiceId");
CREATE INDEX IF NOT EXISTS "RiskIndicator_invoiceId_idx" ON "RiskIndicator"("invoiceId");
CREATE INDEX IF NOT EXISTS "AuditLog_invoiceId_idx" ON "AuditLog"("invoiceId");
CREATE INDEX IF NOT EXISTS "ExportRecord_invoiceId_idx" ON "ExportRecord"("invoiceId");
`;

execFileSync("sqlite3", [dbPath], {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"]
});

const invoiceColumns = new Set(
  execFileSync("sqlite3", [dbPath, "PRAGMA table_info('Invoice');"], {
    encoding: "utf8"
  })
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("|")[1])
);

const invoiceAddColumns: Array<[string, string]> = [
  ["reviewStatus", "TEXT NOT NULL DEFAULT 'pending'"],
  ["aiProvider", "TEXT"],
  ["aiModel", "TEXT"],
  ["aiMode", "TEXT NOT NULL DEFAULT 'mock'"],
  ["aiStatus", "TEXT NOT NULL DEFAULT 'not_started'"],
  ["aiErrorCode", "TEXT"],
  ["aiErrorMessage", "TEXT"],
  ["aiOverallConfidence", "REAL"],
  ["aiRawResultJson", "TEXT"],
  ["aiNormalizedResultJson", "TEXT"],
  ["aiAnalyzedAt", "DATETIME"],
  ["lastReviewedAt", "DATETIME"]
];

for (const [column, definition] of invoiceAddColumns) {
  if (!invoiceColumns.has(column)) {
    execFileSync("sqlite3", [dbPath, `ALTER TABLE "Invoice" ADD COLUMN "${column}" ${definition};`], {
      stdio: ["ignore", "inherit", "inherit"]
    });
  }
}

console.log(`SQLite schema ready at ${dbPath}`);

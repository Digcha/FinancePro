import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import type { InvoiceValidationInput } from "../src/server/domain/types";
import { bookingSuggestionService, invoiceValidationService, riskAnalysisService } from "../src/server/services";
import { summarizeRisk, summarizeValidation } from "../src/server/services/invoiceAiPersistenceService";

const prisma = new PrismaClient();

const pdfBytes = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 96 >>
stream
BT /F1 16 Tf 72 720 Td (FinancePro Demo Rechnung) Tj 0 -24 Td (Originalbeleg fuer geschuetzte Vorschau) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000241 00000 n
0000000387 00000 n
trailer
<< /Root 1 0 R /Size 6 >>
startxref
457
%%EOF
`);

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function field(fieldPath: string, label: string, value: string | null, confidence = 0.94, needsReview = false, sourcePageNumber = 1) {
  return {
    fieldPath,
    label,
    aiValue: value,
    finalValue: value,
    valueType: fieldPath.startsWith("amounts.") ? "number" : "string",
    confidence,
    sourcePageNumber,
    sourceText: value ? `${label}: ${value}` : null,
    needsReview,
    status: value ? (needsReview ? "low_confidence" : "confirmed") : "missing"
  };
}

async function writeTenantDocument(tenantSlug: string, invoiceId: string) {
  const folder = path.resolve(process.cwd(), "uploads", "tenants", tenantSlug, "invoices", invoiceId, "original");
  await mkdir(folder, { recursive: true });
  const sampleImagePath = path.resolve(process.cwd(), "uploads", "1778667664682-1-9054F7A6-AEC4-4AB4-B4A7-A03551727F2D_1_105_c.jpeg");
  const sampleImage = await readFile(sampleImagePath).catch(() => null);
  const fileName = sampleImage ? "original.jpg" : "original.pdf";
  const filePath = path.join(folder, fileName);
  const bytes = sampleImage ?? pdfBytes;
  await writeFile(filePath, bytes);
  await mkdir(path.resolve(process.cwd(), "uploads", "tenants", tenantSlug, "invoices", invoiceId, "pages"), { recursive: true });
  await mkdir(path.resolve(process.cwd(), "uploads", "tenants", tenantSlug, "invoices", invoiceId, "thumbs"), { recursive: true });
  await mkdir(path.resolve(process.cwd(), "uploads", "tenants", tenantSlug, "invoices", invoiceId, "exports"), { recursive: true });
  return {
    filePath,
    fileName,
    mimeType: sampleImage ? "image/jpeg" : "application/pdf",
    size: bytes.length
  };
}

async function createInvoice(params: {
  id: string;
  tenantId: string;
  tenantSlug: string;
  uploadedByUserId: string;
  approvedByUserId?: string;
  status: string;
  reviewStatus?: string;
  exportApproved?: boolean;
  invoice: InvoiceValidationInput & {
    supplierBic?: string | null;
    paymentTerms?: string | null;
  };
  fieldsNeedReview?: boolean;
}) {
  const original = await writeTenantDocument(params.tenantSlug, params.id);
  const validationResults = invoiceValidationService.validate(params.invoice);
  const risks = riskAnalysisService.analyze(params.invoice, validationResults);
  const booking = bookingSuggestionService.suggest(params.invoice);
  const validationStatus = summarizeValidation(validationResults);
  const riskLevel = summarizeRisk(risks);
  const approved = params.status === "export_ready" || params.status === "exported" || params.exportApproved;

  return prisma.invoice.create({
    data: {
      id: params.id,
      tenantId: params.tenantId,
      uploadedByUserId: params.uploadedByUserId,
      approvedByUserId: params.approvedByUserId ?? null,
      approvedAt: approved ? new Date() : null,
      originalFileName: original.fileName,
      originalMimeType: original.mimeType,
      originalFileSize: original.size,
      storageRoot: path.dirname(path.dirname(original.filePath)),
      documentPreviewPath: original.mimeType.startsWith("image/") ? original.filePath : null,
      currentWorkflowStep: approved ? "export" : "review",
      documentType: params.invoice.documentType,
      supplierName: params.invoice.supplierName,
      supplierAddress: params.invoice.supplierAddress,
      supplierUid: params.invoice.supplierUid,
      supplierIban: params.invoice.supplierIban,
      supplierBic: params.invoice.supplierBic ?? null,
      customerName: params.invoice.customerName,
      customerAddress: params.invoice.customerAddress,
      customerUid: params.invoice.customerUid,
      invoiceNumber: params.invoice.invoiceNumber,
      invoiceDate: params.invoice.invoiceDate ? new Date(params.invoice.invoiceDate) : null,
      deliveryDate: params.invoice.deliveryDate ? new Date(params.invoice.deliveryDate) : null,
      servicePeriod: params.invoice.servicePeriod,
      zeroTaxReason: params.invoice.zeroTaxReason,
      currency: params.invoice.currency ?? "EUR",
      netAmount: params.invoice.netAmount,
      taxAmount: params.invoice.taxAmount,
      taxRate: params.invoice.taxRate,
      grossAmount: params.invoice.grossAmount,
      paymentTerms: params.invoice.paymentTerms ?? null,
      status: params.status,
      reviewStatus: params.reviewStatus ?? (approved ? "reviewed" : "pending"),
      validationStatus,
      riskLevel,
      exportApproved: approved,
      exportStatus: approved ? "ready" : "blocked",
      aiProvider: "Mock",
      aiModel: "gpt-4o-mini",
      aiMode: "mock",
      aiStatus: "fallback_mock",
      aiOverallConfidence: params.fieldsNeedReview ? 0.69 : 0.92,
      aiAnalyzedAt: new Date(),
      pages: {
        create: {
          tenantId: params.tenantId,
          fileName: original.fileName,
          mimeType: original.mimeType,
          originalFilePath: original.filePath,
          originalPageFilePath: original.filePath,
          pageImagePath: original.mimeType.startsWith("image/") ? original.filePath : null,
          thumbnailPath: original.mimeType.startsWith("image/") ? original.filePath : null,
          pageNumberDetected: 1,
          totalPagesDetected: 1,
          qualityStatus: "accepted",
          sharpnessScore: 0.94,
          completenessScore: 0.97,
          perspectiveScore: 0.96,
          extractedText: `${params.invoice.supplierName} Rechnung ${params.invoice.invoiceNumber} Brutto ${params.invoice.grossAmount}`
        }
      },
      extractedFields: {
        create: [
          field("supplier.name", "Lieferant", params.invoice.supplierName ?? null),
          field("supplier.uidNumber", "Lieferanten-UID", params.invoice.supplierUid ?? null),
          field("supplier.iban", "IBAN", params.invoice.supplierIban ?? null, params.fieldsNeedReview ? 0.62 : 0.91, Boolean(params.fieldsNeedReview)),
          field("invoice.invoiceNumber", "Rechnungsnummer", params.invoice.invoiceNumber ?? null),
          field("invoice.invoiceDate", "Rechnungsdatum", params.invoice.invoiceDate ? new Date(params.invoice.invoiceDate).toISOString().slice(0, 10) : null),
          field("invoice.serviceDate", "Leistungsdatum", params.invoice.deliveryDate ? new Date(params.invoice.deliveryDate).toISOString().slice(0, 10) : null, params.invoice.deliveryDate ? 0.9 : 0.2, !params.invoice.deliveryDate),
          field("amounts.netAmount", "Netto", params.invoice.netAmount === null || params.invoice.netAmount === undefined ? null : String(params.invoice.netAmount)),
          field("amounts.taxAmount", "USt", params.invoice.taxAmount === null || params.invoice.taxAmount === undefined ? null : String(params.invoice.taxAmount)),
          field("amounts.grossAmount", "Brutto", params.invoice.grossAmount === null || params.invoice.grossAmount === undefined ? null : String(params.invoice.grossAmount))
        ]
      },
      lineItems: {
        create: params.invoice.lineItems?.map((item) => ({
          sourcePageNumber: item.sourcePageNumber,
          positionNumber: item.positionNumber,
          quantity: item.quantity,
          unit: item.unit,
          description: item.description,
          unitPrice: item.unitPrice,
          duration: item.duration,
          discountPercent: item.discountPercent,
          netAmount: item.netAmount,
          taxRate: item.taxRate,
          grossAmount: item.grossAmount,
          confidence: item.confidence
        })) ?? []
      },
      validationResults: {
        create: validationResults.map((result) => ({
          field: result.field,
          status: result.status,
          severity: result.severity,
          explanation: result.explanation,
          sourcePageNumber: result.sourcePageNumber
        }))
      },
      riskIndicators: {
        create: risks.map((risk) => ({
          title: risk.title,
          description: risk.description,
          severity: risk.severity,
          recommendation: risk.recommendation,
          reason: risk.reason
        }))
      },
      bookingSuggestion: {
        create: {
          bookingDate: booking.bookingDate ? new Date(booking.bookingDate) : null,
          documentNumber: booking.documentNumber,
          supplier: booking.supplier,
          bookingText: booking.bookingText,
          netAmount: booking.netAmount,
          taxAmount: booking.taxAmount,
          grossAmount: booking.grossAmount,
          taxAccount: booking.taxAccount,
          expenseAccount: booking.expenseAccount,
          supplierAccount: booking.supplierAccount,
          costCenter: booking.costCenter,
          status: approved ? "approved" : "draft"
        }
      },
      auditLogs: {
        create: [
          {
            tenantId: params.tenantId,
            actorUserId: params.uploadedByUserId,
            action: "DOCUMENT_UPLOADED",
            actionType: "DOCUMENT_UPLOADED",
            description: "Demo-Beleg im Firmenordner gespeichert.",
            actor: "Seed"
          },
          {
            tenantId: params.tenantId,
            actorUserId: params.uploadedByUserId,
            action: "AI_ANALYSIS_COMPLETED",
            actionType: "AI_ANALYSIS_COMPLETED",
            description: "Mock-Analyse für Demo-Daten erzeugt.",
            actor: "Seed"
          }
        ]
      }
    }
  });
}

async function main() {
  await prisma.exportRecord.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.bookingSuggestion.deleteMany();
  await prisma.riskIndicator.deleteMany();
  await prisma.validationResult.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoiceExtractedField.deleteMany();
  await prisma.invoicePage.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.usageRecord.deleteMany();
  await prisma.licenseEvent.deleteMany();
  await prisma.platformAuditLog.deleteMany();
  await prisma.userSetting.deleteMany();
  await prisma.tenantSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "admin@financepro.local",
      username: "admin",
      displayName: "FinancePro Super Admin",
      role: "SUPER_ADMIN",
      passwordHash: await hashPassword("Admin123!"),
      mustChangePassword: false
    }
  });

  const tenant1 = await prisma.tenant.create({
    data: {
      name: "Austria Wirtschaftsservice Gesellschaft mbH Demo",
      slug: "aws-demo",
      legalName: "Austria Wirtschaftsservice Gesellschaft mbH Demo",
      uidNumber: "ATU87654321",
      billingEmail: "billing@aws-demo.local",
      licensePlan: "professional",
      maxUsers: 5,
      maxInvoicesPerMonth: 500,
      storageLimitMb: 2048,
      aiMonthlyBudgetCents: 25000,
      defaultExportTarget: "GENERIC_CSV"
    }
  });
  const tenant2 = await prisma.tenant.create({
    data: {
      name: "Testfirma Handwerk GmbH",
      slug: "handwerk-demo",
      legalName: "Testfirma Handwerk GmbH",
      uidNumber: "ATU11223344",
      billingEmail: "office@handwerk-demo.local",
      licensePlan: "starter",
      maxUsers: 3,
      maxInvoicesPerMonth: 80,
      storageLimitMb: 512,
      aiMonthlyBudgetCents: 5000,
      defaultExportTarget: "GENERIC_CSV"
    }
  });

  await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: "tenantadmin@aws-demo.local",
      username: "tenantadmin.aws",
      displayName: "AWS Demo Admin",
      role: "TENANT_ADMIN",
      passwordHash: await hashPassword("Tenant123!"),
      mustChangePassword: true,
      createdByUserId: admin.id
    }
  });
  const tenant1Accountant = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: "accountant@aws-demo.local",
      username: "accountant.aws",
      displayName: "Anna Buchhaltung",
      role: "ACCOUNTANT",
      passwordHash: await hashPassword("User123!"),
      mustChangePassword: true,
      createdByUserId: admin.id
    }
  });
  const tenant1Reviewer = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: "reviewer@aws-demo.local",
      username: "reviewer.aws",
      displayName: "Markus Review",
      role: "REVIEWER",
      passwordHash: await hashPassword("User123!"),
      mustChangePassword: true,
      createdByUserId: admin.id
    }
  });

  const tenant2Admin = await prisma.user.create({
    data: {
      tenantId: tenant2.id,
      email: "tenantadmin@handwerk-demo.local",
      username: "tenantadmin.handwerk",
      displayName: "Handwerk Admin",
      role: "TENANT_ADMIN",
      passwordHash: await hashPassword("Tenant123!"),
      mustChangePassword: true,
      createdByUserId: admin.id
    }
  });
  const tenant2Accountant = await prisma.user.create({
    data: {
      tenantId: tenant2.id,
      email: "accountant@handwerk-demo.local",
      username: "accountant.handwerk",
      displayName: "Handwerk Buchhaltung",
      role: "ACCOUNTANT",
      passwordHash: await hashPassword("User123!"),
      mustChangePassword: true,
      createdByUserId: admin.id
    }
  });
  await prisma.user.create({
    data: {
      tenantId: tenant2.id,
      email: "reviewer@handwerk-demo.local",
      username: "reviewer.handwerk",
      displayName: "Handwerk Review",
      role: "REVIEWER",
      passwordHash: await hashPassword("User123!"),
      mustChangePassword: true,
      createdByUserId: admin.id
    }
  });

  await createInvoice({
    id: "aws-demo-approved",
    tenantId: tenant1.id,
    tenantSlug: tenant1.slug,
    uploadedByUserId: tenant1Accountant.id,
    approvedByUserId: tenant1Reviewer.id,
    status: "export_ready",
    invoice: {
      id: "aws-demo-approved",
      documentType: "invoice",
      supplierName: "ViennaOffice Supplies GmbH",
      supplierAddress: "Mariahilfer Strasse 101, 1060 Wien",
      supplierUid: "ATU12345678",
      supplierIban: "AT611904300234573201",
      supplierBic: "BKAUATWW",
      customerName: tenant1.name,
      customerAddress: "Walcherstrasse 11A, 1020 Wien",
      customerUid: tenant1.uidNumber,
      invoiceNumber: "VO-2026-041",
      invoiceDate: date("2026-05-02"),
      deliveryDate: date("2026-05-01"),
      currency: "EUR",
      netAmount: 1200,
      taxAmount: 240,
      taxRate: 20,
      grossAmount: 1440,
      pages: [],
      lineItems: [{ sourcePageNumber: 1, positionNumber: "1", description: "Büromaterial und Archivboxen", quantity: 12, unit: "Pack", unitPrice: 100, netAmount: 1200, taxRate: 20, grossAmount: 1440, confidence: 0.96 }]
    }
  });

  await createInvoice({
    id: "aws-demo-review",
    tenantId: tenant1.id,
    tenantSlug: tenant1.slug,
    uploadedByUserId: tenant1Accountant.id,
    status: "review_required",
    fieldsNeedReview: true,
    invoice: {
      id: "aws-demo-review",
      documentType: "cost_assessment",
      supplierName: "Magistrat der Stadt Wien",
      supplierAddress: "Rathaus, 1010 Wien",
      supplierUid: "ATU36801500",
      supplierIban: "AT481100000012345678",
      customerName: tenant1.name,
      customerAddress: "Walcherstrasse 11A, 1020 Wien",
      customerUid: tenant1.uidNumber,
      invoiceNumber: "MA-2026-881",
      invoiceDate: date("2026-05-06"),
      deliveryDate: null,
      currency: "EUR",
      netAmount: 1000,
      taxAmount: 0,
      taxRate: 0,
      grossAmount: 1000,
      zeroTaxReason: "Keine Umsatzsteuer, da kein steuerbarer Vorgang vorliegt.",
      pages: [],
      lineItems: [{ sourcePageNumber: 1, positionNumber: "1", description: "Gebührenvorschreibung", quantity: 1, unit: "Pauschale", unitPrice: 1000, netAmount: 1000, taxRate: 0, grossAmount: 1000, confidence: 0.78 }]
    }
  });

  await createInvoice({
    id: "handwerk-demo-review",
    tenantId: tenant2.id,
    tenantSlug: tenant2.slug,
    uploadedByUserId: tenant2Accountant.id,
    approvedByUserId: tenant2Admin.id,
    status: "review_required",
    fieldsNeedReview: true,
    invoice: {
      id: "handwerk-demo-review",
      documentType: "invoice",
      supplierName: "Baustoffe Graz GmbH",
      supplierAddress: "Industriestrasse 5, 8020 Graz",
      supplierUid: "ATU44556677",
      supplierIban: "AT611904300234573201",
      customerName: tenant2.name,
      customerAddress: "Handwerksgasse 4, 8010 Graz",
      customerUid: tenant2.uidNumber,
      invoiceNumber: "BG-2026-1180",
      invoiceDate: date("2026-05-04"),
      deliveryDate: date("2026-05-03"),
      currency: "EUR",
      netAmount: 3500,
      taxAmount: 700,
      taxRate: 20,
      grossAmount: 4200,
      pages: [],
      lineItems: [{ sourcePageNumber: 1, positionNumber: "1", description: "Baumaterial Baustelle Nord", quantity: 1, unit: "Pauschale", unitPrice: 3500, netAmount: 3500, taxRate: 20, grossAmount: 4200, confidence: 0.84 }]
    }
  });

  await prisma.vendor.createMany({
    data: [
      { tenantId: tenant1.id, name: "ViennaOffice Supplies GmbH", normalizedName: "viennaoffice supplies gmbh", uidNumber: "ATU12345678", iban: "AT611904300234573201", trustStatus: "trusted", lastInvoiceAt: date("2026-05-02"), defaultExpenseAccount: "7600" },
      { tenantId: tenant1.id, name: "Magistrat der Stadt Wien", normalizedName: "magistrat der stadt wien", uidNumber: "ATU36801500", iban: "AT481100000012345678", trustStatus: "known", lastInvoiceAt: date("2026-05-06"), defaultExpenseAccount: "7100" },
      { tenantId: tenant2.id, name: "Baustoffe Graz GmbH", normalizedName: "baustoffe graz gmbh", uidNumber: "ATU44556677", iban: "AT611904300234573201", trustStatus: "new", lastInvoiceAt: date("2026-05-04"), defaultExpenseAccount: "5000" }
    ]
  });

  await prisma.usageRecord.createMany({
    data: [
      { tenantId: tenant1.id, period: "2026-05", invoicesUploaded: 2, aiAnalyses: 2, storageUsedMb: 0.02, estimatedAiCostCents: 25 },
      { tenantId: tenant2.id, period: "2026-05", invoicesUploaded: 1, aiAnalyses: 1, storageUsedMb: 0.01, estimatedAiCostCents: 12 }
    ]
  });

  await prisma.platformAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "SEED_COMPLETED",
      description: "Industrial Mode Demo-Daten wurden erstellt."
    }
  });

  console.log("FinancePro Industrial seed completed.");
  console.log("Super Admin: admin@financepro.local / Admin123!");
  console.log("Tenant 1: tenantadmin@aws-demo.local / Tenant123!, accountant@aws-demo.local / User123!, reviewer@aws-demo.local / User123!");
  console.log("Tenant 2: tenantadmin@handwerk-demo.local / Tenant123!, accountant@handwerk-demo.local / User123!, reviewer@handwerk-demo.local / User123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

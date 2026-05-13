import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canAccessAdmin, canExportInvoice, canUploadInvoice } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { tenantWhere, assertInvoiceAccess } from "@/lib/db/tenant-scope";
import { invoiceWorkflowService } from "@/lib/invoice/workflow/invoice-workflow-service";
import { licenseService } from "@/lib/license/license-service";
import { tenantStorageService } from "@/lib/storage/tenant-storage-service";
import { prisma } from "@/lib/prisma";
import { exportService } from "@/server/services/exportService";
import { invoiceInclude } from "@/server/repositories/invoiceRepository";

function session(overrides: Partial<AppSession>): AppSession {
  return {
    userId: "test-user",
    tenantId: "tenant-a",
    tenantSlug: "tenant-a",
    tenantName: "Tenant A",
    email: "test@example.local",
    username: "test",
    displayName: "Test",
    role: "ACCOUNTANT",
    mustChangePassword: false,
    isSuperAdmin: false,
    ...overrides
  };
}

describe("Industrial Mode tenant security", () => {
  let tenantAId = "";
  let tenantBInvoiceId = "";
  let originalMaxUsers = 0;

  beforeAll(async () => {
    const tenantA = await prisma.tenant.findUnique({ where: { slug: "aws-demo" } });
    const tenantBInvoice = await prisma.invoice.findUnique({ where: { id: "handwerk-demo-review" } });
    if (!tenantA || !tenantBInvoice) {
      throw new Error("Seed data missing. Run npm run db:seed before tests.");
    }
    tenantAId = tenantA.id;
    tenantBInvoiceId = tenantBInvoice.id;
    originalMaxUsers = tenantA.maxUsers;
  });

  afterAll(async () => {
    if (tenantAId) {
      await prisma.tenant.update({ where: { id: tenantAId }, data: { maxUsers: originalMaxUsers } }).catch(() => undefined);
    }
    await prisma.invoice.update({
      where: { id: "aws-demo-review" },
      data: { status: "review_required", exportStatus: "blocked", exportApproved: false, currentWorkflowStep: "review" }
    }).catch(() => undefined);
  });

  it("scopes normal invoice queries to the current tenant", () => {
    expect(tenantWhere(session({ tenantId: tenantAId }))).toEqual({ tenantId: tenantAId });
    expect(tenantWhere(session({ role: "SUPER_ADMIN", tenantId: null, isSuperAdmin: true }))).toEqual({});
  });

  it("blocks Tenant A from opening Tenant B invoices", async () => {
    const invoice = await assertInvoiceAccess(tenantBInvoiceId, session({ tenantId: tenantAId }));
    expect(invoice).toBeNull();
  });

  it("blocks Viewer uploads and Accountant admin access", () => {
    expect(canUploadInvoice(session({ role: "VIEWER" }))).toBe(false);
    expect(canAccessAdmin(session({ role: "ACCOUNTANT" }))).toBe(false);
    expect(canExportInvoice(session({ role: "ACCOUNTANT" }))).toBe(true);
  });

  it("enforces maxUsers seat limits", async () => {
    const activeUsers = await prisma.user.count({ where: { tenantId: tenantAId, status: "active", role: { not: "SUPER_ADMIN" } } });
    await prisma.tenant.update({ where: { id: tenantAId }, data: { maxUsers: activeUsers } });
    const result = await licenseService.canCreateUser(tenantAId);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("USER_LIMIT_REACHED");
  });

  it("generates tenant-local storage roots", () => {
    const root = tenantStorageService.getTenantStorageRoot({ slug: "aws-demo" });
    expect(root).toContain("uploads/tenants/aws-demo");
    expect(root).not.toContain("public");
  });

  it("blocks export before approval", async () => {
    const invoice = await prisma.invoice.findUnique({ where: { id: "aws-demo-review" }, include: invoiceInclude });
    expect(invoice).not.toBeNull();
    expect(exportService.validateExport(invoice!).canExport).toBe(false);
  });

  it("moves approved invoices to export-ready workflow state", async () => {
    const invoice = await invoiceWorkflowService.markExportReady("aws-demo-review");
    expect(invoice.status).toBe("export_ready");
    expect(invoice.exportStatus).toBe("ready");
  });
});

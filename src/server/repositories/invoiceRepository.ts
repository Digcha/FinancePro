import type { Prisma } from "@prisma/client";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const invoiceInclude = {
  pages: {
    orderBy: [{ pageNumberDetected: "asc" as const }, { fileName: "asc" as const }]
  },
  lineItems: {
    orderBy: [{ sourcePageNumber: "asc" as const }, { positionNumber: "asc" as const }]
  },
  extractedFields: {
    orderBy: [{ fieldPath: "asc" as const }]
  },
  validationResults: {
    orderBy: [{ severity: "desc" as const }, { field: "asc" as const }]
  },
  riskIndicators: {
    orderBy: [{ severity: "desc" as const }, { title: "asc" as const }]
  },
  bookingSuggestion: true,
  auditLogs: {
    orderBy: { createdAt: "desc" as const }
  },
  exportedRecords: {
    orderBy: { createdAt: "desc" as const }
  }
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

function tenantFilter(session: AppSession): Prisma.InvoiceWhereInput {
  return session.isSuperAdmin ? {} : { tenantId: session.tenantId ?? "__no_tenant__" };
}

export async function getInvoices(session: AppSession): Promise<InvoiceWithRelations[]> {
  return prisma.invoice.findMany({
    where: tenantFilter(session),
    include: invoiceInclude,
    orderBy: { createdAt: "desc" }
  });
}

export async function getInvoiceById(id: string, session: AppSession): Promise<InvoiceWithRelations | null> {
  return prisma.invoice.findFirst({
    where: {
      id,
      ...tenantFilter(session)
    },
    include: invoiceInclude
  });
}

export async function getDashboardData(session: AppSession) {
  const invoices = await getInvoices(session);
  const total = invoices.length;
  const valid = invoices.filter((invoice) => invoice.validationStatus === "valid").length;
  const warnings = invoices.filter((invoice) => invoice.validationStatus === "warning").length;
  const highRisk = invoices.filter((invoice) => invoice.riskLevel === "high").length;
  const newest = invoices.slice(0, 5);
  const statusDistribution = invoices.reduce<Record<string, number>>((accumulator, invoice) => {
    accumulator[invoice.status] = (accumulator[invoice.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    invoices,
    metrics: {
      total,
      valid,
      warnings,
      highRisk
    },
    newest,
    statusDistribution
  };
}

export async function getExportRecords(session: AppSession) {
  return prisma.exportRecord.findMany({
    where: session.isSuperAdmin ? {} : { tenantId: session.tenantId ?? "__no_tenant__" },
    include: {
      invoice: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

import type { Prisma } from "@prisma/client";
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
  exports: {
    orderBy: { createdAt: "desc" as const }
  }
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

export async function getInvoices(): Promise<InvoiceWithRelations[]> {
  return prisma.invoice.findMany({
    include: invoiceInclude,
    orderBy: { createdAt: "desc" }
  });
}

export async function getInvoiceById(id: string): Promise<InvoiceWithRelations | null> {
  return prisma.invoice.findUnique({
    where: { id },
    include: invoiceInclude
  });
}

export async function getDashboardData() {
  const invoices = await getInvoices();
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

export async function getExportRecords() {
  return prisma.exportRecord.findMany({
    include: {
      invoice: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

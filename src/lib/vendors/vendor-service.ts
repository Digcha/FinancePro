import { prisma } from "@/lib/prisma";

function normalizeVendorName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export class VendorService {
  async findOrCreateVendorFromInvoice(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice?.supplierName) {
      return null;
    }

    const normalizedName = normalizeVendorName(invoice.supplierName);
    const existing = await prisma.vendor.findFirst({
      where: { tenantId: invoice.tenantId, normalizedName }
    });

    if (existing) {
      await prisma.vendor.update({
        where: { id: existing.id },
        data: { lastInvoiceAt: invoice.invoiceDate ?? invoice.createdAt }
      });
      return existing;
    }

    return prisma.vendor.create({
      data: {
        tenantId: invoice.tenantId,
        name: invoice.supplierName,
        normalizedName,
        uidNumber: invoice.supplierUid,
        iban: invoice.supplierIban,
        bic: invoice.supplierBic,
        address: invoice.supplierAddress,
        lastInvoiceAt: invoice.invoiceDate ?? invoice.createdAt,
        trustStatus: "new"
      }
    });
  }

  async detectNewIbanForVendor(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice?.supplierName || !invoice.supplierIban) {
      return { changed: false };
    }

    const vendor = await prisma.vendor.findFirst({
      where: {
        tenantId: invoice.tenantId,
        normalizedName: normalizeVendorName(invoice.supplierName)
      }
    });

    return {
      changed: Boolean(vendor?.iban && vendor.iban !== invoice.supplierIban),
      knownIban: vendor?.iban ?? null,
      currentIban: invoice.supplierIban
    };
  }

  async updateVendorDefaults(vendorId: string, data: { defaultExpenseAccount?: string; defaultCostCenter?: string; iban?: string }) {
    return prisma.vendor.update({
      where: { id: vendorId },
      data
    });
  }

  getTenantVendors(tenantId: string) {
    return prisma.vendor.findMany({
      where: { tenantId },
      orderBy: [{ trustStatus: "asc" }, { name: "asc" }]
    });
  }
}

export const vendorService = new VendorService();

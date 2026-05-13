import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AppSession } from "@/lib/auth/session";
import { invoiceInclude } from "@/server/repositories/invoiceRepository";

export function tenantWhere(session: AppSession): Prisma.InvoiceWhereInput {
  return session.isSuperAdmin ? {} : { tenantId: session.tenantId ?? "__no_tenant__" };
}

export async function assertInvoiceAccess(invoiceId: string, session: AppSession) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      ...tenantWhere(session)
    },
    include: invoiceInclude
  });

  if (!invoice) {
    return null;
  }

  if (session.isSuperAdmin && invoice.tenantId !== session.tenantId) {
    await prisma.platformAuditLog.create({
      data: {
        tenantId: invoice.tenantId,
        actorUserId: session.userId,
        action: "SUPER_ADMIN_TENANT_DATA_ACCESS",
        targetType: "Invoice",
        targetId: invoice.id,
        description: `Super Admin ${session.username} hat eine Kundenrechnung geoeffnet.`
      }
    });
  }

  return invoice;
}

export async function scopedInvoiceFindMany(
  session: AppSession,
  args: Omit<Prisma.InvoiceFindManyArgs, "where"> & { where?: Prisma.InvoiceWhereInput } = {}
) {
  return prisma.invoice.findMany({
    ...args,
    where: {
      ...(args.where ?? {}),
      ...tenantWhere(session)
    }
  });
}

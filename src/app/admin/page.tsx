import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminHomePage() {
  const session = await requireSuperAdmin();
  const [tenants, users, invoices, errors] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { OR: [{ aiStatus: "failed" }, { validationStatus: "error" }] } })
  ]);

  return (
    <>
      <AppHeader title="Admin" subtitle="FinancePro Plattformverwaltung" session={session} showUpload={false} />
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-4 lg:p-8">
        {[
          ["Firmen", tenants, "/admin/tenants"],
          ["Aktive Nutzer", users, "/admin/users"],
          ["Rechnungen", invoices, "/admin/usage"],
          ["Systemhinweise", errors, "/admin/system"]
        ].map(([label, value, href]) => (
          <Link key={label} href={String(href)} className="rounded-lg border border-ink-200 bg-white p-5 shadow-panel hover:bg-ink-50">
            <div className="text-sm text-ink-500">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-ink-900">{value}</div>
          </Link>
        ))}
      </div>
    </>
  );
}

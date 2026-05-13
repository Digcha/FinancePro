import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminTenantsPage() {
  const session = await requireSuperAdmin();
  const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" }, include: { users: true, invoices: true } });

  return (
    <>
      <AppHeader title="Firmen" subtitle="Mandanten, Lizenzen und Status" session={session} showUpload={false} />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex justify-end">
          <Link href="/admin/tenants/new" className="rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white">Firma erstellen</Link>
        </div>
        <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-500">
              <tr><th className="px-5 py-3 text-left">Firma</th><th className="px-5 py-3 text-left">Lizenz</th><th className="px-5 py-3 text-left">Seats</th><th className="px-5 py-3 text-left">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-5 py-4">
                    <Link href={`/admin/tenants/${tenant.id}`} className="font-semibold text-ink-900 hover:text-trust-700">{tenant.name}</Link>
                    <div className="text-xs text-ink-500">{tenant.slug}</div>
                  </td>
                  <td className="px-5 py-4 text-ink-600">{tenant.licensePlan}</td>
                  <td className="px-5 py-4 text-ink-600">{tenant.users.length}/{tenant.maxUsers}</td>
                  <td className="px-5 py-4"><StatusPill tone={tenant.status === "active" ? "success" : "danger"}>{tenant.status}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

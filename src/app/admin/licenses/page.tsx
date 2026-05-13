import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminLicensesPage() {
  const session = await requireSuperAdmin();
  const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" }, include: { users: true } });
  return (
    <>
      <AppHeader title="Lizenzen" subtitle="Pläne, Seats und freigeschaltete Module" session={session} showUpload={false} />
      <div className="p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
          {tenants.map((tenant) => (
            <Link key={tenant.id} href={`/admin/tenants/${tenant.id}`} className="grid gap-2 border-b border-ink-100 px-5 py-4 text-sm hover:bg-ink-50 md:grid-cols-5">
              <div className="font-semibold text-ink-900 md:col-span-2">{tenant.name}</div>
              <div>{tenant.licensePlan}</div>
              <div>{tenant.users.length}/{tenant.maxUsers} Seats</div>
              <div>{tenant.allowedExportTargets}</div>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}

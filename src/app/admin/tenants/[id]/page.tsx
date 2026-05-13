import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function updateTenant(formData: FormData) {
  "use server";
  const session = await requireSuperAdmin();
  const id = String(formData.get("id"));
  await prisma.tenant.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? ""),
      legalName: String(formData.get("legalName") ?? ""),
      status: String(formData.get("status") ?? "active"),
      licensePlan: String(formData.get("licensePlan") ?? "starter"),
      maxUsers: Number(formData.get("maxUsers") || 3),
      maxInvoicesPerMonth: Number(formData.get("maxInvoicesPerMonth") || 100),
      storageLimitMb: Number(formData.get("storageLimitMb") || 1024),
      aiMonthlyBudgetCents: formData.get("aiMonthlyBudgetCents") ? Number(formData.get("aiMonthlyBudgetCents")) : null,
      defaultExportTarget: String(formData.get("defaultExportTarget") || "GENERIC_CSV"),
      allowedExportTargets: String(formData.get("allowedExportTargets") || "GENERIC_CSV,GENERIC_JSON")
    }
  });
  await prisma.licenseEvent.create({
    data: {
      tenantId: id,
      actorUserId: session.userId,
      eventType: "LICENSE_UPDATED",
      newValueJson: JSON.stringify(Object.fromEntries(formData.entries()))
    }
  });
  revalidatePath(`/admin/tenants/${id}`);
}

export default async function AdminTenantDetailPage({ params }: PageProps) {
  const session = await requireSuperAdmin();
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id }, include: { users: true, invoices: true, usageRecords: true } });
  if (!tenant) {
    notFound();
  }

  return (
    <>
      <AppHeader title={tenant.name} subtitle="Firma, Lizenz und Nutzer" session={session} showUpload={false} />
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_380px] lg:p-8">
        <form action={updateTenant} className="grid gap-4 rounded-lg border border-ink-200 bg-white p-5 shadow-panel sm:grid-cols-2">
          <input type="hidden" name="id" value={tenant.id} />
          {[
            ["name", "Name", tenant.name],
            ["legalName", "Rechtlicher Name", tenant.legalName ?? ""],
            ["status", "Status", tenant.status],
            ["licensePlan", "Plan", tenant.licensePlan],
            ["maxUsers", "Max. Nutzer", tenant.maxUsers],
            ["maxInvoicesPerMonth", "Rechnungen/Monat", tenant.maxInvoicesPerMonth],
            ["storageLimitMb", "Speicher MB", tenant.storageLimitMb],
            ["aiMonthlyBudgetCents", "AI Budget Cent", tenant.aiMonthlyBudgetCents ?? ""],
            ["defaultExportTarget", "Standard Export", tenant.defaultExportTarget],
            ["allowedExportTargets", "Erlaubte Exportziele", tenant.allowedExportTargets]
          ].map(([name, label, value]) => (
            <label key={name} className="text-sm font-medium text-ink-700">
              {label}
              <input name={String(name)} defaultValue={String(value)} className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm" />
            </label>
          ))}
          <button className="rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white sm:col-span-2">Änderungen speichern</button>
        </form>
        <aside className="space-y-4">
          <div className="rounded-lg border border-ink-200 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between"><span>Status</span><StatusPill tone={tenant.status === "active" ? "success" : "danger"}>{tenant.status}</StatusPill></div>
            <div className="mt-4 text-sm text-ink-600">Nutzer: {tenant.users.length}/{tenant.maxUsers}</div>
            <div className="mt-2 text-sm text-ink-600">Rechnungen: {tenant.invoices.length}</div>
          </div>
          <div className="rounded-lg border border-ink-200 bg-white p-5 shadow-panel">
            <h2 className="font-semibold text-ink-900">Nutzer</h2>
            <div className="mt-3 space-y-2 text-sm">
              {tenant.users.map((user) => (
                <div key={user.id} className="rounded-md border border-ink-200 p-3">
                  <div className="font-medium text-ink-900">{user.displayName}</div>
                  <div className="text-ink-500">{user.email} · {user.role}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

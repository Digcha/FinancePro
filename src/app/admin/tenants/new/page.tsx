import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function createTenant(formData: FormData) {
  "use server";
  const session = await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/admin/tenants/new?error=name");
  }
  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug: slugify(String(formData.get("slug") || name)),
      legalName: String(formData.get("legalName") || name),
      uidNumber: String(formData.get("uidNumber") || ""),
      billingEmail: String(formData.get("billingEmail") || ""),
      licensePlan: String(formData.get("licensePlan") || "starter"),
      maxUsers: Number(formData.get("maxUsers") || 3),
      maxInvoicesPerMonth: Number(formData.get("maxInvoicesPerMonth") || 100),
      storageLimitMb: Number(formData.get("storageLimitMb") || 1024),
      aiMonthlyBudgetCents: formData.get("aiMonthlyBudgetCents") ? Number(formData.get("aiMonthlyBudgetCents")) : null,
      defaultExportTarget: String(formData.get("defaultExportTarget") || "GENERIC_CSV")
    }
  });
  await prisma.platformAuditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: session.userId,
      action: "TENANT_CREATED",
      targetType: "Tenant",
      targetId: tenant.id,
      description: `Firma ${tenant.name} wurde erstellt.`
    }
  });
  redirect(`/admin/tenants/${tenant.id}`);
}

export default async function NewTenantPage() {
  const session = await requireSuperAdmin();
  return (
    <>
      <AppHeader title="Firma erstellen" subtitle="Tenant und Lizenzlimits anlegen" session={session} showUpload={false} />
      <div className="p-4 sm:p-6 lg:p-8">
        <form action={createTenant} className="grid max-w-3xl gap-4 rounded-lg border border-ink-200 bg-white p-5 shadow-panel sm:grid-cols-2">
          {[
            ["name", "Firmenname"],
            ["slug", "Slug"],
            ["legalName", "Rechtlicher Name"],
            ["uidNumber", "UID"],
            ["billingEmail", "Billing E-Mail"],
            ["licensePlan", "Lizenzplan"],
            ["maxUsers", "Max. Nutzer"],
            ["maxInvoicesPerMonth", "Rechnungen/Monat"],
            ["storageLimitMb", "Speicher MB"],
            ["aiMonthlyBudgetCents", "AI Budget Cent"],
            ["defaultExportTarget", "Standard Exportziel"]
          ].map(([name, label]) => (
            <label key={name} className="text-sm font-medium text-ink-700">
              {label}
              <input name={name} className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm" />
            </label>
          ))}
          <button className="rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white sm:col-span-2">Firma speichern</button>
        </form>
      </div>
    </>
  );
}

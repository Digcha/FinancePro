import { AppHeader } from "@/components/layout/AppHeader";
import { hashPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { licenseService } from "@/lib/license/license-service";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function createTenantUser(formData: FormData) {
  "use server";
  const session = await requireUser();
  if (session.role !== "TENANT_ADMIN" || !session.tenantId) {
    redirect("/app/settings?error=forbidden");
  }

  const limit = await licenseService.canCreateUser(session.tenantId);
  if (!limit.allowed) {
    redirect(`/app/settings?error=${encodeURIComponent(limit.message ?? "Seat-Limit erreicht")}`);
  }

  const email = String(formData.get("email") ?? "").toLowerCase();
  await prisma.user.create({
    data: {
      tenantId: session.tenantId,
      email,
      username: String(formData.get("username") ?? "").toLowerCase(),
      displayName: String(formData.get("displayName") ?? ""),
      role: String(formData.get("role") ?? "VIEWER"),
      passwordHash: await hashPassword(String(formData.get("password") ?? "")),
      mustChangePassword: true,
      createdByUserId: session.userId
    }
  });
  redirect(`/app/settings?created=${encodeURIComponent(email)}`);
}

export default async function AppSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireUser();
  const params = await searchParams;
  const tenant = session.tenantId ? await prisma.tenant.findUnique({ where: { id: session.tenantId } }) : null;
  const users = session.tenantId && session.role === "TENANT_ADMIN" ? await prisma.user.findMany({ where: { tenantId: session.tenantId }, orderBy: { displayName: "asc" } }) : [];

  return (
    <>
      <AppHeader title="Einstellungen" subtitle="Firmen- und persönliche Umgebung" session={session} />
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
        <section className="rounded-lg border border-ink-200 bg-white p-5 shadow-panel">
          <h2 className="font-semibold text-ink-900">Firma</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-ink-500">Name</dt><dd className="font-medium text-ink-900">{tenant?.name ?? "—"}</dd></div>
            <div><dt className="text-ink-500">UID</dt><dd className="font-medium text-ink-900">{tenant?.uidNumber ?? "—"}</dd></div>
            <div><dt className="text-ink-500">Exportziel</dt><dd className="font-medium text-ink-900">{tenant?.defaultExportTarget ?? "—"}</dd></div>
          </dl>
        </section>
        <section className="rounded-lg border border-ink-200 bg-white p-5 shadow-panel">
          <h2 className="font-semibold text-ink-900">Persönliche Umgebung</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-ink-500">Benutzer</dt><dd className="font-medium text-ink-900">{session.displayName}</dd></div>
            <div><dt className="text-ink-500">Rolle</dt><dd className="font-medium text-ink-900">{session.role}</dd></div>
          </dl>
        </section>
        {users.length > 0 ? (
          <section className="rounded-lg border border-ink-200 bg-white p-5 shadow-panel lg:col-span-2">
            <h2 className="font-semibold text-ink-900">Firmenuser</h2>
            {params.created ? <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Nutzer erstellt: {params.created}</div> : null}
            {params.error ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</div> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {users.map((user) => (
                <div key={user.id} className="rounded-md border border-ink-200 p-3 text-sm">
                  <div className="font-medium text-ink-900">{user.displayName}</div>
                  <div className="text-ink-500">{user.email} · {user.role}</div>
                </div>
              ))}
            </div>
            <form action={createTenantUser} className="mt-5 grid gap-3 border-t border-ink-200 pt-5 md:grid-cols-5">
              <input name="email" placeholder="E-Mail" className="rounded-md border border-ink-300 px-3 py-2 text-sm" required />
              <input name="username" placeholder="Username" className="rounded-md border border-ink-300 px-3 py-2 text-sm" required />
              <input name="displayName" placeholder="Name" className="rounded-md border border-ink-300 px-3 py-2 text-sm" required />
              <input name="password" placeholder="Temp. Passwort" className="rounded-md border border-ink-300 px-3 py-2 text-sm" required />
              <select name="role" className="rounded-md border border-ink-300 px-3 py-2 text-sm">
                {["ACCOUNTANT", "REVIEWER", "VIEWER"].map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <button className="rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white md:col-span-5">Firmenuser erstellen</button>
            </form>
          </section>
        ) : null}
      </div>
    </>
  );
}

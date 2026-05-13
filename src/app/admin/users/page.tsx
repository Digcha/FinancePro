import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { hashPassword } from "@/lib/auth/password";
import { requireSuperAdmin } from "@/lib/auth/session";
import { licenseService } from "@/lib/license/license-service";
import { prisma } from "@/lib/prisma";

function tempPassword() {
  return `Temp${Math.random().toString(36).slice(2, 8)}1!`;
}

async function createUser(formData: FormData) {
  "use server";
  const session = await requireSuperAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const limit = await licenseService.canCreateUser(tenantId);
  if (!limit.allowed) {
    redirect(`/admin/users?error=${encodeURIComponent(limit.message ?? "Seat-Limit erreicht")}`);
  }

  const password = String(formData.get("password") || tempPassword());
  const user = await prisma.user.create({
    data: {
      tenantId,
      email: String(formData.get("email") ?? "").toLowerCase(),
      username: String(formData.get("username") ?? "").toLowerCase(),
      displayName: String(formData.get("displayName") ?? ""),
      role: String(formData.get("role") ?? "ACCOUNTANT"),
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      createdByUserId: session.userId
    }
  });
  await prisma.platformAuditLog.create({
    data: {
      tenantId,
      actorUserId: session.userId,
      action: "USER_CREATED",
      targetType: "User",
      targetId: user.id,
      description: `Nutzer ${user.email} wurde erstellt.`
    }
  });
  redirect(`/admin/users?created=${encodeURIComponent(user.email)}&temp=${encodeURIComponent(password)}`);
}

async function deactivateUser(formData: FormData) {
  "use server";
  const session = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.update({ where: { id: userId }, data: { status: "inactive" } });
  await prisma.platformAuditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: session.userId,
      action: "USER_DEACTIVATED",
      targetType: "User",
      targetId: user.id,
      description: `Nutzer ${user.email} wurde deaktiviert.`
    }
  });
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSuperAdmin();
  const params = await searchParams;
  const [users, tenants] = await Promise.all([
    prisma.user.findMany({ include: { tenant: true }, orderBy: [{ role: "asc" }, { email: "asc" }] }),
    prisma.tenant.findMany({ where: { status: "active" }, orderBy: { name: "asc" } })
  ]);

  return (
    <>
      <AppHeader title="Nutzer" subtitle="Accounts pro Firma und Seat-Limits" session={session} showUpload={false} />
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[380px_1fr] lg:p-8">
        <section className="rounded-lg border border-ink-200 bg-white p-5 shadow-panel">
          <h2 className="font-semibold text-ink-900">Nutzer erstellen</h2>
          {params.created ? <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Erstellt: {params.created}<br />Temporäres Passwort: <strong>{params.temp}</strong></div> : null}
          {params.error ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</div> : null}
          <form action={createUser} className="mt-4 space-y-3">
            <select name="tenantId" className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm" required>
              <option value="">Firma auswählen</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
            {["email", "username", "displayName", "password"].map((name) => (
              <input key={name} name={name} placeholder={name} className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm" required={name !== "password"} />
            ))}
            <select name="role" className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm">
              {["TENANT_ADMIN", "ACCOUNTANT", "REVIEWER", "VIEWER"].map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <button className="w-full rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white">Erstellen</button>
          </form>
        </section>
        <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <tbody className="divide-y divide-ink-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4"><div className="font-medium text-ink-900">{user.displayName}</div><div className="text-ink-500">{user.email}</div></td>
                  <td className="px-5 py-4 text-ink-600">{user.tenant?.name ?? "Platform"}</td>
                  <td className="px-5 py-4 text-ink-600">{user.role}</td>
                  <td className="px-5 py-4"><StatusPill tone={user.status === "active" ? "success" : "danger"}>{user.status}</StatusPill></td>
                  <td className="px-5 py-4">
                    {user.role !== "SUPER_ADMIN" && user.status === "active" ? (
                      <form action={deactivateUser}><input type="hidden" name="userId" value={user.id} /><button className="text-sm font-semibold text-red-700">Deaktivieren</button></form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

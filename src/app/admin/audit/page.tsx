import { AppHeader } from "@/components/layout/AppHeader";
import { formatDate } from "@/lib/format";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditPage() {
  const session = await requireSuperAdmin();
  const logs = await prisma.platformAuditLog.findMany({ include: { tenant: true, actor: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <AppHeader title="Audit" subtitle="Plattform- und Support-Aktionen" session={session} showUpload={false} />
      <div className="p-4 sm:p-6 lg:p-8">
        <section className="rounded-lg border border-ink-200 bg-white shadow-panel">
          {logs.map((log) => (
            <div key={log.id} className="border-b border-ink-100 px-5 py-4 text-sm last:border-b-0">
              <div className="font-semibold text-ink-900">{log.action}</div>
              <div className="mt-1 text-ink-600">{log.description}</div>
              <div className="mt-1 text-xs text-ink-500">{formatDate(log.createdAt)} · {log.tenant?.name ?? "Platform"} · {log.actor?.username ?? "System"}</div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

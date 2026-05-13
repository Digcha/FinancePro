import { AppHeader } from "@/components/layout/AppHeader";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminUsagePage() {
  const session = await requireSuperAdmin();
  const usage = await prisma.usageRecord.findMany({ include: { tenant: true }, orderBy: [{ period: "desc" }, { updatedAt: "desc" }] });
  return (
    <>
      <AppHeader title="Nutzung" subtitle="Uploads, AI-Analysen und Speicherverbrauch" session={session} showUpload={false} />
      <div className="p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-500"><tr><th className="px-5 py-3 text-left">Firma</th><th className="px-5 py-3 text-left">Periode</th><th className="px-5 py-3 text-left">Uploads</th><th className="px-5 py-3 text-left">AI</th><th className="px-5 py-3 text-left">Speicher MB</th></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {usage.map((record) => (
                <tr key={record.id}><td className="px-5 py-4">{record.tenant.name}</td><td className="px-5 py-4">{record.period}</td><td className="px-5 py-4">{record.invoicesUploaded}</td><td className="px-5 py-4">{record.aiAnalyses}</td><td className="px-5 py-4">{record.storageUsedMb.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

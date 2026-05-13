import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminSystemPage() {
  const session = await requireSuperAdmin();
  const failed = await prisma.invoice.findMany({
    where: { OR: [{ aiStatus: "failed" }, { validationStatus: "error" }] },
    include: { tenant: true },
    orderBy: { updatedAt: "desc" },
    take: 50
  });
  return (
    <>
      <AppHeader title="System" subtitle="Fehler, Health und technische Hinweise" session={session} showUpload={false} />
      <div className="p-4 sm:p-6 lg:p-8">
        <section className="rounded-lg border border-ink-200 bg-white shadow-panel">
          {failed.map((invoice) => (
            <Link key={invoice.id} href={`/app/invoices/${invoice.id}`} className="block border-b border-ink-100 px-5 py-4 text-sm hover:bg-ink-50 last:border-b-0">
              <div className="font-semibold text-ink-900">{invoice.tenant.name} · {invoice.originalFileName ?? invoice.invoiceNumber ?? invoice.id}</div>
              <div className="mt-1 text-ink-600">{invoice.aiStatus === "failed" ? invoice.aiErrorMessage ?? "AI Analyse fehlgeschlagen" : "Validierung mit Fehlern"}</div>
            </Link>
          ))}
          {failed.length === 0 ? <div className="p-8 text-center text-sm text-ink-500">Keine Systemfehler gefunden.</div> : null}
        </section>
      </div>
    </>
  );
}

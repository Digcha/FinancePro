import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/auth/session";
import { getInvoices } from "@/server/repositories/invoiceRepository";

export default async function ApprovalsPage() {
  const session = await requireUser();
  const invoices = (await getInvoices(session)).filter((invoice) => ["ready_for_approval", "approval_requested"].includes(invoice.status));

  return (
    <>
      <AppHeader title="Freigaben" subtitle="Rechnungen, die bereit für Review oder Entscheidung sind" session={session} />
      <div className="p-4 sm:p-6 lg:p-8">
        <section className="rounded-lg border border-ink-200 bg-white shadow-panel">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 px-5 py-4 last:border-b-0">
              <div>
                <Link href={`/app/invoices/${invoice.id}`} className="font-semibold text-ink-900 hover:text-trust-700">
                  {invoice.supplierName ?? "Unbekannter Lieferant"}
                </Link>
                <div className="mt-1 text-sm text-ink-500">
                  {invoice.invoiceNumber ?? "ohne Nummer"} · {formatMoney(invoice.grossAmount, invoice.currency)}
                </div>
              </div>
              <StatusPill tone="warning">{invoice.status.replace(/_/g, " ")}</StatusPill>
            </div>
          ))}
          {invoices.length === 0 ? <div className="p-8 text-center text-sm text-ink-500">Keine offenen Freigaben.</div> : null}
        </section>
      </div>
    </>
  );
}

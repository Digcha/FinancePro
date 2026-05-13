import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/auth/session";
import { getExportRecords, getInvoices } from "@/server/repositories/invoiceRepository";

export default async function AppExportsPage() {
  const session = await requireUser();
  const [exports, invoices] = await Promise.all([getExportRecords(session), getInvoices(session)]);
  const ready = invoices.filter((invoice) => invoice.exportApproved || invoice.status === "export_ready");

  return (
    <>
      <AppHeader title="Exporte" subtitle="Freigegebene Rechnungen und Exportprotokoll" session={session} />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-lg border border-ink-200 bg-white shadow-panel">
          <div className="border-b border-ink-200 px-5 py-4 font-semibold text-ink-900">Exportbereit</div>
          {ready.map((invoice) => (
            <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 px-5 py-4 last:border-b-0">
              <div>
                <Link href={`/app/invoices/${invoice.id}`} className="font-semibold text-ink-900 hover:text-trust-700">
                  {invoice.supplierName ?? "Unbekannter Lieferant"}
                </Link>
                <div className="mt-1 text-sm text-ink-500">
                  {invoice.invoiceNumber ?? "ohne Nummer"} · {formatMoney(invoice.grossAmount, invoice.currency)}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/api/app/invoices/${invoice.id}/export?target=GENERIC_CSV&format=csv`} className="rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white">
                  CSV
                </a>
                <a href={`/api/app/invoices/${invoice.id}/export?target=GENERIC_JSON&format=json`} className="rounded-md border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700">
                  JSON
                </a>
              </div>
            </div>
          ))}
          {ready.length === 0 ? <div className="p-8 text-center text-sm text-ink-500">Keine exportbereiten Rechnungen.</div> : null}
        </section>

        <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
          <div className="border-b border-ink-200 px-5 py-4 font-semibold text-ink-900">Exportprotokoll</div>
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <tbody className="divide-y divide-ink-100">
              {exports.map((record) => (
                <tr key={record.id}>
                  <td className="px-5 py-4 font-medium text-ink-900">{record.fileName ?? "Export"}</td>
                  <td className="px-5 py-4 text-ink-600">{record.targetSystem}</td>
                  <td className="px-5 py-4">
                    <StatusPill tone={record.status === "generated" ? "success" : "warning"}>{record.status}</StatusPill>
                  </td>
                  <td className="px-5 py-4 text-ink-500">{formatDate(record.createdAt)}</td>
                </tr>
              ))}
              {exports.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-ink-500">Noch keine Exporte erzeugt.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

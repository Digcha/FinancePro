import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";
import { getExportRecords, getInvoices } from "@/server/repositories/invoiceRepository";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const [exports, invoices] = await Promise.all([getExportRecords(), getInvoices()]);
  const exportable = invoices.filter(
    (invoice) =>
      invoice.validationResults.every((result) => result.severity !== "error") &&
      (invoice.status === "approved" || invoice.exportApproved || invoice.bookingSuggestion?.status === "approved")
  );

  return (
    <>
      <AppHeader title="Exporte" subtitle="CSV- und JSON-Dateien für BMD, RZL, domizil+ und Business Central" />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Panel>
          <PanelHeader title="Exportbereite Belege">
            Export bleibt an Prüfung und Freigabe gebunden.
          </PanelHeader>
          <div className="divide-y divide-ink-100">
            {exportable.map((invoice) => (
              <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <Link href={`/invoices/${invoice.id}`} className="font-semibold text-ink-900 hover:text-trust-700">
                    {invoice.supplierName ?? "Unbekannter Lieferant"}
                  </Link>
                  <div className="mt-1 text-sm text-ink-500">
                    {invoice.invoiceNumber ?? "ohne Nummer"} · {formatMoney(invoice.grossAmount, invoice.currency)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/invoices/${invoice.id}/export?target=BMD&format=csv`}
                    className="focus-ring rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800"
                  >
                    BMD CSV
                  </a>
                  <a
                    href={`/api/invoices/${invoice.id}/export?target=BUSINESS_CENTRAL&format=json`}
                    className="focus-ring rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                  >
                    BC JSON
                  </a>
                </div>
              </div>
            ))}
            {exportable.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-500">Keine freigegebenen Belege ohne Fehler.</div>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Erzeugte Exporte" />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Datei</th>
                  <th className="px-5 py-3 text-left font-semibold">Zielsystem</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Beleg</th>
                  <th className="px-5 py-3 text-left font-semibold">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {exports.map((record) => (
                  <tr key={record.id}>
                    <td className="px-5 py-4 font-medium text-ink-900">{record.fileName ?? "—"}</td>
                    <td className="px-5 py-4 text-ink-700">{record.targetSystem}</td>
                    <td className="px-5 py-4">
                      <StatusPill tone={record.status === "created" ? "success" : "warning"}>{record.status}</StatusPill>
                    </td>
                    <td className="px-5 py-4 text-ink-700">{record.invoice.invoiceNumber ?? record.invoice.supplierName}</td>
                    <td className="px-5 py-4 text-ink-500">{formatDate(record.createdAt)}</td>
                  </tr>
                ))}
                {exports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-500">
                      Noch keine Exportdateien erzeugt.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}

import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { documentTypeLabel, formatDate, formatMoney, riskLabel, statusLabel } from "@/lib/format";
import { getInvoices } from "@/server/repositories/invoiceRepository";
import { PageCompletenessBadge } from "@/components/invoices/PageCompletenessBadge";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <>
      <AppHeader title="Rechnungen" subtitle="Demo-Belege und hochgeladene Dokumentgruppen" />
      <div className="p-4 sm:p-6 lg:p-8">
        <Panel>
          <PanelHeader title="Belegliste">
            Mehrseitige Dokumente werden als ein Invoice-Datensatz mit mehreren Seiten geführt.
          </PanelHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Lieferant</th>
                  <th className="px-5 py-3 text-left font-semibold">Nummer</th>
                  <th className="px-5 py-3 text-left font-semibold">Typ</th>
                  <th className="px-5 py-3 text-left font-semibold">Seiten</th>
                  <th className="px-5 py-3 text-left font-semibold">Validierung</th>
                  <th className="px-5 py-3 text-left font-semibold">Risiko</th>
                  <th className="px-5 py-3 text-right font-semibold">Brutto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-ink-50">
                    <td className="px-5 py-4">
                      <Link href={`/invoices/${invoice.id}`} className="font-semibold text-ink-900 hover:text-trust-700">
                        {invoice.supplierName ?? "Unbekannter Lieferant"}
                      </Link>
                      <div className="mt-1 text-xs text-ink-500">
                        {formatDate(invoice.invoiceDate)} · {statusLabel(invoice.status)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink-700">{invoice.invoiceNumber ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink-700">{documentTypeLabel(invoice.documentType)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <PageCompletenessBadge pages={invoice.pages} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusPill tone={invoice.validationStatus === "valid" ? "success" : invoice.validationStatus === "error" ? "danger" : "warning"}>
                        {invoice.validationStatus}
                      </StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusPill tone={invoice.riskLevel === "high" ? "danger" : invoice.riskLevel === "medium" ? "warning" : "success"}>
                        {riskLabel(invoice.riskLevel)}
                      </StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-ink-900">
                      {formatMoney(invoice.grossAmount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}

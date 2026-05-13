import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, ShieldAlert } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { documentTypeLabel, formatDate, formatMoney, riskLabel, statusLabel } from "@/lib/format";
import { getDashboardData } from "@/server/repositories/invoiceRepository";

const metricIcons = [FileText, CheckCircle2, AlertTriangle, ShieldAlert];

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { metrics, newest, statusDistribution } = await getDashboardData();
  const metricItems = [
    { label: "Gesamtanzahl Rechnungen", value: metrics.total, tone: "neutral" },
    { label: "Gültige Rechnungen", value: metrics.valid, tone: "success" },
    { label: "Rechnungen mit Warnungen", value: metrics.warnings, tone: "warning" },
    { label: "Rechnungen mit hohem Risiko", value: metrics.highRisk, tone: "danger" }
  ] as const;

  return (
    <>
      <AppHeader title="Dashboard" subtitle="Eingangsrechnungen, Prüfstatus und Exportbereitschaft" />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricItems.map((item, index) => {
            const Icon = metricIcons[index];
            return (
              <div key={item.label} className="rounded-lg border border-ink-200 bg-white p-5 shadow-panel">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-ink-500">{item.label}</div>
                  <Icon className="h-5 w-5 text-ink-400" aria-hidden="true" />
                </div>
                <div className="mt-4 text-3xl font-semibold text-ink-900">{item.value}</div>
              </div>
            );
          })}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Panel>
            <PanelHeader title="Neueste Uploads">
              Rechnungen bleiben bis zur menschlichen Prüfung im Review-Status.
            </PanelHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-200 text-sm">
                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Beleg</th>
                    <th className="px-5 py-3 text-left font-semibold">Typ</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Brutto</th>
                    <th className="px-5 py-3 text-left font-semibold">Risiko</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 bg-white">
                  {newest.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-ink-50">
                      <td className="px-5 py-4">
                        <Link href={`/invoices/${invoice.id}`} className="font-semibold text-ink-900 hover:text-trust-700">
                          {invoice.supplierName ?? "Unbekannter Lieferant"}
                        </Link>
                        <div className="mt-1 text-xs text-ink-500">
                          {invoice.invoiceNumber ?? "ohne Nummer"} · {formatDate(invoice.invoiceDate)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-ink-700">{documentTypeLabel(invoice.documentType)}</td>
                      <td className="px-5 py-4">
                        <StatusPill tone={invoice.validationStatus === "valid" ? "success" : invoice.validationStatus === "error" ? "danger" : "warning"}>
                          {statusLabel(invoice.status)}
                        </StatusPill>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-ink-900">
                        {formatMoney(invoice.grossAmount, invoice.currency)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill tone={invoice.riskLevel === "high" ? "danger" : invoice.riskLevel === "medium" ? "warning" : "success"}>
                          {riskLabel(invoice.riskLevel)}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Statusverteilung" />
            <div className="space-y-3 p-5">
              {Object.entries(statusDistribution).map(([status, count]) => (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-700">{statusLabel(status)}</span>
                    <span className="text-ink-500">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100">
                    <div
                      className="h-2 rounded-full bg-trust-600"
                      style={{ width: `${metrics.total ? (count / metrics.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

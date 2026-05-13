import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate, formatMoney, statusLabel } from "@/lib/format";
import { requireUser } from "@/lib/auth/session";
import { getInvoices } from "@/server/repositories/invoiceRepository";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await requireUser();
  const invoices = await getInvoices(session);

  return (
    <>
      <AppHeader title="Eingang" subtitle="Offene Rechnungen, Prüfstatus und Zuständigkeit" session={session} />
      <div className="p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
          <div className="border-b border-ink-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">Rechnungseingang</h2>
            <p className="mt-1 text-sm text-ink-500">Normale Nutzer sehen ausschließlich Belege ihrer eigenen Firma.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="bg-ink-50 text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Beleg</th>
                  <th className="px-5 py-3 text-left font-semibold">Lieferant</th>
                  <th className="px-5 py-3 text-left font-semibold">Datum</th>
                  <th className="px-5 py-3 text-right font-semibold">Betrag</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Probleme</th>
                  <th className="px-5 py-3 text-left font-semibold">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {invoices.map((invoice) => {
                  const openFields = invoice.extractedFields.filter((field) => field.needsReview || field.status === "missing" || field.status === "low_confidence").length;
                  const errors = invoice.validationResults.filter((result) => result.severity === "error").length;
                  return (
                    <tr key={invoice.id} className="hover:bg-ink-50">
                      <td className="px-5 py-4 font-medium text-ink-900">{invoice.invoiceNumber ?? "ohne Nummer"}</td>
                      <td className="px-5 py-4 text-ink-700">{invoice.supplierName ?? "Unbekannt"}</td>
                      <td className="px-5 py-4 text-ink-500">{formatDate(invoice.invoiceDate)}</td>
                      <td className="px-5 py-4 text-right font-medium text-ink-900">{formatMoney(invoice.grossAmount, invoice.currency)}</td>
                      <td className="px-5 py-4">
                        <StatusPill tone={invoice.status === "exported" ? "success" : invoice.status === "rejected" ? "danger" : "warning"}>
                          {statusLabel(invoice.status)}
                        </StatusPill>
                      </td>
                      <td className="px-5 py-4 text-ink-600">
                        {errors > 0 ? `${errors} blockierend` : openFields > 0 ? `${openFields} Felder prüfen` : "keine offenen Punkte"}
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/app/invoices/${invoice.id}`} className="font-semibold text-trust-700 hover:text-trust-600">
                          Öffnen
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-500">
                      Noch keine Rechnungen vorhanden.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

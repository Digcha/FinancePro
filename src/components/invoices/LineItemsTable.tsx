import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { formatMoney } from "@/lib/format";

export function LineItemsTable({ invoice }: { invoice: InvoiceWithRelations }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-ink-200 text-sm">
        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Pos.</th>
            <th className="px-4 py-3 text-left font-semibold">Beschreibung</th>
            <th className="px-4 py-3 text-right font-semibold">Menge</th>
            <th className="px-4 py-3 text-right font-semibold">EP</th>
            <th className="px-4 py-3 text-right font-semibold">Rabatt</th>
            <th className="px-4 py-3 text-right font-semibold">Netto</th>
            <th className="px-4 py-3 text-right font-semibold">USt</th>
            <th className="px-4 py-3 text-right font-semibold">Brutto</th>
            <th className="px-4 py-3 text-right font-semibold">Seite</th>
            <th className="px-4 py-3 text-right font-semibold">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 bg-white">
          {invoice.lineItems.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-ink-900">{item.positionNumber ?? "—"}</td>
              <td className="min-w-72 px-4 py-3 text-ink-700">
                <div>{item.description}</div>
                {item.duration ? <div className="mt-1 text-xs text-ink-500">{item.duration}</div> : null}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink-700">
                {item.quantity ?? "—"} {item.unit ?? ""}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink-700">
                {formatMoney(item.unitPrice, invoice.currency)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink-700">
                {typeof item.discountPercent === "number" ? `${item.discountPercent}%` : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-ink-900">
                {formatMoney(item.netAmount, invoice.currency)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink-700">
                {typeof item.taxRate === "number" ? `${item.taxRate}%` : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-ink-900">
                {formatMoney(item.grossAmount, invoice.currency)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink-500">{item.sourcePageNumber ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink-500">{Math.round(item.confidence * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoice.lineItems.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-ink-500">Keine Positionen sicher erkannt.</div>
      ) : null}
    </div>
  );
}

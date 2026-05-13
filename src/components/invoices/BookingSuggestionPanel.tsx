import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

export function BookingSuggestionPanel({ invoice }: { invoice: InvoiceWithRelations }) {
  const booking = invoice.bookingSuggestion;

  if (!booking) {
    return <div className="p-5 text-sm text-ink-500">Kein Buchungsvorschlag vorhanden.</div>;
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-ink-900">{booking.bookingText}</div>
          <div className="mt-1 text-xs text-ink-500">Buchungsdatum {formatDate(booking.bookingDate)}</div>
        </div>
        <StatusPill tone={booking.status === "approved" ? "success" : "warning"}>{booking.status}</StatusPill>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-ink-50 p-3">
          <dt className="text-xs text-ink-500">Lieferant</dt>
          <dd className="mt-1 font-semibold text-ink-900">{booking.supplier ?? "—"}</dd>
        </div>
        <div className="rounded-md bg-ink-50 p-3">
          <dt className="text-xs text-ink-500">Belegnummer</dt>
          <dd className="mt-1 font-semibold text-ink-900">{booking.documentNumber ?? "—"}</dd>
        </div>
        <div className="rounded-md bg-ink-50 p-3">
          <dt className="text-xs text-ink-500">Aufwandskonto</dt>
          <dd className="mt-1 font-semibold text-ink-900">{booking.expenseAccount ?? "—"}</dd>
        </div>
        <div className="rounded-md bg-ink-50 p-3">
          <dt className="text-xs text-ink-500">Steuerkonto</dt>
          <dd className="mt-1 font-semibold text-ink-900">{booking.taxAccount ?? "—"}</dd>
        </div>
        <div className="rounded-md bg-ink-50 p-3">
          <dt className="text-xs text-ink-500">Lieferantenkonto</dt>
          <dd className="mt-1 font-semibold text-ink-900">{booking.supplierAccount ?? "—"}</dd>
        </div>
        <div className="rounded-md bg-ink-50 p-3">
          <dt className="text-xs text-ink-500">Brutto</dt>
          <dd className="mt-1 font-semibold text-ink-900">{formatMoney(booking.grossAmount, invoice.currency)}</dd>
        </div>
      </dl>
    </div>
  );
}

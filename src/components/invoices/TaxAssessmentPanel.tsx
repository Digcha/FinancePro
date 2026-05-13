import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { formatMoney } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

export function TaxAssessmentPanel({ invoice }: { invoice: InvoiceWithRelations }) {
  const taxResults = invoice.validationResults.filter(
    (result) => result.field === "taxAmount" || result.field === "grossAmount"
  );
  const zeroTax = (invoice.taxAmount ?? 0) === 0 || (invoice.taxRate ?? 0) === 0;
  const difference =
    typeof invoice.netAmount === "number" && typeof invoice.taxAmount === "number" && typeof invoice.grossAmount === "number"
      ? invoice.netAmount + invoice.taxAmount - invoice.grossAmount
      : null;

  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-ink-50 p-3">
          <div className="text-xs text-ink-500">Netto</div>
          <div className="mt-1 font-semibold text-ink-900">{formatMoney(invoice.netAmount, invoice.currency)}</div>
        </div>
        <div className="rounded-md bg-ink-50 p-3">
          <div className="text-xs text-ink-500">USt</div>
          <div className="mt-1 font-semibold text-ink-900">{formatMoney(invoice.taxAmount, invoice.currency)}</div>
        </div>
        <div className="rounded-md bg-ink-50 p-3">
          <div className="text-xs text-ink-500">Brutto</div>
          <div className="mt-1 font-semibold text-ink-900">{formatMoney(invoice.grossAmount, invoice.currency)}</div>
        </div>
        <div className="rounded-md bg-ink-50 p-3">
          <div className="text-xs text-ink-500">Differenz</div>
          <div className="mt-1 font-semibold text-ink-900">{formatMoney(difference, invoice.currency)}</div>
        </div>
      </div>
      {zeroTax ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <div className="font-semibold">0,00-USt-Fall</div>
          <div className="mt-1">{invoice.zeroTaxReason ?? "Keine ausreichende Begründung erkannt."}</div>
        </div>
      ) : null}
      <div className="space-y-2">
        {taxResults.map((result) => (
          <div key={result.id} className="flex items-start justify-between gap-4 rounded-md border border-ink-200 p-3">
            <div className="text-sm text-ink-700">{result.explanation}</div>
            <StatusPill
              tone={result.severity === "error" ? "danger" : result.severity === "warning" ? "warning" : "success"}
            >
              {result.status}
            </StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}

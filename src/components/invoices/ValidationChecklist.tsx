import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { StatusPill } from "@/components/ui/StatusPill";

export function ValidationChecklist({ invoice }: { invoice: InvoiceWithRelations }) {
  return (
    <div className="divide-y divide-ink-100">
      {invoice.validationResults.map((result) => (
        <div key={result.id} className="flex items-start justify-between gap-4 px-5 py-3">
          <div>
            <div className="text-sm font-medium text-ink-900">{result.field}</div>
            <div className="mt-1 text-sm leading-5 text-ink-600">{result.explanation}</div>
            <div className="mt-1 text-xs text-ink-500">
              {result.sourcePageNumber ? `Quelle Seite ${result.sourcePageNumber}` : "Quelle nicht eindeutig"}
            </div>
          </div>
          <StatusPill
            tone={result.severity === "error" ? "danger" : result.severity === "warning" ? "warning" : "success"}
          >
            {result.status}
          </StatusPill>
        </div>
      ))}
    </div>
  );
}

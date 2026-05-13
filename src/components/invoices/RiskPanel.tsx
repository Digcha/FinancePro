import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { riskLabel } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

export function RiskPanel({ invoice }: { invoice: InvoiceWithRelations }) {
  if (invoice.riskIndicators.length === 0) {
    return (
      <div className="p-5">
        <StatusPill tone="success">Keine erhöhten Risiken</StatusPill>
      </div>
    );
  }

  return (
    <div className="divide-y divide-ink-100">
      {invoice.riskIndicators.map((risk) => (
        <div key={risk.id} className="px-5 py-4">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div className="font-semibold text-ink-900">{risk.title}</div>
            <StatusPill tone={risk.severity === "high" ? "danger" : risk.severity === "medium" ? "warning" : "info"}>
              {riskLabel(risk.severity)}
            </StatusPill>
          </div>
          <div className="text-sm leading-6 text-ink-700">{risk.description}</div>
          <div className="mt-3 rounded-md bg-ink-50 p-3 text-xs leading-5 text-ink-600">
            <span className="font-semibold text-ink-800">Empfehlung:</span> {risk.recommendation}
            <br />
            <span className="font-semibold text-ink-800">Grund:</span> {risk.reason}
          </div>
        </div>
      ))}
    </div>
  );
}

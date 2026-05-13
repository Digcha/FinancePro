import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { percent } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

export function DocumentQualityPanel({ invoice }: { invoice: InvoiceWithRelations }) {
  return (
    <div className="divide-y divide-ink-100">
      {invoice.pages.map((page) => (
        <div key={page.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
          <div>
            <div className="font-medium text-ink-900">Seite {page.pageNumberDetected ?? "?"}</div>
            <div className="text-xs text-ink-500">
              Schärfe {percent(page.sharpnessScore)} · Vollständigkeit {percent(page.completenessScore)} · Perspektive{" "}
              {percent(page.perspectiveScore)}
            </div>
          </div>
          <StatusPill tone={page.qualityStatus === "accepted" ? "success" : page.qualityStatus === "warning" ? "warning" : "danger"}>
            {page.qualityStatus}
          </StatusPill>
        </div>
      ))}
    </div>
  );
}

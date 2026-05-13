import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageCompletenessBadge } from "./PageCompletenessBadge";

export function MultiPageMergePanel({ invoice }: { invoice: InvoiceWithRelations }) {
  const pageCount = invoice.pages.length;
  const total = Math.max(...invoice.pages.map((page) => page.totalPagesDetected ?? pageCount), pageCount);
  const finalSumPage = invoice.pages.find((page) =>
    page.extractedText.toLowerCase().includes("finale summenbox")
  )?.pageNumberDetected;

  return (
    <div className="space-y-3 p-5 text-sm">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={pageCount > 1 ? "info" : "neutral"}>
          {pageCount > 1 ? "Mehrseiten-Beleg" : "Einzelseite"}
        </StatusPill>
        <PageCompletenessBadge pages={invoice.pages} />
        {finalSumPage ? <StatusPill tone="success">Summenbox Seite {finalSumPage}</StatusPill> : null}
      </div>
      <div className="rounded-md border border-ink-200 bg-ink-50 p-3 leading-6 text-ink-700">
        Gruppiert als ein Beleg mit {pageCount} gespeicherten Seite(n) und {total} erkannter Gesamtseite(n).
        Positionen bleiben mit Seitenherkunft gespeichert.
      </div>
    </div>
  );
}

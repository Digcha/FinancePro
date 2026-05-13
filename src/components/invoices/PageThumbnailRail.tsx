import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { cn, percent } from "@/lib/format";

export function PageThumbnailRail({ pages }: { pages: InvoiceWithRelations["pages"] }) {
  return (
    <div className="flex gap-3 overflow-x-auto border-b border-ink-200 bg-white p-3 lg:block lg:w-32 lg:space-y-3 lg:overflow-x-visible lg:border-b-0 lg:border-r">
      {pages.map((page) => (
        <a
          key={page.id}
          href={`#page-${page.id}`}
          className={cn(
            "block min-w-24 rounded-md border bg-ink-50 p-2 transition hover:border-trust-300 hover:bg-trust-50",
            page.qualityStatus === "accepted" ? "border-ink-200" : "border-amber-300"
          )}
        >
          <div className="aspect-[3/4] rounded bg-white shadow-inner">
            <div className="h-full p-2">
              <div className="mb-2 h-2 w-10 rounded bg-ink-300" />
              <div className="space-y-1">
                <div className="h-1.5 rounded bg-ink-200" />
                <div className="h-1.5 w-4/5 rounded bg-ink-200" />
                <div className="h-1.5 w-3/5 rounded bg-ink-200" />
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs font-semibold text-ink-800">
            Seite {page.pageNumberDetected ?? "?"}
          </div>
          <div className="text-[11px] text-ink-500">Schärfe {percent(page.sharpnessScore)}</div>
        </a>
      ))}
    </div>
  );
}

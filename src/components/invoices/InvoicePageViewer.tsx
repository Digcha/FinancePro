import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { documentTypeLabel } from "@/lib/format";
import { PageCompletenessBadge } from "./PageCompletenessBadge";

export function InvoicePageViewer({ invoice }: { invoice: InvoiceWithRelations }) {
  return (
    <div className="min-w-0 flex-1 bg-ink-100 p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Dokumentvorschau</div>
          <div className="text-sm font-semibold text-ink-900">{documentTypeLabel(invoice.documentType)}</div>
        </div>
        <PageCompletenessBadge pages={invoice.pages} />
      </div>
      <div className="space-y-5">
        {invoice.pages.map((page) => (
          <article
            id={`page-${page.id}`}
            key={page.id}
            className="mx-auto max-w-3xl rounded-md border border-ink-200 bg-white p-8 shadow-panel"
          >
            <div className="mb-8 flex items-start justify-between gap-6 border-b border-ink-200 pb-5">
              <div>
                <div className="text-lg font-bold text-ink-900">{invoice.supplierName ?? "Unbekannter Lieferant"}</div>
                <div className="mt-1 max-w-sm text-sm leading-5 text-ink-500">{invoice.supplierAddress ?? "Adresse nicht erkannt"}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold text-ink-900">{invoice.invoiceNumber ?? "Ohne Rechnungsnummer"}</div>
                <div className="mt-1 text-ink-500">
                  Seite {page.pageNumberDetected ?? "?"}/{page.totalPagesDetected ?? invoice.pages.length}
                </div>
              </div>
            </div>
            <div className="grid gap-8 md:grid-cols-[1fr_220px]">
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">OCR-Auszug</div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-ink-700">{page.extractedText}</p>
              </div>
              <div className="rounded-md border border-ink-200 bg-ink-50 p-4 text-sm">
                <div className="mb-3 font-semibold text-ink-900">Seitensignale</div>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Qualität</dt>
                    <dd className="font-medium text-ink-800">{page.qualityStatus}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Schärfe</dt>
                    <dd className="font-medium text-ink-800">{Math.round(page.sharpnessScore * 100)}%</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Vollständigkeit</dt>
                    <dd className="font-medium text-ink-800">{Math.round(page.completenessScore * 100)}%</dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

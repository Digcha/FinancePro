import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { StatusPill } from "@/components/ui/StatusPill";

export function PageCompletenessBadge({ pages }: { pages: InvoiceWithRelations["pages"] }) {
  const detectedTotal = Math.max(...pages.map((page) => page.totalPagesDetected ?? pages.length), pages.length);
  const seen = new Set(pages.map((page) => page.pageNumberDetected).filter(Boolean));
  const missing: number[] = [];

  for (let pageNumber = 1; pageNumber <= detectedTotal; pageNumber += 1) {
    if (!seen.has(pageNumber)) {
      missing.push(pageNumber);
    }
  }

  if (missing.length > 0) {
    return <StatusPill tone="warning">Fehlende Seite {missing.join(", ")}</StatusPill>;
  }

  return <StatusPill tone="success">{pages.length}/{detectedTotal} Seiten</StatusPill>;
}

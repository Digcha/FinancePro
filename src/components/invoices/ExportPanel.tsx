"use client";

import { useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import type { ExportFormat, ExportTarget } from "@/server/domain/types";
import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { StatusPill } from "@/components/ui/StatusPill";

const targets: Array<{ value: ExportTarget; label: string }> = [
  { value: "BMD", label: "BMD" },
  { value: "RZL", label: "RZL" },
  { value: "DOMIZIL_PLUS", label: "domizil+" },
  { value: "BUSINESS_CENTRAL", label: "Business Central" }
];

export function ExportPanel({ invoice }: { invoice: InvoiceWithRelations }) {
  const [target, setTarget] = useState<ExportTarget>("BMD");
  const [format, setFormat] = useState<ExportFormat>("csv");

  const hasErrors = invoice.validationResults.some((result) => result.severity === "error");
  const hasWarnings = invoice.validationResults.some((result) => result.severity === "warning");
  const approved = invoice.status === "approved" || invoice.bookingSuggestion?.status === "approved" || invoice.exportApproved;
  const openReviewFields = invoice.extractedFields.some(
    (field) => field.needsReview || field.status === "missing" || field.status === "low_confidence"
  );
  const blocked = hasErrors || !approved || openReviewFields;
  const href = useMemo(
    () => `/api/invoices/${invoice.id}/export?target=${target}&format=${format}`,
    [format, invoice.id, target]
  );

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap gap-2">
        {blocked ? <StatusPill tone="danger">Export blockiert</StatusPill> : null}
        {!hasErrors && hasWarnings ? <StatusPill tone="warning">Warnungen prüfen</StatusPill> : null}
        {approved ? <StatusPill tone="success">Freigegeben</StatusPill> : <StatusPill tone="warning">Freigabe offen</StatusPill>}
        {openReviewFields ? <StatusPill tone="warning">Review-Felder offen</StatusPill> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-ink-500">Zielsystem</span>
          <select
            className="focus-ring w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm"
            value={target}
            onChange={(event) => setTarget(event.target.value as ExportTarget)}
          >
            {targets.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-ink-500">Format</span>
          <select
            className="focus-ring w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm"
            value={format}
            onChange={(event) => setFormat(event.target.value as ExportFormat)}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </label>
      </div>
      <div className="rounded-md border border-ink-200 bg-ink-50 p-3 text-xs leading-5 text-ink-600">
        Exportvorschau: {target} · {format.toUpperCase()} · Beleg {invoice.invoiceNumber ?? "ohne Nummer"} ·{" "}
        {invoice.bookingSuggestion?.bookingText ?? "kein Buchungstext"}
      </div>
      {blocked ? (
        <button
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-ink-200 px-3 py-2 text-sm font-semibold text-ink-500"
          type="button"
          disabled
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Review/Freigabe vor Export abschliessen
        </button>
      ) : (
        <a
          href={href}
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export herunterladen
        </a>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";

export function ReviewActionsPanel({ invoice }: { invoice: InvoiceWithRelations }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const hasErrors = invoice.validationResults.some((result) => result.severity === "error");
  const openFields = invoice.extractedFields.some(
    (field) => field.needsReview || field.status === "missing" || field.status === "low_confidence"
  );
  const disabled = hasErrors || openFields || isPending;

  function approve() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/invoices/${invoice.id}/approve`, {
        method: "POST"
      });
      const payload = (await response.json()) as { error?: string; blockers?: string[] };
      if (!response.ok || payload.error) {
        setMessage(payload.blockers?.join(" ") ?? payload.error ?? "Freigabe nicht moeglich.");
        return;
      }
      setMessage("Rechnung wurde freigegeben.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 p-5">
      <button
        type="button"
        disabled={disabled}
        onClick={approve}
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-ink-300"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Rechnung geprueft freigeben
      </button>
      {hasErrors ? <div className="text-xs leading-5 text-red-700">Offene Fehler blockieren die Freigabe.</div> : null}
      {openFields ? <div className="text-xs leading-5 text-amber-800">Reviewpflichtige Felder muessen bestaetigt oder korrigiert werden.</div> : null}
      {message ? <div className="text-xs leading-5 text-ink-600">{message}</div> : null}
    </div>
  );
}

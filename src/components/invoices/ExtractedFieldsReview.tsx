"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, FileSearch, Pencil, Save } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";

type ExtractedField = InvoiceWithRelations["extractedFields"][number];

function confidenceTone(confidence: number) {
  if (confidence >= 0.9) {
    return "success";
  }
  if (confidence >= 0.75) {
    return "info";
  }
  return "warning";
}

function statusTone(status: string) {
  if (status === "confirmed" || status === "corrected") {
    return "success";
  }
  if (status === "missing" || status === "low_confidence") {
    return "warning";
  }
  return "neutral";
}

export function ExtractedFieldsReview({ invoice }: { invoice: InvoiceWithRelations }) {
  const router = useRouter();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(invoice.extractedFields.map((field) => [field.fieldPath, field.finalValue ?? ""]))
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fields = useMemo(() => invoice.extractedFields, [invoice.extractedFields]);

  async function submit(field: ExtractedField, action: "correct" | "confirm") {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/invoices/${invoice.id}/fields`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          fieldPath: field.fieldPath,
          value: values[field.fieldPath] ?? field.finalValue,
          action
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok || payload.error) {
        setError(payload.error ?? "Feld konnte nicht gespeichert werden.");
        return;
      }
      setEditingField(null);
      router.refresh();
    });
  }

  if (fields.length === 0) {
    return (
      <div className="p-5 text-sm leading-6 text-ink-600">
        Keine strukturierten AI-Felder gespeichert. Starte die Analyse erneut oder pruefe den Beleg manuell.
      </div>
    );
  }

  return (
    <div className="divide-y divide-ink-100">
      {fields.map((field) => {
        const editing = editingField === field.fieldPath;
        return (
          <div key={field.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[180px_minmax(0,1fr)_190px]">
            <div>
              <div className="text-sm font-semibold text-ink-900">{field.label}</div>
              <div className="mt-1 text-xs text-ink-500">{field.fieldPath}</div>
            </div>
            <div className="min-w-0">
              {editing ? (
                <input
                  className="focus-ring w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm"
                  value={values[field.fieldPath] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.fieldPath]: event.target.value
                    }))
                  }
                />
              ) : (
                <div className="break-words text-sm font-semibold text-ink-900">{field.finalValue || "—"}</div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusPill tone={confidenceTone(field.confidence)}>
                  {Math.round(field.confidence * 100)}% Confidence
                </StatusPill>
                <StatusPill tone={statusTone(field.status)}>{field.status}</StatusPill>
                {field.needsReview ? <StatusPill tone="warning">Review</StatusPill> : null}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-500">
                <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                {field.sourcePageNumber ? `Quelle: Seite ${field.sourcePageNumber}` : "Quelle nicht eindeutig"}
              </div>
              {field.sourceText ? (
                <div className="mt-2 rounded-md border border-ink-200 bg-ink-50 p-2 text-xs leading-5 text-ink-600">
                  {field.sourceText}
                </div>
              ) : null}
            </div>
            <div className="flex items-start justify-end gap-2">
              {editing ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => submit(field, "correct")}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-ink-900 px-3 py-2 text-xs font-semibold text-white hover:bg-ink-800 disabled:bg-ink-300"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  Speichern
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setEditingField(field.fieldPath)}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => submit(field, "confirm")}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-ink-300"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Bestaetigen
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
      {error ? <div className="px-5 py-3 text-sm text-red-700">{error}</div> : null}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Send, ShieldCheck, XCircle } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

export interface ReviewField {
  fieldPath: string;
  label: string;
  value: string;
  confidence: number;
  sourcePageNumber: number | null;
  sourceText: string | null;
  needsReview: boolean;
  status: string;
}

export interface ReviewPanelInvoice {
  id: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  grossAmount: number | null;
  currency: string;
  status: string;
  reviewStatus: string;
  validationStatus: string;
  riskLevel: string;
  fields: ReviewField[];
  lineItems: Array<{ id: string; description: string; quantity: number | null; netAmount: number | null; grossAmount: number | null; confidence: number }>;
  validations: Array<{ id: string; field: string; severity: string; explanation: string }>;
  risks: Array<{ id: string; title: string; severity: string; description: string; recommendation: string }>;
  booking: {
    bookingText: string;
    expenseAccount: string | null;
    supplierAccount: string | null;
    taxAccount: string | null;
    status: string;
  } | null;
  auditLogs: Array<{ id: string; action: string; description: string; actor: string; createdAt: string }>;
}

const tabs = ["Überblick", "Felder", "Positionen", "Prüfung", "Buchung", "Verlauf"] as const;

function confidenceTone(value: number) {
  if (value >= 0.85) {
    return "success";
  }
  if (value >= 0.65) {
    return "warning";
  }
  return "danger";
}

export function InvoiceReviewPanel({ invoice, canApprove }: { invoice: ReviewPanelInvoice; canApprove: boolean }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Überblick");
  const [fieldValues, setFieldValues] = useState(() => Object.fromEntries(invoice.fields.map((field) => [field.fieldPath, field.value ?? ""])));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fieldsNeedingReview = invoice.fields.filter((field) => field.needsReview || field.status === "missing" || field.status === "low_confidence");
  const blockingIssues = invoice.validations.filter((result) => result.severity === "error");
  const summary = useMemo(() => {
    if (blockingIssues.length > 0) {
      return `${blockingIssues.length} Punkte blockieren die Freigabe`;
    }
    if (fieldsNeedingReview.length > 0) {
      return `${fieldsNeedingReview.length} Felder brauchen Prüfung`;
    }
    return "Bereit zur Freigabe";
  }, [blockingIssues.length, fieldsNeedingReview.length]);

  function mutate(url: string, init?: RequestInit) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(url, init ?? { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; blockers?: string[] };
      if (!response.ok) {
        setMessage(payload.error ?? "Aktion konnte nicht abgeschlossen werden.");
        return;
      }
      router.refresh();
      setMessage("Gespeichert.");
    });
  }

  function saveField(field: ReviewField, action: "correct" | "confirm") {
    mutate(`/api/app/invoices/${invoice.id}/fields`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fieldPath: field.fieldPath, value: fieldValues[field.fieldPath], action })
    });
  }

  return (
    <section className="rounded-lg border border-ink-200 bg-white shadow-panel">
      <div className="border-b border-ink-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{invoice.supplierName ?? "Unbekannter Lieferant"}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {invoice.invoiceNumber ?? "ohne Nummer"} · {formatDate(invoice.invoiceDate)} · {formatMoney(invoice.grossAmount, invoice.currency)}
            </p>
          </div>
          <StatusPill tone={blockingIssues.length > 0 ? "danger" : fieldsNeedingReview.length > 0 ? "warning" : "success"}>{summary}</StatusPill>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === tab ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[calc(100vh-17rem)] overflow-auto p-4">
        {activeTab === "Überblick" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-ink-200 p-3">
                <div className="text-xs text-ink-500">Status</div>
                <div className="mt-1 font-semibold text-ink-900">{invoice.status.replace(/_/g, " ")}</div>
              </div>
              <div className="rounded-md border border-ink-200 p-3">
                <div className="text-xs text-ink-500">Prüfung</div>
                <div className="mt-1 font-semibold text-ink-900">{invoice.validationStatus}</div>
              </div>
              <div className="rounded-md border border-ink-200 p-3">
                <div className="text-xs text-ink-500">Risiko</div>
                <div className="mt-1 font-semibold text-ink-900">{invoice.riskLevel}</div>
              </div>
            </div>
            {fieldsNeedingReview.slice(0, 5).map((field) => (
              <div key={field.fieldPath} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {field.label} prüfen{field.sourcePageNumber ? ` · Seite ${field.sourcePageNumber}` : ""}.
              </div>
            ))}
            {fieldsNeedingReview.length === 0 && blockingIssues.length === 0 ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Summe und Pflichtfelder wirken plausibel.</div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "Felder" ? (
          <div className="space-y-3">
            {invoice.fields.map((field) => (
              <div key={field.fieldPath} className="rounded-md border border-ink-200 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-ink-900">{field.label}</div>
                  <StatusPill tone={confidenceTone(field.confidence)}>{Math.round(field.confidence * 100)}%</StatusPill>
                </div>
                <input
                  value={fieldValues[field.fieldPath] ?? ""}
                  onChange={(event) => setFieldValues((values) => ({ ...values, [field.fieldPath]: event.target.value }))}
                  className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus:border-trust-500"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
                  <span>{field.sourcePageNumber ? `Quelle: Seite ${field.sourcePageNumber}` : "Quelle nicht eindeutig"}</span>
                  <span title={field.sourceText ?? ""}>{field.status}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => saveField(field, "correct")} className="rounded-md bg-ink-900 px-3 py-1.5 text-sm font-semibold text-white">
                    Speichern
                  </button>
                  <button type="button" onClick={() => saveField(field, "confirm")} className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-700">
                    Bestätigen
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "Positionen" ? (
          <div className="space-y-2">
            {invoice.lineItems.map((item) => (
              <div key={item.id} className="rounded-md border border-ink-200 p-3 text-sm">
                <div className="font-medium text-ink-900">{item.description}</div>
                <div className="mt-1 text-ink-500">
                  Menge {item.quantity ?? "—"} · Netto {formatMoney(item.netAmount, invoice.currency)} · Brutto {formatMoney(item.grossAmount, invoice.currency)}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "Prüfung" ? (
          <div className="space-y-3">
            {invoice.validations.map((result) => (
              <div key={result.id} className="rounded-md border border-ink-200 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <div className="font-medium text-ink-900">{result.field}</div>
                  <StatusPill tone={result.severity === "error" ? "danger" : result.severity === "warning" ? "warning" : "success"}>{result.severity}</StatusPill>
                </div>
                <div className="mt-1 text-ink-600">{result.explanation}</div>
              </div>
            ))}
            {invoice.risks.map((risk) => (
              <div key={risk.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-medium">{risk.title}</div>
                <div className="mt-1">{risk.description}</div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "Buchung" ? (
          <div className="space-y-3 text-sm">
            {invoice.booking ? (
              <>
                <div className="rounded-md border border-ink-200 p-3">
                  <div className="text-xs text-ink-500">Buchungstext</div>
                  <div className="mt-1 font-medium text-ink-900">{invoice.booking.bookingText}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-ink-200 p-3">Lieferant: {invoice.booking.supplierAccount ?? "—"}</div>
                  <div className="rounded-md border border-ink-200 p-3">Aufwand: {invoice.booking.expenseAccount ?? "—"}</div>
                  <div className="rounded-md border border-ink-200 p-3">Steuer: {invoice.booking.taxAccount ?? "—"}</div>
                </div>
              </>
            ) : (
              <div className="text-ink-500">Kein Buchungsvorschlag vorhanden.</div>
            )}
          </div>
        ) : null}

        {activeTab === "Verlauf" ? (
          <div className="space-y-3">
            {invoice.auditLogs.map((log) => (
              <div key={log.id} className="rounded-md border border-ink-200 p-3 text-sm">
                <div className="font-medium text-ink-900">{log.action}</div>
                <div className="mt-1 text-ink-600">{log.description}</div>
                <div className="mt-1 text-xs text-ink-500">
                  {formatDate(log.createdAt)} · {log.actor}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-ink-200 p-4">
        {message ? <div className="rounded-md border border-ink-200 bg-ink-50 p-3 text-sm text-ink-700">{message}</div> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={isPending} onClick={() => mutate(`/api/app/invoices/${invoice.id}/reanalyze`)} className="rounded-md border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            <RotateCcw className="mr-2 inline h-4 w-4" aria-hidden="true" />
            Analyse erneut starten
          </button>
          <button type="button" disabled={isPending} onClick={() => mutate(`/api/app/invoices/${invoice.id}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "complete" }) })} className="rounded-md border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden="true" />
            Als geprüft markieren
          </button>
          <button type="button" disabled={isPending} onClick={() => mutate(`/api/app/invoices/${invoice.id}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request_approval" }) })} className="rounded-md border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            <Send className="mr-2 inline h-4 w-4" aria-hidden="true" />
            Freigabe anfordern
          </button>
          {canApprove ? (
            <button type="button" disabled={isPending} onClick={() => mutate(`/api/app/invoices/${invoice.id}/approve`)} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              <ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Freigeben
            </button>
          ) : null}
          {canApprove ? (
            <button type="button" disabled={isPending} onClick={() => mutate(`/api/app/invoices/${invoice.id}/reject`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: "Durch Reviewer abgelehnt." }) })} className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
              <XCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Ablehnen
            </button>
          ) : null}
          <a href={`/api/app/invoices/${invoice.id}/export?target=GENERIC_CSV&format=csv`} className="rounded-md bg-ink-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-ink-800">
            Export erstellen
          </a>
        </div>
      </div>
    </section>
  );
}

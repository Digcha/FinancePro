import { AlertTriangle, BrainCircuit } from "lucide-react";
import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { StatusPill } from "@/components/ui/StatusPill";

export function AIConfigurationBanner({ invoice }: { invoice: InvoiceWithRelations }) {
  const isMock = invoice.aiMode !== "openai";
  const failed = invoice.aiStatus === "failed";

  return (
    <div
      className={
        isMock || failed
          ? "rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"
          : "rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {isMock || failed ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> : <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {isMock ? "KI nicht konfiguriert — Mock-Modus aktiv" : `AI: ${invoice.aiProvider ?? "OpenAI"} / ${invoice.aiModel ?? "gpt-4o-mini"}`}
            </div>
            <div className="mt-1 text-xs leading-5">
              {failed
                ? `${invoice.aiErrorCode ?? "AI_ERROR"}: ${invoice.aiErrorMessage ?? "Analyse fehlgeschlagen."}`
                : isMock
                  ? "Es werden Demo-/Mockdaten verwendet. Setze OPENAI_API_KEY, um echte KI-Analyse zu aktivieren."
                  : "Rechnungsdaten werden bei Analyse an OpenAI gesendet. Keine automatische Reanalyse bei Refresh."}
            </div>
          </div>
        </div>
        <StatusPill tone={isMock || failed ? "warning" : "success"}>{invoice.aiMode ?? "mock"}</StatusPill>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

export function ReanalyzeInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function reanalyze() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/invoices/${invoiceId}/reanalyze`, {
        method: "POST"
      });
      const payload = (await response.json()) as { error?: string; aiMessage?: string };
      setMessage(payload.error ?? payload.aiMessage ?? "Analyse wurde erneut gestartet.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={reanalyze}
        disabled={isPending}
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-300"
      >
        <RefreshCw className={isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
        Analyse erneut starten
      </button>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-900">
        Kann API-Kosten verursachen. Refresh startet keine neue Analyse.
      </div>
      {message ? <div className="text-xs leading-5 text-ink-600">{message}</div> : null}
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";

interface UploadResult {
  invoiceId: string;
  status: string;
  aiMode?: string;
  aiMessage?: string;
  warning?: string;
}

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setResult(null);

    startTransition(async () => {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as UploadResult | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Upload fehlgeschlagen.");
        return;
      }

      setResult(payload);
    });
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setFiles(Array.from(event.dataTransfer.files));
        }}
        className="focus-ring flex min-h-72 w-full flex-col items-center justify-center rounded-lg border border-dashed border-ink-300 bg-white px-6 py-10 text-center shadow-panel transition hover:border-trust-400 hover:bg-trust-50"
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept="application/pdf,image/png,image/jpeg"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink-900 text-white">
          <UploadCloud className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="mt-5 text-base font-semibold text-ink-900">PDF, JPG oder PNG ablegen</div>
        <div className="mt-2 max-w-md text-sm leading-6 text-ink-500">
          Mehrere Dateien in einem Upload werden als eine Dokumentgruppe verarbeitet.
        </div>
      </button>

      {files.length > 0 ? (
        <div className="rounded-lg border border-ink-200 bg-white shadow-panel">
          <div className="border-b border-ink-200 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">Upload-Gruppe</h2>
                <p className="mt-1 text-xs text-ink-500">{files.length} Datei(en), Seitenprüfung folgt nach Upload.</p>
              </div>
              {files.length > 1 ? <StatusPill tone="info">Mehrseiten-Rechnung möglich</StatusPill> : null}
            </div>
          </div>
          <div className="divide-y divide-ink-100">
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-5 py-3 text-sm">
                <FileUp className="h-4 w-4 text-ink-500" aria-hidden="true" />
                <div className="min-w-0 flex-1 truncate text-ink-800">{file.name}</div>
                <div className="text-xs text-ink-500">{Math.round(file.size / 1024)} KB</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-ink-200 px-5 py-4">
            <div className="text-xs text-ink-500">Analyse nutzt OpenAI bei API-Key, sonst sichtbar den Mock-Modus.</div>
            <button
              type="button"
              disabled={isPending}
              onClick={submit}
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-300"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="h-4 w-4" aria-hidden="true" />}
              Verarbeiten
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {result ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Upload gespeichert. {result.aiMessage ? <span className="font-medium">{result.aiMessage}. </span> : null}
          {result.warning ? <span className="font-medium">{result.warning}. </span> : null}
          <Link className="font-semibold underline" href={`/invoices/${result.invoiceId}`}>
            Rechnung öffnen
          </Link>
        </div>
      ) : null}
    </div>
  );
}

import { FileSearch } from "lucide-react";
import { cn } from "@/lib/format";

export function DetectedFieldWithSource({
  label,
  value,
  sourcePageNumber,
  tone = "neutral"
}: {
  label: string;
  value: React.ReactNode;
  sourcePageNumber?: number | null;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        tone === "danger"
          ? "border-red-200 bg-red-50"
          : tone === "warning"
            ? "border-amber-200 bg-amber-50"
            : "border-ink-200 bg-white"
      )}
    >
      <div className="text-xs font-medium text-ink-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-ink-900">{value || "—"}</div>
      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
        <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
        {sourcePageNumber ? `Quelle: Seite ${sourcePageNumber}` : "Quelle: nicht eindeutig"}
      </div>
    </div>
  );
}

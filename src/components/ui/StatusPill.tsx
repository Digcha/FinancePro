import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/format";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<Tone, string> = {
  neutral: "border-ink-200 bg-white text-ink-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700"
};

const icons = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: CircleAlert,
  info: Info
};

export function StatusPill({
  children,
  tone = "neutral",
  className
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const Icon = icons[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        toneStyles[tone],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

import { cn } from "@/lib/format";

export function Panel({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-ink-200 bg-white shadow-panel", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {children ? <div className="mt-1 text-xs leading-5 text-ink-500">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

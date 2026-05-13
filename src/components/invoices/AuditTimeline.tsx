import type { InvoiceWithRelations } from "@/server/repositories/invoiceRepository";
import { formatDate } from "@/lib/format";

export function AuditTimeline({ invoice }: { invoice: InvoiceWithRelations }) {
  return (
    <div className="divide-y divide-ink-100">
      {invoice.auditLogs.map((log) => (
        <div key={log.id} className="px-5 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="font-medium text-ink-900">{log.action}</div>
            <div className="text-xs text-ink-500">{formatDate(log.createdAt)}</div>
          </div>
          <div className="mt-1 leading-5 text-ink-600">{log.description}</div>
          <div className="mt-1 text-xs text-ink-500">{log.actor}</div>
        </div>
      ))}
    </div>
  );
}

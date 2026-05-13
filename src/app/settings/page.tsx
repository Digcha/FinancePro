import { AppHeader } from "@/components/layout/AppHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";

const services = [
  "DocumentQualityService",
  "PageGroupingService",
  "LayoutAnalysisService",
  "TableExtractionService",
  "InvoiceExtractionService",
  "InvoiceValidationService",
  "RiskAnalysisService",
  "BookingSuggestionService",
  "ExportService",
  "AuditLogService"
];

export default function SettingsPage() {
  return (
    <>
      <AppHeader title="Einstellungen" subtitle="Demo-Mandant, Regelversion und Pipeline-Adapter" />
      <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[1fr_420px] lg:p-8">
        <Panel>
          <PanelHeader title="Mandant" />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="rounded-md border border-ink-200 bg-white p-4">
              <div className="text-xs font-medium text-ink-500">Firma</div>
              <div className="mt-1 font-semibold text-ink-900">Chalakov & Plaschka Consulting OG</div>
            </div>
            <div className="rounded-md border border-ink-200 bg-white p-4">
              <div className="text-xs font-medium text-ink-500">UID</div>
              <div className="mt-1 font-semibold text-ink-900">ATU87654321</div>
            </div>
            <div className="rounded-md border border-ink-200 bg-white p-4">
              <div className="text-xs font-medium text-ink-500">Regelset</div>
              <div className="mt-1 font-semibold text-ink-900">AT_USTG_11_2026_01</div>
            </div>
            <div className="rounded-md border border-ink-200 bg-white p-4">
              <div className="text-xs font-medium text-ink-500">Standardexport</div>
              <div className="mt-1 font-semibold text-ink-900">BMD CSV</div>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Service-Layer" />
          <div className="divide-y divide-ink-100">
            {services.map((service) => (
              <div key={service} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="text-sm font-medium text-ink-800">{service}</div>
                <StatusPill tone={service.includes("Extraction") || service.includes("Quality") ? "warning" : "success"}>
                  {service.includes("Extraction") || service.includes("Quality") ? "mock" : "aktiv"}
                </StatusPill>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

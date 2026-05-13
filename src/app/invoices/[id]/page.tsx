import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AIConfigurationBanner } from "@/components/invoices/AIConfigurationBanner";
import { AuditTimeline } from "@/components/invoices/AuditTimeline";
import { BookingSuggestionPanel } from "@/components/invoices/BookingSuggestionPanel";
import { DocumentQualityPanel } from "@/components/invoices/DocumentQualityPanel";
import { ExportPanel } from "@/components/invoices/ExportPanel";
import { ExtractedFieldsReview } from "@/components/invoices/ExtractedFieldsReview";
import { InvoicePageViewer } from "@/components/invoices/InvoicePageViewer";
import { LineItemsTable } from "@/components/invoices/LineItemsTable";
import { MultiPageMergePanel } from "@/components/invoices/MultiPageMergePanel";
import { PageThumbnailRail } from "@/components/invoices/PageThumbnailRail";
import { ReanalyzeInvoiceButton } from "@/components/invoices/ReanalyzeInvoiceButton";
import { ReviewActionsPanel } from "@/components/invoices/ReviewActionsPanel";
import { RiskPanel } from "@/components/invoices/RiskPanel";
import { TaxAssessmentPanel } from "@/components/invoices/TaxAssessmentPanel";
import { ValidationChecklist } from "@/components/invoices/ValidationChecklist";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { documentTypeLabel, formatMoney, riskLabel, statusLabel } from "@/lib/format";
import { getInvoiceById } from "@/server/repositories/invoiceRepository";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const warningCount = invoice.validationResults.filter((result) => result.severity === "warning").length;
  const errorCount = invoice.validationResults.filter((result) => result.severity === "error").length;

  return (
    <>
      <AppHeader
        title={invoice.supplierName ?? "Unbekannter Lieferant"}
        subtitle={`${invoice.invoiceNumber ?? "ohne Nummer"} · ${documentTypeLabel(invoice.documentType)}`}
      />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <AIConfigurationBanner invoice={invoice} />

        <section className="grid gap-4 xl:grid-cols-4">
          <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-panel">
            <div className="text-xs font-medium text-ink-500">Status</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusPill tone={invoice.validationStatus === "valid" ? "success" : invoice.validationStatus === "error" ? "danger" : "warning"}>
                {statusLabel(invoice.status)}
              </StatusPill>
              <StatusPill tone={invoice.riskLevel === "high" ? "danger" : invoice.riskLevel === "medium" ? "warning" : "success"}>
                Risiko {riskLabel(invoice.riskLevel)}
              </StatusPill>
            </div>
          </div>
          <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-panel">
            <div className="text-xs font-medium text-ink-500">Brutto</div>
            <div className="mt-2 text-2xl font-semibold text-ink-900">{formatMoney(invoice.grossAmount, invoice.currency)}</div>
          </div>
          <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-panel">
            <div className="text-xs font-medium text-ink-500">Validierung</div>
            <div className="mt-2 text-2xl font-semibold text-ink-900">{errorCount} Fehler</div>
            <div className="text-xs text-ink-500">{warningCount} Warnungen</div>
          </div>
          <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-panel">
            <div className="text-xs font-medium text-ink-500">Seiten</div>
            <div className="mt-2 text-2xl font-semibold text-ink-900">{invoice.pages.length}</div>
            <div className="text-xs text-ink-500">erkannte Dokumentseiten</div>
          </div>
        </section>

        <Panel className="overflow-hidden">
          <div className="lg:flex">
            <PageThumbnailRail pages={invoice.pages} />
            <InvoicePageViewer invoice={invoice} />
          </div>
        </Panel>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-6">
            <Panel className="overflow-hidden">
              <PanelHeader title="Extrahierte Felder" />
              <ExtractedFieldsReview invoice={invoice} />
            </Panel>

            <Panel className="overflow-hidden">
              <PanelHeader title="Positionen" />
              <LineItemsTable invoice={invoice} />
            </Panel>

            <Panel className="overflow-hidden">
              <PanelHeader title="§ 11 UStG-Prüfung" />
              <ValidationChecklist invoice={invoice} />
            </Panel>
          </div>

          <aside className="min-w-0 space-y-6">
            <Panel>
              <PanelHeader title="AI-Analyse" />
              <div className="p-5">
                <ReanalyzeInvoiceButton invoiceId={invoice.id} />
              </div>
            </Panel>
            <Panel>
              <PanelHeader title="Mehrseiten-Verarbeitung" />
              <MultiPageMergePanel invoice={invoice} />
            </Panel>
            <Panel>
              <PanelHeader title="Dokumentqualität" />
              <DocumentQualityPanel invoice={invoice} />
            </Panel>
            <Panel>
              <PanelHeader title="Steuerprüfung" />
              <TaxAssessmentPanel invoice={invoice} />
            </Panel>
            <Panel>
              <PanelHeader title="Risikoanalyse" />
              <RiskPanel invoice={invoice} />
            </Panel>
            <Panel>
              <PanelHeader title="Buchungsvorschlag" />
              <BookingSuggestionPanel invoice={invoice} />
            </Panel>
            <Panel>
              <PanelHeader title="Review" />
              <ReviewActionsPanel invoice={invoice} />
            </Panel>
            <Panel>
              <PanelHeader title="Export" />
              <ExportPanel invoice={invoice} />
            </Panel>
            <Panel>
              <PanelHeader title="Audit-Log" />
              <AuditTimeline invoice={invoice} />
            </Panel>
          </aside>
        </div>
      </div>
    </>
  );
}

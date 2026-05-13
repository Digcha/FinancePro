import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { DocumentViewer } from "@/components/document/document-viewer";
import { InvoiceReviewPanel, type ReviewPanelInvoice } from "@/components/invoice/invoice-review-panel";
import { canApproveInvoice } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getInvoiceById } from "@/server/repositories/invoiceRepository";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function AppInvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const session = await requireUser();
  const { id } = await params;
  const invoice = await getInvoiceById(id, session);

  if (!invoice) {
    notFound();
  }

  const reviewInvoice: ReviewPanelInvoice = {
    id: invoice.id,
    supplierName: invoice.supplierName,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate?.toISOString() ?? null,
    grossAmount: invoice.grossAmount,
    currency: invoice.currency,
    status: invoice.status,
    reviewStatus: invoice.reviewStatus,
    validationStatus: invoice.validationStatus,
    riskLevel: invoice.riskLevel,
    fields: invoice.extractedFields.map((field) => ({
      fieldPath: field.fieldPath,
      label: field.label,
      value: field.finalValue ?? field.aiValue ?? "",
      confidence: field.confidence,
      sourcePageNumber: field.sourcePageNumber,
      sourceText: field.sourceText,
      needsReview: field.needsReview,
      status: field.status
    })),
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      netAmount: item.netAmount,
      grossAmount: item.grossAmount,
      confidence: item.confidence
    })),
    validations: invoice.validationResults.map((result) => ({
      id: result.id,
      field: result.field,
      severity: result.severity,
      explanation: result.explanation
    })),
    risks: invoice.riskIndicators.map((risk) => ({
      id: risk.id,
      title: risk.title,
      severity: risk.severity,
      description: risk.description,
      recommendation: risk.recommendation
    })),
    booking: invoice.bookingSuggestion
      ? {
          bookingText: invoice.bookingSuggestion.bookingText,
          expenseAccount: invoice.bookingSuggestion.expenseAccount,
          supplierAccount: invoice.bookingSuggestion.supplierAccount,
          taxAccount: invoice.bookingSuggestion.taxAccount,
          status: invoice.bookingSuggestion.status
        }
      : null,
    auditLogs: invoice.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      description: log.description,
      actor: log.actor,
      createdAt: log.createdAt.toISOString()
    }))
  };

  const pages = invoice.pages.map((page, index) => ({
    pageNumber: page.pageNumberDetected ?? index + 1,
    qualityStatus: page.qualityStatus,
    hasPreview: Boolean(page.thumbnailPath || page.pageImagePath || page.mimeType?.startsWith("image/"))
  }));

  return (
    <>
      <AppHeader title="Rechnung prüfen" subtitle={invoice.supplierName ?? invoice.originalFileName ?? "Beleg"} session={session} />
      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,55fr)_minmax(380px,45fr)] lg:p-6">
        <DocumentViewer invoiceId={invoice.id} originalMimeType={invoice.originalMimeType} pages={pages} />
        <InvoiceReviewPanel invoice={reviewInvoice} canApprove={canApproveInvoice(session)} />
      </div>
    </>
  );
}

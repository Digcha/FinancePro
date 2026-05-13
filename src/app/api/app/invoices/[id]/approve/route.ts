import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/session";
import { canApproveInvoice } from "@/lib/auth/permissions";
import { assertInvoiceAccess } from "@/lib/db/tenant-scope";
import { forbidden, jsonError } from "@/lib/http/api-errors";
import { invoiceWorkflowService } from "@/lib/invoice/workflow/invoice-workflow-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const apiSession = await getApiSession();
  if (!apiSession.ok) {
    return jsonError(apiSession.message, apiSession.status, apiSession.code);
  }
  if (!canApproveInvoice(apiSession.session)) {
    return forbidden("Ihre Rolle darf Rechnungen nicht freigeben.");
  }

  const { id } = await context.params;
  const invoice = await assertInvoiceAccess(id, apiSession.session);
  if (!invoice) {
    return jsonError("Rechnung wurde nicht gefunden.", 404, "INVOICE_NOT_FOUND");
  }

  const hasErrors = invoice.validationResults.some((result) => result.severity === "error");
  const openFields = invoice.extractedFields.filter((field) => field.needsReview || field.status === "missing" || field.status === "low_confidence");
  if (hasErrors || openFields.length > 0) {
    return NextResponse.json(
      {
        error: "Rechnung kann noch nicht freigegeben werden.",
        blockers: [
          ...(hasErrors ? ["Offene Prüfhinweise vorhanden."] : []),
          ...(openFields.length > 0 ? ["Nicht bestätigte Felder vorhanden."] : [])
        ]
      },
      { status: 409 }
    );
  }

  const updated = await invoiceWorkflowService.approveInvoice(id, apiSession.session.userId);
  return NextResponse.json({ ok: true, invoice: updated });
}

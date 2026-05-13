import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/session";
import { canReviewInvoice } from "@/lib/auth/permissions";
import { assertInvoiceAccess } from "@/lib/db/tenant-scope";
import { forbidden, jsonError } from "@/lib/http/api-errors";
import { invoiceWorkflowService } from "@/lib/invoice/workflow/invoice-workflow-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const apiSession = await getApiSession();
  if (!apiSession.ok) {
    return jsonError(apiSession.message, apiSession.status, apiSession.code);
  }
  if (!canReviewInvoice(apiSession.session)) {
    return forbidden("Ihre Rolle darf diese Rechnung nicht prüfen.");
  }

  const { id } = await context.params;
  const invoice = await assertInvoiceAccess(id, apiSession.session);
  if (!invoice) {
    return jsonError("Rechnung wurde nicht gefunden.", 404, "INVOICE_NOT_FOUND");
  }

  const payload = (await request.json().catch(() => null)) as { action?: "complete" | "request_approval" } | null;
  const updated =
    payload?.action === "request_approval"
      ? await invoiceWorkflowService.requestApproval(id)
      : await invoiceWorkflowService.completeReview(id, apiSession.session.userId);

  return NextResponse.json({ ok: true, invoice: updated });
}

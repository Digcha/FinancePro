import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/session";
import { canApproveInvoice } from "@/lib/auth/permissions";
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
  if (!canApproveInvoice(apiSession.session)) {
    return forbidden("Ihre Rolle darf Rechnungen nicht ablehnen.");
  }

  const { id } = await context.params;
  const invoice = await assertInvoiceAccess(id, apiSession.session);
  if (!invoice) {
    return jsonError("Rechnung wurde nicht gefunden.", 404, "INVOICE_NOT_FOUND");
  }

  const payload = (await request.json().catch(() => null)) as { reason?: string } | null;
  const updated = await invoiceWorkflowService.rejectInvoice(id, apiSession.session.userId, payload?.reason ?? "Abgelehnt");
  return NextResponse.json({ ok: true, invoice: updated });
}

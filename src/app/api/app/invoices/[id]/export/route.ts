import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { ExportFormat, ExportTarget } from "@/server/domain/types";
import { getApiSession } from "@/lib/auth/session";
import { canExportInvoice } from "@/lib/auth/permissions";
import { assertInvoiceAccess } from "@/lib/db/tenant-scope";
import { forbidden, jsonError } from "@/lib/http/api-errors";
import { licenseService } from "@/lib/license/license-service";
import { prisma } from "@/lib/prisma";
import { invoiceWorkflowService } from "@/lib/invoice/workflow/invoice-workflow-service";
import { exportService } from "@/server/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseTarget(value: string | null): ExportTarget {
  if (value === "RZL" || value === "DOMIZIL_PLUS" || value === "BUSINESS_CENTRAL" || value === "GENERIC_JSON") {
    return value;
  }
  if (value === "GENERIC_CSV") {
    return "GENERIC_CSV";
  }
  return "BMD";
}

function parseFormat(value: string | null, target: ExportTarget): ExportFormat {
  if (target === "GENERIC_JSON") {
    return "json";
  }
  return value === "json" ? "json" : "csv";
}

export async function GET(request: Request, context: RouteContext) {
  const apiSession = await getApiSession();
  if (!apiSession.ok) {
    return jsonError(apiSession.message, apiSession.status, apiSession.code);
  }
  if (!canExportInvoice(apiSession.session)) {
    return forbidden("Ihre Rolle darf keine Exporte erzeugen.");
  }

  const { id } = await context.params;
  const invoice = await assertInvoiceAccess(id, apiSession.session);
  if (!invoice) {
    return jsonError("Rechnung wurde nicht gefunden.", 404, "INVOICE_NOT_FOUND");
  }

  const url = new URL(request.url);
  const target = parseTarget(url.searchParams.get("target"));
  const format = parseFormat(url.searchParams.get("format"), target);
  if (!(await licenseService.targetAllowed(invoice.tenantId, target))) {
    return jsonError("Dieses Exportziel ist in der Lizenz nicht freigeschaltet.", 403, "EXPORT_TARGET_NOT_ALLOWED");
  }

  const payload = exportService.generate(invoice, target, format);
  if (!payload.validation.canExport) {
    return NextResponse.json({ error: "Export ist noch gesperrt.", validation: payload.validation }, { status: 409 });
  }

  const exportId = randomUUID();
  const exportDir = path.join(invoice.storageRoot ?? path.resolve(process.cwd(), "uploads"), "exports", exportId);
  await mkdir(exportDir, { recursive: true });
  const exportPath = path.join(exportDir, payload.fileName);
  await writeFile(exportPath, payload.body);

  await prisma.exportRecord.create({
    data: {
      id: exportId,
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      createdByUserId: apiSession.session.userId,
      targetSystem: target,
      format,
      status: "generated",
      fileName: payload.fileName,
      downloadPath: exportPath,
      packagePath: exportDir,
      validationSummary: JSON.stringify(payload.validation)
    }
  });
  await prisma.auditLog.create({
    data: {
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      actorUserId: apiSession.session.userId,
      action: "EXPORT_CREATED",
      actionType: "EXPORT_CREATED",
      description: `${target}-${format.toUpperCase()} Export wurde erzeugt.`,
      actor: apiSession.session.username
    }
  });
  await invoiceWorkflowService.markExported(invoice.id);

  return new Response(payload.body, {
    headers: {
      "content-type": payload.contentType,
      "content-disposition": `attachment; filename="${payload.fileName}"`
    }
  });
}

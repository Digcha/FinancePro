import { NextResponse } from "next/server";
import type { ExportFormat, ExportTarget } from "@/server/domain/types";
import { getInvoiceById } from "@/server/repositories/invoiceRepository";
import { exportService } from "@/server/services";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseTarget(value: string | null): ExportTarget {
  if (value === "RZL" || value === "DOMIZIL_PLUS" || value === "BUSINESS_CENTRAL") {
    return value;
  }

  return "BMD";
}

function parseFormat(value: string | null): ExportFormat {
  return value === "json" ? "json" : "csv";
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const target = parseTarget(url.searchParams.get("target"));
  const format = parseFormat(url.searchParams.get("format"));
  const payload = exportService.generate(invoice, target, format);

  if (!payload.validation.canExport) {
    return NextResponse.json(
      {
        error: "Export blocked",
        validation: payload.validation
      },
      { status: 409 }
    );
  }

  await prisma.exportRecord.create({
    data: {
      invoiceId: invoice.id,
      targetSystem: target,
      format,
      status: payload.validation.canExport ? "created" : "created_with_warnings",
      fileName: payload.fileName,
      validationSummary: JSON.stringify(payload.validation)
    }
  });
  await prisma.auditLog.create({
    data: {
      invoiceId: invoice.id,
      action: "EXPORT_CREATED",
      description: `${target}-${format.toUpperCase()} Export wurde erzeugt.`,
      actor: "ExportService"
    }
  });

  return new Response(payload.body, {
    headers: {
      "content-type": payload.contentType,
      "content-disposition": `attachment; filename="${payload.fileName}"`
    }
  });
}

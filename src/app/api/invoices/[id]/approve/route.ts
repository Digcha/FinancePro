import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInvoiceById } from "@/server/repositories/invoiceRepository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const existing = await getInvoiceById(id);

  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const hasErrors = existing.validationResults.some((result) => result.severity === "error");
  const openFields = existing.extractedFields.filter(
    (field) => field.needsReview || field.status === "missing" || field.status === "low_confidence"
  );

  if (hasErrors || openFields.length > 0) {
    return NextResponse.json(
      {
        error: "Rechnung kann noch nicht freigegeben werden.",
        blockers: [
          ...(hasErrors ? ["Offene Validierungsfehler vorhanden."] : []),
          ...(openFields.length > 0 ? ["Nicht bestaetigte Felder vorhanden."] : [])
        ]
      },
      { status: 409 }
    );
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: "approved",
      reviewStatus: "reviewed",
      exportApproved: true,
      lastReviewedAt: new Date(),
      bookingSuggestion: {
        update: {
          status: "approved"
        }
      },
      auditLogs: {
        create: {
          action: "INVOICE_APPROVED",
          description: "Rechnung wurde nach Review zur Exporterstellung freigegeben.",
          actor: "Demo User"
        }
      }
    }
  });

  return NextResponse.json({ invoice });
}

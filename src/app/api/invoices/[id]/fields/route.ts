import { NextResponse } from "next/server";
import { normalizeDateToISO, normalizeIban, normalizeUid, parseGermanNumber } from "@/lib/invoice/normalization/invoice-normalization-service";
import { prisma } from "@/lib/prisma";
import { getInvoiceById } from "@/server/repositories/invoiceRepository";
import { bookingSuggestionService, invoiceValidationService, riskAnalysisService } from "@/server/services";
import { summarizeRisk, summarizeValidation } from "@/server/services/invoiceAiPersistenceService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface FieldPatchPayload {
  fieldPath: string;
  value?: string | null;
  action?: "correct" | "confirm";
}

function normalizedValue(fieldPath: string, value: string | null | undefined) {
  const raw = value === undefined ? null : value;
  const trimmed = typeof raw === "string" && raw.trim().length === 0 ? null : raw;

  if (fieldPath.includes("iban")) {
    return normalizeIban(trimmed);
  }

  if (fieldPath.includes("uidNumber")) {
    return normalizeUid(trimmed);
  }

  if (fieldPath.includes("Date") || fieldPath.includes("dueDate") || fieldPath.includes("Period")) {
    return normalizeDateToISO(trimmed);
  }

  if (fieldPath.startsWith("amounts.")) {
    const parsed = parseGermanNumber(trimmed);
    return parsed === null ? null : String(parsed);
  }

  return trimmed;
}

function invoiceUpdateForField(fieldPath: string, value: string | null) {
  switch (fieldPath) {
    case "supplier.name":
      return { supplierName: value };
    case "supplier.address":
      return { supplierAddress: value };
    case "supplier.uidNumber":
      return { supplierUid: value };
    case "supplier.iban":
      return { supplierIban: value };
    case "supplier.bic":
      return { supplierBic: value };
    case "supplier.companyRegisterNumber":
      return { supplierCompanyRegisterNumber: value };
    case "customer.name":
      return { customerName: value };
    case "customer.address":
      return { customerAddress: value };
    case "customer.uidNumber":
      return { customerUid: value };
    case "invoice.invoiceNumber":
      return { invoiceNumber: value };
    case "invoice.invoiceDate":
      return { invoiceDate: value ? new Date(`${value}T00:00:00.000Z`) : null };
    case "invoice.serviceDate":
      return { deliveryDate: value ? new Date(`${value}T00:00:00.000Z`) : null };
    case "invoice.servicePeriodStart":
    case "invoice.servicePeriodEnd":
      return { servicePeriod: value };
    case "invoice.currency":
      return { currency: value ?? "EUR" };
    case "invoice.paymentTerms":
      return { paymentTerms: value };
    case "invoice.orderReference":
      return { orderNumber: value };
    case "invoice.customerNumber":
      return { customerNumber: value };
    case "amounts.netAmount":
      return { netAmount: value === null ? null : Number(value) };
    case "amounts.taxAmount":
      return { taxAmount: value === null ? null : Number(value) };
    case "amounts.grossAmount":
      return { grossAmount: value === null ? null : Number(value) };
    case "amounts.taxRates":
      return { taxRate: value === null ? null : Number(value.split(",")[0]) };
    default:
      return {};
  }
}

async function buildContext(currentInvoiceId: string) {
  const invoices = await prisma.invoice.findMany({
    select: {
      id: true,
      supplierName: true,
      invoiceNumber: true,
      supplierIban: true
    }
  });

  return {
    duplicateCandidates: invoices
      .filter((invoice) => invoice.id !== currentInvoiceId)
      .map((invoice) => ({
        id: invoice.id,
        supplierName: invoice.supplierName,
        invoiceNumber: invoice.invoiceNumber
      })),
    knownSuppliers: invoices
      .filter((invoice) => invoice.id !== currentInvoiceId && invoice.supplierName)
      .map((invoice) => ({
        name: invoice.supplierName as string,
        knownIban: invoice.supplierIban
      }))
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = (await request.json()) as FieldPatchPayload;

  if (!payload.fieldPath) {
    return NextResponse.json({ error: "fieldPath fehlt." }, { status: 400 });
  }

  const existing = await prisma.invoiceExtractedField.findUnique({
    where: {
      invoiceId_fieldPath: {
        invoiceId: id,
        fieldPath: payload.fieldPath
      }
    }
  });

  if (!existing) {
    return NextResponse.json({ error: "Feld nicht gefunden." }, { status: 404 });
  }

  const action = payload.action ?? "correct";
  const finalValue = normalizedValue(payload.fieldPath, payload.value ?? existing.finalValue);

  await prisma.invoice.update({
    where: { id },
    data: {
      ...invoiceUpdateForField(payload.fieldPath, finalValue),
      status: "review_required",
      reviewStatus: "pending",
      exportApproved: false,
      extractedFields: {
        update: {
          where: {
            invoiceId_fieldPath: {
              invoiceId: id,
              fieldPath: payload.fieldPath
            }
          },
          data: {
            finalValue,
            needsReview: false,
            status: action === "confirm" ? "confirmed" : "corrected",
            correctedBy: "Demo User",
            correctedAt: new Date(),
            confirmedAt: action === "confirm" ? new Date() : null
          }
        }
      },
      auditLogs: {
        create: {
          action: action === "confirm" ? "FIELD_CONFIRMED" : "FIELD_CORRECTED",
          description:
            action === "confirm"
              ? `${existing.label} wurde bestaetigt.`
              : `${existing.label} wurde von "${existing.finalValue ?? existing.aiValue ?? ""}" auf "${finalValue ?? ""}" geaendert.`,
          actor: "Demo User"
        }
      }
    }
  });

  const invoice = await getInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const validationContext = await buildContext(id);
  const validationResults = invoiceValidationService.validate(invoice, validationContext);
  const riskIndicators = riskAnalysisService.analyze(invoice, validationResults, validationContext);
  const bookingSuggestion = bookingSuggestionService.suggest(invoice, validationContext);

  await prisma.$transaction([
    prisma.validationResult.deleteMany({ where: { invoiceId: id } }),
    prisma.riskIndicator.deleteMany({ where: { invoiceId: id } }),
    prisma.validationResult.createMany({
      data: validationResults.map((result) => ({
        invoiceId: id,
        field: result.field,
        status: result.status,
        severity: result.severity,
        explanation: result.explanation,
        sourcePageNumber: result.sourcePageNumber
      }))
    }),
    prisma.riskIndicator.createMany({
      data: riskIndicators.map((risk) => ({
        invoiceId: id,
        title: risk.title,
        description: risk.description,
        severity: risk.severity,
        recommendation: risk.recommendation,
        reason: risk.reason
      }))
    }),
    prisma.bookingSuggestion.upsert({
      where: { invoiceId: id },
      create: {
        invoiceId: id,
        bookingDate: bookingSuggestion.bookingDate ? new Date(bookingSuggestion.bookingDate) : null,
        documentNumber: bookingSuggestion.documentNumber,
        supplier: bookingSuggestion.supplier,
        bookingText: bookingSuggestion.bookingText,
        netAmount: bookingSuggestion.netAmount,
        taxAmount: bookingSuggestion.taxAmount,
        grossAmount: bookingSuggestion.grossAmount,
        taxAccount: bookingSuggestion.taxAccount,
        expenseAccount: bookingSuggestion.expenseAccount,
        supplierAccount: bookingSuggestion.supplierAccount,
        costCenter: bookingSuggestion.costCenter,
        status: "draft"
      },
      update: {
        bookingDate: bookingSuggestion.bookingDate ? new Date(bookingSuggestion.bookingDate) : null,
        documentNumber: bookingSuggestion.documentNumber,
        supplier: bookingSuggestion.supplier,
        bookingText: bookingSuggestion.bookingText,
        netAmount: bookingSuggestion.netAmount,
        taxAmount: bookingSuggestion.taxAmount,
        grossAmount: bookingSuggestion.grossAmount,
        taxAccount: bookingSuggestion.taxAccount,
        expenseAccount: bookingSuggestion.expenseAccount,
        supplierAccount: bookingSuggestion.supplierAccount,
        costCenter: bookingSuggestion.costCenter,
        status: "draft"
      }
    }),
    prisma.invoice.update({
      where: { id },
      data: {
        validationStatus: summarizeValidation(validationResults),
        riskLevel: summarizeRisk(riskIndicators)
      }
    })
  ]);

  return NextResponse.json({
    ok: true,
    validationStatus: summarizeValidation(validationResults),
    riskLevel: summarizeRisk(riskIndicators)
  });
}

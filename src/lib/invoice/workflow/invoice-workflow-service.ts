import { prisma } from "@/lib/prisma";

export class InvoiceWorkflowService {
  markUploaded(invoiceId: string) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "uploaded", currentWorkflowStep: "upload", aiStatus: "not_started" }
    });
  }

  startAnalysis(invoiceId: string) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "analyzing", currentWorkflowStep: "analysis", aiStatus: "processing" }
    });
  }

  completeAnalysis(invoiceId: string) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "review_required", currentWorkflowStep: "review", aiStatus: "completed" }
    });
  }

  markReviewRequired(invoiceId: string) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "review_required", reviewStatus: "pending", currentWorkflowStep: "review" }
    });
  }

  async completeReview(invoiceId: string, userId?: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "ready_for_approval",
        reviewStatus: "reviewed",
        currentWorkflowStep: "approval",
        lastReviewedAt: new Date(),
        auditLogs: userId
          ? {
              create: {
                tenantId: invoice.tenantId,
                action: "REVIEW_COMPLETED",
                actionType: "REVIEW_COMPLETED",
                description: "Rechnung wurde als geprueft markiert.",
                actor: userId,
                actorUserId: userId
              }
            }
          : undefined
      }
    });
  }

  requestApproval(invoiceId: string) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "approval_requested", currentWorkflowStep: "approval" }
    });
  }

  async approveInvoice(invoiceId: string, userId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "export_ready",
        reviewStatus: "reviewed",
        exportApproved: true,
        exportStatus: "ready",
        currentWorkflowStep: "export",
        approvedByUserId: userId,
        approvedAt: new Date(),
        lastReviewedAt: new Date(),
        bookingSuggestion: { update: { status: "approved" } },
        auditLogs: {
          create: {
            tenantId: invoice.tenantId,
            actorUserId: userId,
            action: "INVOICE_APPROVED",
            actionType: "INVOICE_APPROVED",
            description: "Rechnung wurde freigegeben.",
            actor: userId
          }
        }
      }
    });
  }

  async rejectInvoice(invoiceId: string, userId: string, reason: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "rejected",
        exportStatus: "blocked",
        currentWorkflowStep: "rejected",
        rejectedByUserId: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
        auditLogs: {
          create: {
            tenantId: invoice.tenantId,
            actorUserId: userId,
            action: "INVOICE_REJECTED",
            actionType: "INVOICE_REJECTED",
            description: reason || "Rechnung wurde abgelehnt.",
            actor: userId
          }
        }
      }
    });
  }

  markExportReady(invoiceId: string) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "export_ready", exportStatus: "ready", currentWorkflowStep: "export" }
    });
  }

  markExported(invoiceId: string) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "exported", exportStatus: "generated", currentWorkflowStep: "archive" }
    });
  }
}

export const invoiceWorkflowService = new InvoiceWorkflowService();

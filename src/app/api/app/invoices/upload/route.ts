import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AIInvoiceExtractionError } from "@/lib/ai/types";
import { invoiceAIService } from "@/lib/ai/invoice-ai-service";
import {
  documentProcessingService,
  DocumentProcessingError,
  type UploadedDocumentFile
} from "@/lib/documents/document-processing-service";
import { getApiSession } from "@/lib/auth/session";
import { canUploadInvoice } from "@/lib/auth/permissions";
import { jsonError, forbidden } from "@/lib/http/api-errors";
import { licenseService } from "@/lib/license/license-service";
import { prisma } from "@/lib/prisma";
import { tenantStorageService } from "@/lib/storage/tenant-storage-service";
import { invoiceAIPersistenceService } from "@/server/services/invoiceAiPersistenceService";
import { vendorService } from "@/lib/vendors/vendor-service";

async function uploadedFileFromFormFile(file: File): Promise<UploadedDocumentFile> {
  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    buffer: Buffer.from(await file.arrayBuffer())
  };
}

export async function POST(request: Request) {
  const apiSession = await getApiSession();
  if (!apiSession.ok) {
    return jsonError(apiSession.message, apiSession.status, apiSession.code);
  }

  const session = apiSession.session;
  if (!session.tenantId || !canUploadInvoice(session)) {
    return forbidden("Ihre Rolle darf keine Rechnungen hochladen.");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant) {
    return jsonError("Firma wurde nicht gefunden.", 404, "TENANT_NOT_FOUND");
  }

  try {
    const formData = await request.formData();
    const formFiles = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (formFiles.length === 0) {
      return jsonError("Keine Dateien im Upload gefunden.", 400, "DOC_NO_READABLE_PAGES");
    }

    const files = await Promise.all(formFiles.map(uploadedFileFromFormFile));
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    const license = await licenseService.canUploadInvoice(session.tenantId, totalBytes);
    if (!license.allowed) {
      await prisma.licenseEvent.create({
        data: {
          tenantId: session.tenantId,
          actorUserId: session.userId,
          eventType: license.code ?? "UPLOAD_BLOCKED",
          newValueJson: JSON.stringify({ totalBytes })
        }
      });
      return jsonError(license.message ?? "Upload-Limit erreicht.", 409, license.code ?? "LICENSE_LIMIT_REACHED");
    }

    const invoiceId = randomUUID();
    const storageRoot = await tenantStorageService.createInvoiceFolder(tenant, invoiceId);
    const processed = await documentProcessingService.processUploadedFiles(files, {
      saveOriginalFile: (file, index) => tenantStorageService.saveOriginalFile(tenant, invoiceId, file, index)
    });
    const providerStatus = invoiceAIService.getProviderStatus();
    const aiAllowed = await licenseService.canRunAiAnalysis(session.tenantId);
    const metadata = {
      invoiceId,
      tenantId: session.tenantId,
      uploadedByUserId: session.userId,
      originalFileName: processed.originalFileName,
      originalMimeType: processed.mimeType,
      originalFileSize: totalBytes,
      storageRoot,
      documentPreviewPath: processed.pages[0]?.pageImagePath ?? processed.pages[0]?.previewImagePath ?? null,
      pages: processed.pages,
      providerStatus
    };

    let invoice;
    if (!aiAllowed.allowed) {
      invoice = await invoiceAIPersistenceService.createFailedAnalysis({
        ...metadata,
        error: new AIInvoiceExtractionError("AI_PROVIDER_ERROR", aiAllowed.message ?? "AI-Limit erreicht.")
      });
    } else {
      try {
        const aiResult = await invoiceAIService.extractInvoice(processed.aiInput);
        invoice = await invoiceAIPersistenceService.createFromAIResult({
          ...metadata,
          aiResult
        });
        await licenseService.recordUsage(session.tenantId, "ai_analysis", 1);
      } catch (error) {
        invoice = await invoiceAIPersistenceService.createFailedAnalysis({
          ...metadata,
          error
        });
      }
    }

    await vendorService.findOrCreateVendorFromInvoice(invoice.id);
    await licenseService.recordUsage(session.tenantId, "invoice_upload", 1);
    await licenseService.recordUsage(session.tenantId, "storage_mb", totalBytes / 1024 / 1024);

    return NextResponse.json({
      invoiceId: invoice.id,
      status: invoice.status,
      aiMode: providerStatus.mode,
      aiMessage: invoice.aiStatus === "failed" ? "Dokument wurde gespeichert; Prüfung ist nötig." : "Dokument wurde gelesen."
    });
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      return jsonError(error.message, error.status, error.code);
    }

    return jsonError("Upload konnte nicht verarbeitet werden. Bitte erneut versuchen.", 500, "DATABASE_OR_UPLOAD_ERROR");
  }
}

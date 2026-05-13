import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Tenant } from "@prisma/client";
import { financeProConfig } from "@/lib/config";
import type { AppSession } from "@/lib/auth/session";
import { assertInvoiceAccess } from "@/lib/db/tenant-scope";
import type { UploadedDocumentFile } from "@/lib/documents/document-processing-service";

function safeSegment(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "tenant";
}

function safeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const ext = parsed.ext.toLowerCase();
  const name = safeSegment(parsed.name || "original");
  return `${name}${ext}`;
}

export interface ProtectedFileResult {
  stream: ReturnType<typeof createReadStream>;
  mimeType: string;
  fileName: string;
  size: number;
}

export class TenantStorageService {
  getTenantStorageRoot(tenant: Pick<Tenant, "slug">) {
    return path.resolve(process.cwd(), financeProConfig.uploadDir, "tenants", safeSegment(tenant.slug));
  }

  async createInvoiceFolder(tenant: Pick<Tenant, "slug">, invoiceId: string) {
    const root = path.join(this.getTenantStorageRoot(tenant), "invoices", safeSegment(invoiceId));
    await mkdir(path.join(root, "original"), { recursive: true });
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "thumbs"), { recursive: true });
    await mkdir(path.join(root, "exports"), { recursive: true });
    return root;
  }

  async saveOriginalFile(
    tenant: Pick<Tenant, "slug">,
    invoiceId: string,
    file: UploadedDocumentFile,
    index = 0
  ) {
    const root = await this.createInvoiceFolder(tenant, invoiceId);
    const parsed = path.parse(safeFileName(file.fileName));
    const fileName = index === 0 ? `original${parsed.ext || ""}` : `original-${String(index + 1).padStart(3, "0")}${parsed.ext || ""}`;
    const filePath = path.join(root, "original", fileName);
    await writeFile(filePath, file.buffer);
    return filePath;
  }

  async savePagePreview(tenant: Pick<Tenant, "slug">, invoiceId: string, pageNumber: number, buffer: Buffer) {
    const root = await this.createInvoiceFolder(tenant, invoiceId);
    const filePath = path.join(root, "pages", `page-${String(pageNumber).padStart(3, "0")}.png`);
    await writeFile(filePath, buffer);
    return filePath;
  }

  async saveThumbnail(tenant: Pick<Tenant, "slug">, invoiceId: string, pageNumber: number, buffer: Buffer) {
    const root = await this.createInvoiceFolder(tenant, invoiceId);
    const filePath = path.join(root, "thumbs", `page-${String(pageNumber).padStart(3, "0")}.jpg`);
    await writeFile(filePath, buffer);
    return filePath;
  }

  async getProtectedFileStream(
    session: AppSession,
    invoiceId: string,
    fileType: "original" | "page" | "thumb" | "export",
    pageNumber?: number
  ): Promise<ProtectedFileResult | null> {
    const invoice = await assertInvoiceAccess(invoiceId, session);
    if (!invoice) {
      return null;
    }

    let filePath: string | null = null;
    let mimeType = invoice.originalMimeType ?? "application/octet-stream";
    let fileName = invoice.originalFileName ?? "document";

    if (fileType === "original") {
      filePath = invoice.pages[0]?.originalFilePath ?? null;
    } else if (fileType === "page") {
      const page = invoice.pages.find((item) => item.pageNumberDetected === pageNumber);
      filePath = page?.pageImagePath ?? page?.previewImagePath ?? (page?.mimeType?.startsWith("image/") ? page.originalFilePath : null);
      mimeType = page?.mimeType?.startsWith("image/") && filePath === page.originalFilePath ? page.mimeType : "image/png";
      fileName = `page-${String(pageNumber ?? 1).padStart(3, "0")}.png`;
    } else if (fileType === "thumb") {
      const page = invoice.pages.find((item) => item.pageNumberDetected === pageNumber);
      filePath = page?.thumbnailPath ?? page?.pageImagePath ?? (page?.mimeType?.startsWith("image/") ? page.originalFilePath : null);
      mimeType = "image/jpeg";
      fileName = `thumb-${String(pageNumber ?? 1).padStart(3, "0")}.jpg`;
    }

    if (!filePath) {
      return null;
    }

    const fileStats = await stat(filePath).catch(() => null);
    if (!fileStats?.isFile()) {
      return null;
    }

    return {
      stream: createReadStream(filePath),
      mimeType,
      fileName,
      size: fileStats.size
    };
  }
}

export const tenantStorageService = new TenantStorageService();

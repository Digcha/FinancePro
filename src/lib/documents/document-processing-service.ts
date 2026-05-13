import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { financeProConfig } from "@/lib/config";
import type { InvoiceAIFileInput, InvoiceAIInput, InvoiceAIPageInput } from "@/lib/ai/types";
import type { InvoicePageInput } from "@/server/domain/types";
import { imagePreprocessingService } from "./image-preprocessing-service";
import { pdfPageRenderer } from "./pdf-page-renderer";

export type DocumentProcessingErrorCode =
  | "DOC_INVALID_TYPE"
  | "DOC_TOO_LARGE"
  | "DOC_ENCRYPTED_PDF"
  | "DOC_CORRUPTED"
  | "DOC_TOO_MANY_PAGES"
  | "DOC_NO_READABLE_PAGES"
  | "DOC_STORAGE_FAILED";

export class DocumentProcessingError extends Error {
  constructor(
    readonly code: DocumentProcessingErrorCode,
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "DocumentProcessingError";
  }
}

export interface UploadedDocumentFile {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface StoredInvoicePage extends InvoicePageInput {
  fileName: string;
  mimeType?: string | null;
  originalFilePath: string;
  previewImagePath?: string | null;
  pageImagePath?: string | null;
  thumbnailPath?: string | null;
  originalPageFilePath?: string | null;
}

export interface DocumentProcessingResult {
  originalFileName: string;
  mimeType: string;
  pageCount: number;
  pages: StoredInvoicePage[];
  aiInput: InvoiceAIInput;
  warnings: string[];
}

export interface DocumentProcessingOptions {
  saveOriginalFile?: (file: UploadedDocumentFile, index: number) => Promise<string>;
}

function uploadDir() {
  return path.resolve(process.cwd(), financeProConfig.uploadDir);
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function assertAllowed(file: UploadedDocumentFile) {
  if (!financeProConfig.allowedUploadTypes.includes(file.mimeType)) {
    throw new DocumentProcessingError("DOC_INVALID_TYPE", `Dateityp nicht erlaubt: ${file.fileName}`, 415);
  }

  const maxBytes = financeProConfig.maxUploadMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new DocumentProcessingError(
      "DOC_TOO_LARGE",
      `Datei ${file.fileName} ist groesser als ${financeProConfig.maxUploadMb} MB.`,
      413
    );
  }
}

function textSignalForPage(file: UploadedDocumentFile, pageNumber: number, totalPages: number, warnings: string[]) {
  if (file.mimeType === "application/pdf") {
    return [
      `PDF ${file.fileName}, Seite ${pageNumber}/${totalPages}.`,
      "Lokale PDF-Text-/OCR-Extraktion ist nicht verlaesslich genug fuer fachliche Werte; OpenAI erhaelt die PDF-Datei als Dokumentinput.",
      warnings.length ? `Dokumentwarnungen: ${warnings.join("; ")}` : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Bild ${file.fileName}, Seite ${pageNumber}/${totalPages}.`,
    "Kein lokaler OCR-Text vorhanden; OpenAI erhaelt das Bild als visuellen Input.",
    warnings.length ? `Qualitaetswarnungen: ${warnings.join("; ")}` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

export class DocumentProcessingService {
  async processUploadedFiles(files: UploadedDocumentFile[], options: DocumentProcessingOptions = {}): Promise<DocumentProcessingResult> {
    if (files.length === 0) {
      throw new DocumentProcessingError("DOC_NO_READABLE_PAGES", "Keine Dateien im Upload gefunden.");
    }

    for (const file of files) {
      assertAllowed(file);
    }

    const directory = uploadDir();
    await mkdir(directory, { recursive: true }).catch((_error) => {
      throw new DocumentProcessingError("DOC_STORAGE_FAILED", "Upload-Verzeichnis konnte nicht erstellt werden.", 500);
    });

    const pages: StoredInvoicePage[] = [];
    const aiPages: InvoiceAIPageInput[] = [];
    const aiFiles: InvoiceAIFileInput[] = [];
    const warnings: string[] = [];
    let pageCursor = 1;
    const now = Date.now();

    for (const [fileIndex, file] of files.entries()) {
      let pageCount = 1;
      let fileWarnings: string[] = [];

      if (file.mimeType === "application/pdf") {
        const inspection = pdfPageRenderer.inspect(file.buffer);
        if (inspection.encrypted) {
          throw new DocumentProcessingError("DOC_ENCRYPTED_PDF", `PDF ist verschluesselt oder geschuetzt: ${file.fileName}`);
        }
        pageCount = inspection.pageCount;
        fileWarnings = inspection.warnings;
      }

      const totalAfterFile = pageCursor + pageCount - 1;
      if (totalAfterFile > financeProConfig.aiMaxPagesPerAnalysis) {
        throw new DocumentProcessingError(
          "DOC_TOO_MANY_PAGES",
          `Dokumentgruppe hat ${totalAfterFile} Seiten; erlaubt sind maximal ${financeProConfig.aiMaxPagesPerAnalysis}.`,
          413
        );
      }

      const storedName = `${now}-${fileIndex + 1}-${safeFileName(file.fileName)}`;
      const filePath =
        options.saveOriginalFile !== undefined
          ? await options.saveOriginalFile(file, fileIndex)
          : path.join(directory, storedName);

      if (!options.saveOriginalFile) {
        await writeFile(filePath, file.buffer).catch((_error) => {
          throw new DocumentProcessingError("DOC_STORAGE_FAILED", `Datei konnte nicht gespeichert werden: ${file.fileName}`, 500);
        });
      }

      aiFiles.push({
        fileName: file.fileName,
        mimeType: file.mimeType,
        dataBase64: file.buffer.toString("base64"),
        pageStart: pageCursor,
        pageCount
      });

      for (let localPage = 1; localPage <= pageCount; localPage += 1) {
        const pageNumber = pageCursor + localPage - 1;
        const quality = imagePreprocessingService.assessFile({
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.size
        });
        const pageWarnings = [...fileWarnings, ...quality.warnings];
        warnings.push(...pageWarnings);
        const extractedText = textSignalForPage(file, pageNumber, totalAfterFile, pageWarnings);

        pages.push({
          fileName: file.fileName,
          mimeType: file.mimeType,
          originalFilePath: filePath,
          previewImagePath: null,
          pageImagePath: file.mimeType.startsWith("image/") ? filePath : null,
          thumbnailPath: null,
          originalPageFilePath: filePath,
          pageNumberDetected: pageNumber,
          totalPagesDetected: totalAfterFile,
          qualityStatus: quality.qualityStatus,
          sharpnessScore: quality.sharpnessScore,
          completenessScore: quality.completenessScore,
          perspectiveScore: quality.perspectiveScore,
          extractedText
        });

        aiPages.push({
          pageNumber,
          mimeType: file.mimeType,
          fileName: file.fileName,
          dataBase64: file.mimeType.startsWith("image/") ? file.buffer.toString("base64") : undefined,
          text: extractedText,
          qualityWarnings: pageWarnings
        });
      }

      pageCursor += pageCount;
    }

    if (pages.length === 0) {
      throw new DocumentProcessingError("DOC_NO_READABLE_PAGES", "Es wurden keine lesbaren Seiten vorbereitet.");
    }

    return {
      originalFileName: files.map((file) => file.fileName).join(", "),
      mimeType: files.length === 1 ? files[0].mimeType : "application/octet-stream",
      pageCount: pages.length,
      pages,
      aiInput: {
        originalFileName: files.map((file) => file.fileName).join(", "),
        mimeType: files.length === 1 ? files[0].mimeType : "application/octet-stream",
        pageCount: pages.length,
        pages: aiPages,
        sourceFiles: aiFiles,
        locale: "de-AT",
        currencyHint: "EUR"
      },
      warnings: Array.from(new Set(warnings))
    };
  }

  async buildAIInputFromStoredPages(params: {
    invoiceId: string;
    originalFileName: string;
    mimeType: string;
    pages: StoredInvoicePage[];
  }): Promise<InvoiceAIInput> {
    const sourceFileMap = new Map<string, InvoiceAIFileInput>();
    const aiPages: InvoiceAIPageInput[] = [];

    for (const page of params.pages) {
      const pageNumber = page.pageNumberDetected ?? aiPages.length + 1;
      aiPages.push({
        pageNumber,
        mimeType: page.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        fileName: page.fileName,
        text: page.extractedText,
        qualityWarnings: page.qualityStatus === "accepted" ? [] : [`Seitenstatus ${page.qualityStatus}`]
      });

      if (!sourceFileMap.has(page.originalFilePath)) {
        const data = await readFile(page.originalFilePath);
        const mimeType = page.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg";
        sourceFileMap.set(page.originalFilePath, {
          fileName: page.fileName,
          mimeType,
          dataBase64: data.toString("base64"),
          pageStart: pageNumber,
          pageCount: params.pages.filter((candidate) => candidate.originalFilePath === page.originalFilePath).length
        });
      }
    }

    return {
      invoiceId: params.invoiceId,
      originalFileName: params.originalFileName,
      mimeType: params.mimeType,
      pageCount: params.pages.length,
      pages: aiPages,
      sourceFiles: Array.from(sourceFileMap.values()),
      locale: "de-AT",
      currencyHint: "EUR"
    };
  }
}

export const documentProcessingService = new DocumentProcessingService();

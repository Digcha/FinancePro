import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createWorker } from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["xml", "ubl", "txt"].includes(extension)) return file.text();
  if (extension === "pdf") return extractPdfText(file);
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return recognizeImageText(file);
  return "";
}

async function extractPdfText(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjsLib.getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map((item) => ("str" in item ? item.str : "")).join("\n"));
  }

  const text = pageTexts.join("\n\n").trim();
  if (text.length > 40) return text;
  return recognizeRenderedPdfPage(document);
}

async function recognizeRenderedPdfPage(pdfDocument: pdfjsLib.PDFDocumentProxy): Promise<string> {
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) return "";
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return "";
  return recognizeImageText(blob);
}

async function recognizeImageText(image: Blob): Promise<string> {
  const worker = await createWorker("deu+eng");
  try {
    const result = await worker.recognize(image);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeInvoiceDocument } from "../api/dist/src/lib/documentIntelligence.js";
import { uploadInvoiceBlob } from "../api/dist/src/lib/storage.js";
import { checkVatNumber } from "../api/dist/src/lib/vies.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
});

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "financepro-app-service",
    time: new Date().toISOString(),
  });
});

app.get("/api/check-vat", async (request, response) => {
  try {
    const uid = String(request.query.uid ?? "");
    if (!uid.trim()) {
      response.status(400).json({ error: "Parameter uid fehlt." });
      return;
    }

    response.json(await checkVatNumber(uid));
  } catch (error) {
    response.status(500).json({
      error: "UID-Prüfung fehlgeschlagen.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/analyze-invoice", upload.single("file"), async (request, response) => {
  try {
    const uploadedFile = request.file;
    const buffer = uploadedFile?.buffer ?? Buffer.from(await readRequestBody(request));
    const fileName = uploadedFile?.originalname ?? request.header("x-file-name") ?? `invoice-${Date.now()}`;
    const contentType = uploadedFile?.mimetype ?? request.header("content-type") ?? "application/octet-stream";

    if (buffer.byteLength === 0) {
      response.status(400).json({ error: "Leere Datei erhalten." });
      return;
    }

    const [analysis, blob] = await Promise.all([
      analyzeInvoiceDocument(buffer, contentType),
      uploadInvoiceBlob(fileName, buffer, contentType).catch(() => undefined),
    ]);

    response.json({
      ...analysis,
      storage: blob,
    });
  } catch (error) {
    response.status(500).json({
      error: "Azure-Rechnungsanalyse fehlgeschlagen.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

app.use(express.static(distDir, {
  index: false,
  immutable: true,
  maxAge: "1y",
}));

app.use((_request, response) => {
  response.sendFile(path.join(distDir, "index.html"));
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`FinancePro listening on port ${port}`);
});

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

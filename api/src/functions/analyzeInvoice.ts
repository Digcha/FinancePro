import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { analyzeInvoiceDocument } from "../lib/documentIntelligence.js";
import { uploadInvoiceBlob } from "../lib/storage.js";

export async function analyzeInvoice(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const fileName = request.headers.get("x-file-name") ?? `invoice-${Date.now()}`;
    const contentType = request.headers.get("content-type") ?? "application/octet-stream";
    const buffer = Buffer.from(await request.arrayBuffer());

    if (buffer.byteLength === 0) {
      return {
        status: 400,
        jsonBody: { error: "Leere Datei erhalten." },
      };
    }

    const [analysis, blob] = await Promise.all([
      analyzeInvoiceDocument(buffer, contentType),
      uploadInvoiceBlob(fileName, buffer, contentType).catch((error: unknown) => {
        context.warn(`Blob upload skipped/failed: ${String(error)}`);
        return undefined;
      }),
    ]);

    return {
      status: 200,
      jsonBody: {
        ...analysis,
        storage: blob,
      },
    };
  } catch (error) {
    context.error(error);
    return {
      status: 500,
      jsonBody: {
        error: "Azure-Rechnungsanalyse fehlgeschlagen.",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

app.http("analyzeInvoice", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "analyze-invoice",
  handler: analyzeInvoice,
});

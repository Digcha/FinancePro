import { Readable } from "node:stream";
import { getApiSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/http/api-errors";
import { tenantStorageService } from "@/lib/storage/tenant-storage-service";

interface RouteContext {
  params: Promise<{ id: string; pageNumber: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const apiSession = await getApiSession();
  if (!apiSession.ok) {
    return jsonError(apiSession.message, apiSession.status, apiSession.code);
  }

  const { id, pageNumber } = await context.params;
  const file = await tenantStorageService.getProtectedFileStream(apiSession.session, id, "page", Number(pageNumber));
  if (!file) {
    return jsonError("Seitenvorschau wurde nicht gefunden.", 404, "INVOICE_FILE_NOT_FOUND");
  }

  return new Response(Readable.toWeb(file.stream) as ReadableStream, {
    headers: {
      "content-type": file.mimeType,
      "content-length": String(file.size)
    }
  });
}

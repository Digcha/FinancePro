import { Readable } from "node:stream";
import { getApiSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/http/api-errors";
import { tenantStorageService } from "@/lib/storage/tenant-storage-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const apiSession = await getApiSession();
  if (!apiSession.ok) {
    return jsonError(apiSession.message, apiSession.status, apiSession.code);
  }

  const { id } = await context.params;
  const file = await tenantStorageService.getProtectedFileStream(apiSession.session, id, "original");
  if (!file) {
    return jsonError("Datei wurde nicht gefunden oder ist nicht freigegeben.", 404, "INVOICE_FILE_NOT_FOUND");
  }

  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  return new Response(Readable.toWeb(file.stream) as ReadableStream, {
    headers: {
      "content-type": file.mimeType,
      "content-length": String(file.size),
      "content-disposition": `${disposition}; filename="${file.fileName.replace(/"/g, "")}"`
    }
  });
}

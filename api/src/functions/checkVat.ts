import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { checkVatNumber } from "../lib/vies.js";

export async function checkVat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const uid = request.query.get("uid") ?? "";
    if (!uid.trim()) {
      return {
        status: 400,
        jsonBody: { error: "Parameter uid fehlt." },
      };
    }

    const result = await checkVatNumber(uid);
    return {
      status: 200,
      jsonBody: result,
    };
  } catch (error) {
    context.error(error);
    return {
      status: 500,
      jsonBody: {
        error: "UID-Prüfung fehlgeschlagen.",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

app.http("checkVat", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "check-vat",
  handler: checkVat,
});

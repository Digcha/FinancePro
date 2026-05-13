import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  RateLimitError
} from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { financeProConfig } from "@/lib/config";
import { buildInvoiceExtractionUserPrompt, invoiceExtractionSystemPrompt } from "../prompts/invoice-extraction-prompt";
import {
  InvoiceAIExtractionResultSchema,
  InvoiceAIJsonSchemaName,
  parseInvoiceAIJson
} from "../schemas/invoice-ai-result.schema";
import { AIInvoiceExtractionError, type InvoiceAIExtractionResult, type InvoiceAIInput } from "../types";
import type { AIInvoiceExtractionProvider } from "./ai-provider.interface";

function dataUrl(mimeType: string, base64: string) {
  return base64.startsWith("data:") ? base64 : `data:${mimeType};base64,${base64}`;
}

function pageTextSummary(input: InvoiceAIInput) {
  return input.pages
    .map((page) => {
      const warnings = page.qualityWarnings?.length ? ` Warnungen: ${page.qualityWarnings.join("; ")}` : "";
      return `Seite ${page.pageNumber}: ${page.text || "kein OCR-Text vorhanden."}${warnings}`;
    })
    .join("\n\n");
}

function toAIError(error: unknown): AIInvoiceExtractionError {
  if (error instanceof AIInvoiceExtractionError) {
    return error;
  }

  if (
    error instanceof APIConnectionTimeoutError ||
    error instanceof APIUserAbortError ||
    (error instanceof Error && error.name === "AbortError")
  ) {
    return new AIInvoiceExtractionError("AI_TIMEOUT", "OpenAI Analyse hat das Zeitlimit überschritten.", error);
  }

  if (error instanceof RateLimitError) {
    return new AIInvoiceExtractionError("AI_RATE_LIMIT", "OpenAI Rate Limit erreicht. Bitte später erneut versuchen.", error);
  }

  if (error instanceof AuthenticationError) {
    return new AIInvoiceExtractionError("AI_PROVIDER_ERROR", "OpenAI API-Key ist ungültig oder nicht berechtigt.", error);
  }

  if (error instanceof APIError) {
    const providerMessage = typeof error.message === "string" ? error.message.replace(/^\\d+\\s*/, "") : "Unbekannter Providerfehler.";
    return new AIInvoiceExtractionError(
      "AI_PROVIDER_ERROR",
      `OpenAI Providerfehler (${error.status ?? "unbekannter Status"}): ${providerMessage}`,
      error
    );
  }

  return new AIInvoiceExtractionError("AI_PROVIDER_ERROR", "OpenAI Analyse konnte nicht abgeschlossen werden.", error);
}

export class OpenAIInvoiceProvider implements AIInvoiceExtractionProvider {
  private readonly client: OpenAI | null;
  private readonly modelName: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly timeoutMs: number;

  constructor(options: Partial<{
    apiKey: string;
    modelName: string;
    temperature: number;
    maxOutputTokens: number;
    timeoutMs: number;
  }> = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.client = apiKey.trim() ? new OpenAI({ apiKey }) : null;
    this.modelName = options.modelName ?? financeProConfig.aiModel;
    this.temperature = options.temperature ?? financeProConfig.aiTemperature;
    this.maxOutputTokens = options.maxOutputTokens ?? financeProConfig.aiMaxOutputTokens;
    this.timeoutMs = options.timeoutMs ?? financeProConfig.aiAnalysisTimeoutMs;
  }

  async extractInvoice(input: InvoiceAIInput): Promise<InvoiceAIExtractionResult> {
    if (!this.client) {
      throw new AIInvoiceExtractionError(
        "AI_NOT_CONFIGURED",
        "OPENAI_API_KEY fehlt. Die App kann ohne Schlüssel im Mock-Modus laufen."
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const content: any[] = [
        {
          type: "input_text",
          text: [
            "Return one valid json object only. Do not include markdown.",
            buildInvoiceExtractionUserPrompt({
              originalFileName: input.originalFileName,
              pageCount: input.pageCount,
              locale: input.locale,
              currencyHint: input.currencyHint,
              pageTextSummary: pageTextSummary(input)
            })
          ].join("\n\n")
        }
      ];

      for (const file of input.sourceFiles ?? []) {
        if (file.mimeType === "application/pdf") {
          content.push({
            type: "input_file",
            filename: file.fileName,
            file_data: dataUrl(file.mimeType, file.dataBase64),
            detail: "high"
          });
        }
      }

      for (const page of input.pages) {
        if (page.dataBase64 && page.mimeType.startsWith("image/")) {
          content.push({
            type: "input_text",
            text: `Bildinput fuer Seite ${page.pageNumber} (${page.fileName}).`
          });
          content.push({
            type: "input_image",
            image_url: dataUrl(page.mimeType, page.dataBase64),
            detail: "auto"
          });
        }
      }

      const response = await this.client.responses.create(
        {
          model: this.modelName as any,
          instructions: invoiceExtractionSystemPrompt,
          input: [
            {
              role: "user",
              content
            }
          ],
          temperature: this.temperature,
          max_output_tokens: this.maxOutputTokens,
          text: {
            format: zodTextFormat(InvoiceAIExtractionResultSchema, InvoiceAIJsonSchemaName, {
              description: "Strukturierte Extraktion einer österreichischen Eingangsrechnung fuer FinancePro."
            })
          },
          store: false
        },
        { signal: controller.signal }
      );

      return parseInvoiceAIJson(response.output_text);
    } catch (error) {
      throw toAIError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getProviderName(): string {
    return "OpenAI";
  }

  getModelName(): string {
    return this.modelName;
  }
}

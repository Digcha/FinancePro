import { financeProConfig } from "@/lib/config";
import { AIInvoiceExtractionError, type AIProviderStatus, type InvoiceAIExtractionResult, type InvoiceAIInput } from "./types";
import type { AIInvoiceExtractionProvider } from "./providers/ai-provider.interface";
import { MockInvoiceProvider } from "./providers/mock-invoice-provider";
import { OpenAIInvoiceProvider } from "./providers/openai-invoice-provider";

export function createInvoiceAIProvider(): AIInvoiceExtractionProvider {
  if (financeProConfig.aiProvider.toLowerCase() === "mock") {
    return new MockInvoiceProvider();
  }

  const openAIProvider = new OpenAIInvoiceProvider();
  if (openAIProvider.isConfigured() || !financeProConfig.aiUseMockWhenKeyMissing) {
    return openAIProvider;
  }

  return new MockInvoiceProvider();
}

export class InvoiceAIService {
  constructor(private readonly provider: AIInvoiceExtractionProvider = createInvoiceAIProvider()) {}

  getProviderStatus(): AIProviderStatus {
    const providerName = this.provider.getProviderName();
    const isMock = providerName.toLowerCase() === "mock";

    return {
      providerName,
      modelName: this.provider.getModelName(),
      configured: this.provider.isConfigured() && !isMock,
      mode: isMock ? "mock" : "openai",
      message: isMock
        ? "KI nicht konfiguriert — Mock-Modus aktiv"
        : `AI: ${providerName} / ${this.provider.getModelName()}`
    };
  }

  async extractInvoice(input: InvoiceAIInput): Promise<InvoiceAIExtractionResult> {
    if (input.pageCount > financeProConfig.aiMaxPagesPerAnalysis) {
      throw new AIInvoiceExtractionError(
        "AI_TOO_MANY_PAGES",
        `Dokument hat ${input.pageCount} Seiten; erlaubt sind maximal ${financeProConfig.aiMaxPagesPerAnalysis}.`
      );
    }

    return this.provider.extractInvoice(input);
  }
}

export const invoiceAIService = new InvoiceAIService();

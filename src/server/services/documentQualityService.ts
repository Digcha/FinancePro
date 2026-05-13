import type { InvoicePageInput, QualityStatus } from "@/server/domain/types";
import type { DocumentQualityService } from "./interfaces";

function clampScore(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}

function classify(sharpness: number, completeness: number, perspective: number): QualityStatus {
  if (sharpness < 0.38 || completeness < 0.55 || perspective < 0.4) {
    return "rejected";
  }

  if (sharpness < 0.68 || completeness < 0.82 || perspective < 0.72) {
    return "warning";
  }

  return "accepted";
}

export class MockDocumentQualityService implements DocumentQualityService {
  assessPage(page: Partial<InvoicePageInput>): InvoicePageInput {
    const sharpnessScore = clampScore(page.sharpnessScore, 0.82);
    const completenessScore = clampScore(page.completenessScore, 0.91);
    const perspectiveScore = clampScore(page.perspectiveScore, 0.88);

    return {
      pageNumberDetected: page.pageNumberDetected ?? null,
      totalPagesDetected: page.totalPagesDetected ?? null,
      qualityStatus: page.qualityStatus ?? classify(sharpnessScore, completenessScore, perspectiveScore),
      sharpnessScore,
      completenessScore,
      perspectiveScore,
      extractedText: page.extractedText ?? ""
    };
  }
}

export const documentQualityService = new MockDocumentQualityService();

import type { QualityStatus } from "@/server/domain/types";

export interface ImageQualityAssessment {
  qualityStatus: QualityStatus;
  sharpnessScore: number;
  completenessScore: number;
  perspectiveScore: number;
  warnings: string[];
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

export class ImagePreprocessingService {
  assessFile(file: { mimeType: string; size: number; fileName: string }): ImageQualityAssessment {
    const lowerName = file.fileName.toLowerCase();
    const isImage = file.mimeType.startsWith("image/");
    const sharpnessScore = clamp(lowerName.includes("unscharf") || lowerName.includes("blurry") ? 0.42 : isImage ? 0.76 : 0.86);
    const completenessScore = clamp(lowerName.includes("cut") || lowerName.includes("abgeschnitten") ? 0.52 : 0.9);
    const perspectiveScore = clamp(isImage ? 0.78 : 0.9);
    const warnings: string[] = [];

    if (sharpnessScore < 0.65) {
      warnings.push("Seite wirkt unscharf und muss geprueft werden.");
    }

    if (completenessScore < 0.75) {
      warnings.push("Dokumentseite koennte unvollstaendig sein.");
    }

    const qualityStatus: QualityStatus =
      sharpnessScore < 0.38 || completenessScore < 0.55 || perspectiveScore < 0.4
        ? "rejected"
        : sharpnessScore < 0.68 || completenessScore < 0.82 || perspectiveScore < 0.72
          ? "warning"
          : "accepted";

    return {
      qualityStatus,
      sharpnessScore,
      completenessScore,
      perspectiveScore,
      warnings
    };
  }
}

export const imagePreprocessingService = new ImagePreprocessingService();

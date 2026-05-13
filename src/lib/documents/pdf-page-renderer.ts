export interface PdfInspectionResult {
  pageCount: number;
  encrypted: boolean;
  warnings: string[];
}

export class PdfPageRenderer {
  inspect(buffer: Buffer): PdfInspectionResult {
    const raw = buffer.toString("latin1");
    const encrypted = /\/Encrypt\b/.test(raw);
    const pageMatches = raw.match(/\/Type\s*\/Page\b/g) ?? [];
    const pageCount = Math.max(pageMatches.length, 1);
    const warnings: string[] = [];

    if (pageMatches.length === 0) {
      warnings.push("PDF-Seitenanzahl konnte nur als Fallback bestimmt werden.");
    }

    if (encrypted) {
      warnings.push("PDF wirkt verschluesselt oder geschuetzt.");
    }

    return {
      pageCount,
      encrypted,
      warnings
    };
  }
}

export const pdfPageRenderer = new PdfPageRenderer();

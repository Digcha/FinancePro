import { ScanCheck, ScanReport, SignalState } from "./types";

const MIN_OCR_WIDTH = 900;
const MIN_OCR_HEIGHT = 900;

export async function analyzeFileQuality(file: File, extractedText = ""): Promise<ScanReport> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "pdf") return analyzePdfQuality(file, extractedText);
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return analyzeImageQuality(file);
  if (["xml", "ubl", "txt", "eml"].includes(extension)) return structuredDocumentQuality(extractedText);
  return defaultScanReport("warn", 58, "Dateityp nicht vollständig bewertbar.");
}

export function defaultScanReport(state: SignalState = "warn", score = 70, detail = "Keine Scanprüfung verfügbar."): ScanReport {
  const checks: ScanCheck[] = [
    { id: "sharpness", label: "Schärfe", state, detail },
    { id: "completeness", label: "Vollständigkeit", state, detail: state === "ok" ? "Dokument vollständig erfasst." : "Blattkanten konnten nicht sicher geprüft werden." },
    { id: "perspective", label: "Perspektive", state: state === "risk" ? "risk" : "warn", detail: "Perspektive nicht sicher messbar." },
    { id: "brightness", label: "Helligkeit/Kontrast", state, detail },
    { id: "resolution", label: "Auflösung", state, detail },
    { id: "duplicate", label: "Duplikatprüfung", state: "ok", detail: "Wird gegen Rechnungsnummer und Betrag geprüft." },
  ];
  return summarizeScanChecks(checks, score);
}

function analyzePdfQuality(file: File, extractedText: string): ScanReport {
  const hasText = extractedText.trim().length > 40;
  const sizeOk = file.size > 8_000;
  const checks: ScanCheck[] = [
    {
      id: "sharpness",
      label: "Schärfe",
      state: hasText ? "ok" : "warn",
      detail: hasText ? "PDF enthält auslesbaren Text." : "Kein ausreichender PDF-Text. OCR-Fallback nötig.",
    },
    {
      id: "completeness",
      label: "Vollständigkeit",
      state: sizeOk ? "ok" : "warn",
      detail: sizeOk ? "PDF-Datei ist plausibel groß." : "Sehr kleine PDF-Datei. Vollständigkeit prüfen.",
    },
    {
      id: "perspective",
      label: "Perspektive",
      state: "ok",
      detail: "PDF-Import ohne Kameraperspektive.",
    },
    {
      id: "brightness",
      label: "Helligkeit/Kontrast",
      state: hasText ? "ok" : "warn",
      detail: hasText ? "Textlayer vorhanden." : "Bei gescannten PDFs kann Kontrast die OCR beeinflussen.",
    },
    {
      id: "resolution",
      label: "Auflösung",
      state: sizeOk ? "ok" : "warn",
      detail: sizeOk ? "Dateigröße für OCR plausibel." : "Auflösung nicht sicher bewertbar.",
    },
    {
      id: "duplicate",
      label: "Duplikatprüfung",
      state: "ok",
      detail: "Dublettenprüfung läuft über Rechnungsnummer, Lieferant und Betrag.",
    },
  ];
  return summarizeScanChecks(checks, hasText ? 92 : 66);
}

function structuredDocumentQuality(text: string): ScanReport {
  const checks: ScanCheck[] = [
    { id: "sharpness", label: "Schärfe", state: "ok", detail: "Strukturdaten benötigen keine Bildschärfeprüfung." },
    { id: "completeness", label: "Vollständigkeit", state: text.trim().length > 20 ? "ok" : "warn", detail: "Strukturierte Datei wurde eingelesen." },
    { id: "perspective", label: "Perspektive", state: "ok", detail: "Keine Kameraperspektive bei XML/UBL." },
    { id: "brightness", label: "Helligkeit/Kontrast", state: "ok", detail: "Nicht relevant für strukturierte Daten." },
    { id: "resolution", label: "Auflösung", state: "ok", detail: "Nicht relevant für strukturierte Daten." },
    { id: "duplicate", label: "Duplikatprüfung", state: "ok", detail: "Dublettenprüfung läuft über Rechnungsnummer, Lieferant und Betrag." },
  ];
  return summarizeScanChecks(checks, 100);
}

async function analyzeImageQuality(file: File): Promise<ScanReport> {
  const bitmap = await createImageBitmap(file);
  const sample = sampleImage(bitmap);
  bitmap.close();

  const resolutionOk = sample.width >= MIN_OCR_WIDTH && sample.height >= MIN_OCR_HEIGHT;
  const brightnessOk = sample.brightness > 70 && sample.brightness < 225;
  const contrastOk = sample.contrast > 28;
  const sharpnessOk = sample.edgeEnergy > 10;
  const completenessOk = sample.borderInkRatio < 0.32;

  const checks: ScanCheck[] = [
    {
      id: "sharpness",
      label: "Schärfe",
      state: sharpnessOk ? "ok" : "risk",
      detail: sharpnessOk ? "Kanten und Textkontrast sind für OCR plausibel." : "Bild wirkt unscharf. Kamera ruhiger halten.",
    },
    {
      id: "completeness",
      label: "Vollständigkeit",
      state: completenessOk ? "ok" : "warn",
      detail: completenessOk ? "Ränder wirken nicht stark abgeschnitten." : "Möglicherweise abgeschnittene Blattbereiche.",
    },
    {
      id: "perspective",
      label: "Perspektive",
      state: completenessOk ? "ok" : "warn",
      detail: completenessOk ? "Dokumentränder sind für den Review plausibel." : "Kamera gerader ausrichten und das ganze Blatt erfassen.",
    },
    {
      id: "brightness",
      label: "Helligkeit/Kontrast",
      state: brightnessOk && contrastOk ? "ok" : "risk",
      detail: brightnessOk && contrastOk ? "Helligkeit und Kontrast sind OCR-tauglich." : "Mehr Licht oder kontrastreicheren Hintergrund verwenden.",
    },
    {
      id: "resolution",
      label: "Auflösung",
      state: resolutionOk ? "ok" : "risk",
      detail: resolutionOk ? `${sample.width} x ${sample.height}px erfüllt die Mindestgröße.` : `${sample.width} x ${sample.height}px ist für OCR zu niedrig.`,
    },
    {
      id: "duplicate",
      label: "Duplikatprüfung",
      state: "ok",
      detail: "Dublettenprüfung läuft über Rechnungsnummer, Lieferant und Betrag.",
    },
  ];

  return summarizeScanChecks(checks);
}

function sampleImage(bitmap: ImageBitmap) {
  const width = Math.min(bitmap.width, 900);
  const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return { width: bitmap.width, height: bitmap.height, brightness: 128, contrast: 0, edgeEnergy: 0, borderInkRatio: 1 };
  }
  context.drawImage(bitmap, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const luminance: number[] = [];
  let sum = 0;
  let borderDarkPixels = 0;
  let borderPixels = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      const value = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      luminance.push(value);
      sum += value;
      const isBorder = x < width * 0.04 || x > width * 0.96 || y < height * 0.04 || y > height * 0.96;
      if (isBorder) {
        borderPixels += 1;
        if (value < 115) borderDarkPixels += 1;
      }
    }
  }

  const brightness = sum / Math.max(1, luminance.length);
  const variance = luminance.reduce((acc, value) => acc + Math.pow(value - brightness, 2), 0) / Math.max(1, luminance.length);
  const contrast = Math.sqrt(variance);
  let edgeSum = 0;
  for (let index = 1; index < luminance.length; index += 1) {
    edgeSum += Math.abs(luminance[index] - luminance[index - 1]);
  }

  return {
    width: bitmap.width,
    height: bitmap.height,
    brightness,
    contrast,
    edgeEnergy: edgeSum / Math.max(1, luminance.length),
    borderInkRatio: borderDarkPixels / Math.max(1, borderPixels),
  };
}

function summarizeScanChecks(checks: ScanCheck[], explicitScore?: number): ScanReport {
  const riskCount = checks.filter((check) => check.state === "risk").length;
  const warnCount = checks.filter((check) => check.state === "warn").length;
  const status: SignalState = riskCount > 0 ? "risk" : warnCount > 0 ? "warn" : "ok";
  const score =
    explicitScore ??
    Math.max(
      0,
      Math.min(
        100,
        Math.round(100 - riskCount * 22 - warnCount * 9),
      ),
    );
  const hints = checks
    .filter((check) => check.state !== "ok")
    .map((check) => check.detail)
    .slice(0, 3);

  return {
    status,
    score,
    checks,
    hints: hints.length ? hints : ["Dokument erkannt - Scan ist für den nächsten Schritt geeignet."],
  };
}

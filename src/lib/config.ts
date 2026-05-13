export function envString(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

export function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function envBoolean(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export const financeProConfig = {
  aiProvider: envString("AI_PROVIDER", "openai"),
  aiModel: envString("AI_MODEL", "gpt-4o-mini"),
  aiTemperature: envNumber("AI_TEMPERATURE", 0),
  aiMaxOutputTokens: envNumber("AI_MAX_OUTPUT_TOKENS", 8000),
  aiMaxPagesPerAnalysis: envNumber("AI_MAX_PAGES_PER_ANALYSIS", 8),
  aiAnalysisTimeoutMs: envNumber("AI_ANALYSIS_TIMEOUT_SECONDS", 90) * 1000,
  aiUseMockWhenKeyMissing: envBoolean("AI_USE_MOCK_WHEN_KEY_MISSING", true),
  maxUploadMb: envNumber("MAX_UPLOAD_MB", 25),
  allowedUploadTypes: envString(
    "ALLOWED_UPLOAD_TYPES",
    "application/pdf,image/png,image/jpeg,image/jpg"
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  amountToleranceEur: envNumber("AMOUNT_TOLERANCE_EUR", 0.02),
  lowConfidenceThreshold: envNumber("LOW_CONFIDENCE_THRESHOLD", 0.75),
  uploadDir: envString("UPLOAD_DIR", "./uploads")
};

import type { GeneratedResult, GenerateRequest, Usage } from "@/lib/memory";

const timeoutMs = 1500;

type GenerationMetrics = {
  durationMs: number;
  outputChars: number;
  status: "ok" | "error";
  errorCategory?: string;
};

export async function logGenerationEvent(
  request: Request,
  payload: GenerateRequest,
  result: GeneratedResult,
  usage: Usage,
  metrics: GenerationMetrics
) {
  await insertGenerationEvent(request, payload, {
    forcedIntent: payload.forcedIntent,
    detectedIntent: result.detectedIntent,
    riskLevel: result.riskLevel,
    inputChars: payload.inputText.length,
    promptChars: usage.promptChars,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    durationMs: metrics.durationMs,
    outputChars: metrics.outputChars,
    status: metrics.status,
    errorCategory: metrics.errorCategory
  });
}

export async function logGenerationFailure(
  request: Request,
  payload: GenerateRequest,
  metrics: Pick<GenerationMetrics, "durationMs" | "errorCategory">
) {
  await insertGenerationEvent(request, payload, {
    forcedIntent: payload.forcedIntent,
    detectedIntent: "error",
    riskLevel: "none",
    inputChars: payload.inputText.length,
    promptChars: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    durationMs: metrics.durationMs,
    outputChars: 0,
    status: "error",
    errorCategory: metrics.errorCategory
  });
}

type InsertGenerationEvent = {
  forcedIntent: string;
  detectedIntent: string;
  riskLevel: string;
  inputChars: number;
  promptChars: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  outputChars: number;
  status: "ok" | "error";
  errorCategory?: string;
};

async function insertGenerationEvent(request: Request, payload: GenerateRequest, event: InsertGenerationEvent) {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !apiKey) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(`${supabaseUrl}/rest/v1/fm_generation_events`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        install_id: cleanHeader(request.headers.get("x-fm-install-id")) || null,
        source: cleanText(payload.contextPacket?.source ?? payload.pageContext?.source ?? "web"),
        forced_intent: cleanText(event.forcedIntent) || "auto",
        detected_intent: cleanText(event.detectedIntent) || "error",
        risk_level: cleanRiskLevel(event.riskLevel),
        input_chars: Math.max(0, event.inputChars),
        prompt_chars: Math.max(0, event.promptChars),
        input_tokens: Math.max(0, event.inputTokens),
        output_tokens: Math.max(0, event.outputTokens),
        total_tokens: Math.max(0, event.totalTokens),
        duration_ms: Math.max(0, Math.round(event.durationMs)),
        output_chars: Math.max(0, event.outputChars),
        status: event.status,
        error_category: event.errorCategory ? cleanText(event.errorCategory).slice(0, 80) : null
      }),
      signal: controller.signal
    });
  } catch {
    // Usage logging must never break reply generation.
  } finally {
    clearTimeout(timeout);
  }
}

function cleanHeader(value: string | null) {
  return cleanText(value ?? "").slice(0, 120);
}

function cleanText(value: string) {
  return value.replace(/[^\w .:@/-]/g, "").trim();
}

function cleanRiskLevel(value: string) {
  return ["none", "low", "medium", "high"].includes(value) ? value : "none";
}

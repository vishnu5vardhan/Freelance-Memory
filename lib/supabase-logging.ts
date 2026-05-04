import type { GeneratedResult, GenerateRequest, Usage } from "@/lib/memory";

const timeoutMs = 1500;

export async function logGenerationEvent(
  request: Request,
  payload: GenerateRequest,
  result: GeneratedResult,
  usage: Usage
) {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(`${supabaseUrl}/rest/v1/fm_generation_events`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        install_id: cleanHeader(request.headers.get("x-fm-install-id")) || null,
        source: cleanText(payload.contextPacket?.source ?? payload.pageContext?.source ?? "web"),
        forced_intent: payload.forcedIntent,
        detected_intent: result.detectedIntent,
        risk_level: result.riskLevel,
        input_chars: payload.inputText.length,
        prompt_chars: usage.promptChars,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens
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

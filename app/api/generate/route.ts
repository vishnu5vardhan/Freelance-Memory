import { NextResponse } from "next/server";
import { generatedResultSchema, generateRequestSchema, type Usage } from "@/lib/memory";
import { applyRiskSafeguards } from "@/lib/memory-risk";
import { buildPrompt, compactContext, generationSchema, getRequestSource } from "@/lib/prompt";
import { checkDailyRateLimit, getByoOpenAIKey, getInstallId } from "@/lib/rate-limit";
import { logGenerationEvent, logGenerationFailure } from "@/lib/supabase-logging";

const openaiUrl = "https://api.openai.com/v1/responses";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const byoKey = getByoOpenAIKey(request);

  if (!byoKey) {
    const rate = await checkDailyRateLimit(getInstallId(request));

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Daily free limit reached (${rate.limit}/day). Add your OpenAI key in Advanced for unlimited.`,
          code: "rate_limited",
          used: rate.used,
          limit: rate.limit
        },
        { status: 429 }
      );
    }
  }

  const apiKey = byoKey ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Missing OPENAI_API_KEY. Add it to freelancer memory/.env.local and restart the dev server."
      },
      { status: 503 }
    );
  }

  const compacted = compactContext(parsed.data.context, parsed.data.inputText, parsed.data.forcedIntent, getRequestSource(parsed.data));
  const prompt = buildPrompt(parsed.data);
  const startedAt = Date.now();
  const response = await fetch(openaiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 1200,
      text: {
        format: {
          type: "json_schema",
          name: "freelancer_reply",
          strict: true,
          schema: generationSchema
        }
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    await logGenerationFailure(request, parsed.data, {
      durationMs: Date.now() - startedAt,
      errorCategory: "openai_request_failed"
    });
    return NextResponse.json(
      {
        error: "OpenAI request failed.",
        detail
      },
      { status: 502 }
    );
  }

  const data = await response.json();
  const rawText = extractOutputText(data);

  if (!rawText) {
    await logGenerationFailure(request, parsed.data, {
      durationMs: Date.now() - startedAt,
      errorCategory: "empty_openai_output"
    });
    return NextResponse.json(
      {
        error: "OpenAI returned no text output."
      },
      { status: 502 }
    );
  }

  try {
    const parsedResult = generatedResultSchema.safeParse(JSON.parse(rawText));

    if (!parsedResult.success) {
      await logGenerationFailure(request, parsed.data, {
        durationMs: Date.now() - startedAt,
        errorCategory: "unexpected_openai_shape"
      });
      return NextResponse.json(
        {
          error: "OpenAI returned unexpected shape.",
          detail: parsedResult.error.message
        },
        { status: 502 }
      );
    }

    const result = applyRiskSafeguards(parsedResult.data, parsed.data);
    const usage = extractUsage(data, prompt.length, compacted.fields);
    await logGenerationEvent(request, parsed.data, result, usage, {
      durationMs: Date.now() - startedAt,
      outputChars: result.reply?.length ?? 0,
      status: "ok"
    });

    return NextResponse.json({
      result,
      usage
    });
  } catch {
    await logGenerationFailure(request, parsed.data, {
      durationMs: Date.now() - startedAt,
      errorCategory: "invalid_openai_json"
    });
    return NextResponse.json(
      {
        error: "OpenAI returned invalid JSON.",
        detail: rawText
      },
      { status: 502 }
    );
  }
}

function extractUsage(data: unknown, promptChars: number, compactedFields: string[]): Usage {
  const usage =
    typeof data === "object" && data !== null && "usage" in data && typeof data.usage === "object" && data.usage !== null
      ? data.usage
      : {};

  const inputTokens = getNumber(usage, "input_tokens") ?? getNumber(usage, "prompt_tokens") ?? 0;
  const outputTokens = getNumber(usage, "output_tokens") ?? getNumber(usage, "completion_tokens") ?? 0;
  const totalTokens = getNumber(usage, "total_tokens") ?? inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    promptChars,
    compactedFields
  };
}

function getNumber(value: object, key: string) {
  return key in value && typeof value[key as keyof typeof value] === "number" ? value[key as keyof typeof value] : undefined;
}

function extractOutputText(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return "";
  }

  if ("output_text" in data && typeof data.output_text === "string") {
    return data.output_text;
  }

  const output = "output" in data && Array.isArray(data.output) ? data.output : [];

  for (const item of output) {
    if (typeof item !== "object" || item === null || !("content" in item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        typeof content === "object" &&
        content !== null &&
        "type" in content &&
        content.type === "output_text" &&
        "text" in content &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return "";
}

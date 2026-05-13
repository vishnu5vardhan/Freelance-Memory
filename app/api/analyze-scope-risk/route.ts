import { NextResponse } from "next/server";
import { contextPacketSchema, analyzeScopeRiskResponseSchema } from "@/lib/memory";
import { analyzeScopeRiskSchema, buildAnalyzeScopeRiskPrompt } from "@/lib/prompt";
import { callStructuredOpenAI } from "@/lib/openai";
import { checkDailyRateLimit, getByoOpenAIKey, getInstallId } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = contextPacketSchema.safeParse(json);

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
      { error: "Missing OPENAI_API_KEY. Add it to .env.local and restart the dev server." },
      { status: 503 }
    );
  }

  const prompt = buildAnalyzeScopeRiskPrompt(parsed.data);
  const result = await callStructuredOpenAI({
    apiKey,
    prompt,
    schemaName: "analyze_scope_risk",
    schema: analyzeScopeRiskSchema,
    maxOutputTokens: 700
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, detail: result.detail }, { status: result.status });
  }

  const validated = analyzeScopeRiskResponseSchema.safeParse(result.data);

  if (!validated.success) {
    return NextResponse.json(
      { error: "AI returned unexpected shape.", detail: validated.error.message },
      { status: 502 }
    );
  }

  return NextResponse.json({ result: validated.data });
}

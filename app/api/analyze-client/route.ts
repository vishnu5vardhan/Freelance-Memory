import { NextResponse } from "next/server";
import { requireBetaAccess } from "@/lib/api-auth";
import { contextPacketSchema, analyzeClientResponseSchema } from "@/lib/memory";
import { analyzeClientSchema, buildAnalyzeClientPrompt } from "@/lib/prompt";
import { callStructuredOpenAI } from "@/lib/openai";

export async function POST(request: Request) {
  const authError = requireBetaAccess(request);

  if (authError) {
    return authError;
  }

  const json = await request.json().catch(() => null);
  const parsed = contextPacketSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Add it to .env.local and restart the dev server." },
      { status: 503 }
    );
  }

  const prompt = buildAnalyzeClientPrompt(parsed.data);
  const result = await callStructuredOpenAI({
    apiKey,
    prompt,
    schemaName: "analyze_client",
    schema: analyzeClientSchema,
    maxOutputTokens: 900
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, detail: result.detail }, { status: result.status });
  }

  const validated = analyzeClientResponseSchema.safeParse(result.data);

  if (!validated.success) {
    return NextResponse.json(
      { error: "AI returned unexpected shape.", detail: validated.error.message },
      { status: 502 }
    );
  }

  return NextResponse.json({ result: validated.data });
}

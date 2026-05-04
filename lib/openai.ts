const OPENAI_URL = "https://api.openai.com/v1/responses";

type StructuredCallOptions = {
  apiKey: string;
  prompt: string;
  schemaName: string;
  schema: object;
  maxOutputTokens?: number;
};

type StructuredCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; detail?: string; status: number };

export async function callStructuredOpenAI<T>(
  options: StructuredCallOptions
): Promise<StructuredCallResult<T>> {
  let response: Response;

  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: options.prompt,
        max_output_tokens: options.maxOutputTokens ?? 600,
        text: {
          format: {
            type: "json_schema",
            name: options.schemaName,
            strict: true,
            schema: options.schema
          }
        }
      })
    });
  } catch (err) {
    return { ok: false, error: "OpenAI request failed.", detail: String(err), status: 502 };
  }

  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, error: "OpenAI request failed.", detail, status: 502 };
  }

  const data = await response.json();
  const rawText = extractOutputText(data);

  if (!rawText) {
    return { ok: false, error: "OpenAI returned no text output.", status: 502 };
  }

  try {
    const parsed = JSON.parse(rawText) as T;
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: "OpenAI returned invalid JSON.", detail: rawText, status: 502 };
  }
}

function extractOutputText(data: unknown): string {
  if (typeof data !== "object" || data === null) return "";

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

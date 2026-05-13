const dailyFreeLimit = 35;
const timeoutMs = 1000;

export type RateLimitResult = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  source: "supabase" | "skipped";
};

export function getInstallId(request: Request): string {
  return (request.headers.get("x-fm-install-id") ?? "").trim();
}

export function getByoOpenAIKey(request: Request): string | null {
  const raw = (request.headers.get("x-fm-openai-key") ?? "").trim();

  if (!raw || !raw.startsWith("sk-") || raw.length < 20 || raw.length > 200) {
    return null;
  }

  return raw;
}

export function getDailyFreeLimit() {
  return dailyFreeLimit;
}

export async function checkDailyRateLimit(installId: string): Promise<RateLimitResult> {
  const limit = dailyFreeLimit;

  if (!installId) {
    return { allowed: true, used: 0, limit, remaining: limit, source: "skipped" };
  }

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !apiKey) {
    return { allowed: true, used: 0, limit, remaining: limit, source: "skipped" };
  }

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const sinceParam = encodeURIComponent(todayUtc.toISOString());
  const installParam = encodeURIComponent(installId);
  const url = `${supabaseUrl}/rest/v1/fm_generation_events?install_id=eq.${installParam}&status=eq.ok&created_at=gte.${sinceParam}&select=id`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Prefer: "count=exact",
        Range: "0-0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return { allowed: true, used: 0, limit, remaining: limit, source: "skipped" };
    }

    const contentRange = response.headers.get("content-range") ?? "";
    const totalStr = contentRange.split("/")[1] ?? "0";
    const used = Number.parseInt(totalStr, 10);
    const safeUsed = Number.isFinite(used) && used >= 0 ? used : 0;
    const remaining = Math.max(0, limit - safeUsed);

    return {
      allowed: safeUsed < limit,
      used: safeUsed,
      limit,
      remaining,
      source: "supabase"
    };
  } catch {
    return { allowed: true, used: 0, limit, remaining: limit, source: "skipped" };
  } finally {
    clearTimeout(timeout);
  }
}

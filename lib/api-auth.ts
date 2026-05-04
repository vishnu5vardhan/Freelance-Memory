import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

const betaKeyHeader = "x-fm-beta-key";

export function requireBetaAccess(request: Request) {
  const expected = process.env.BETA_API_KEY?.trim();

  if (!expected) {
    return null;
  }

  const received = request.headers.get(betaKeyHeader)?.trim() ?? "";

  if (!received || !safeEqual(received, expected)) {
    return NextResponse.json({ error: "Invalid beta key." }, { status: 401 });
  }

  return null;
}

function safeEqual(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

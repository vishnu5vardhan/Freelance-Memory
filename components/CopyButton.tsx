"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!value}
      className="focus-block rounded-md border-2 border-ink bg-white px-4 py-2 text-sm font-black text-ink transition hover:-translate-y-0.5 hover:bg-signal disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

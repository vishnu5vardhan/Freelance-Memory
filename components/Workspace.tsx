"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import {
  contextFields,
  emptyFreelancerContext,
  getContextScore,
  outputTypes,
  type FreelancerContext,
  type GeneratedResult,
  type Generation,
  type OutputType,
  type Usage
} from "@/lib/memory";
import {
  clearContext,
  clearDraft,
  clearHistory,
  clearWorkspaceMemory,
  loadContext,
  loadDraft,
  loadHistory,
  loadInstallId,
  saveContext,
  saveDraft,
  saveHistory
} from "@/lib/storage";

export function Workspace() {
  const [context, setContext] = useState<FreelancerContext>({ ...emptyFreelancerContext });
  const [inputText, setInputText] = useState("");
  const [installId, setInstallId] = useState("");
  const [userInstruction, setUserInstruction] = useState("");
  const [forcedIntent, setForcedIntent] = useState<OutputType>("auto");
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [history, setHistory] = useState<Generation[]>([]);
  const [status, setStatus] = useState<"idle" | "generating" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [pendingReset, setPendingReset] = useState<"business" | "conversation" | "all" | null>(null);

  useEffect(() => {
    setContext(loadContext());
    setInputText(loadDraft());
    setInstallId(loadInstallId());
    setHistory(loadHistory().filter((item) => "result" in item));
  }, []);

  const score = useMemo(() => getContextScore(context), [context]);
  const outputText = result?.reply ?? "";

  function updateContext(key: keyof FreelancerContext, value: string) {
    const next = { ...context, [key]: value };
    setContext(next);
    saveContext(next);
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 900);
  }

  function updateInput(value: string) {
    setInputText(value);
    saveDraft(value);
  }

  function resetBusinessMemory() {
    if (pendingReset !== "business") {
      setPendingReset("business");
      return;
    }

    setContext({ ...emptyFreelancerContext });
    clearContext();
    setPendingReset(null);
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 1200);
  }

  function resetConversationMemory() {
    if (pendingReset !== "conversation") {
      setPendingReset("conversation");
      return;
    }

    setInputText("");
    setResult(null);
    setUsage(null);
    setHistory([]);
    clearDraft();
    clearHistory();
    setPendingReset(null);
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 1200);
  }

  function resetAllLocalMemory() {
    if (pendingReset !== "all") {
      setPendingReset("all");
      return;
    }

    setContext({ ...emptyFreelancerContext });
    setInputText("");
    setResult(null);
    setUsage(null);
    setHistory([]);
    clearWorkspaceMemory();
    setPendingReset(null);
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 1200);
  }

  async function generate() {
    setStatus("generating");
    setError("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (installId) {
        headers["x-fm-install-id"] = installId;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          context,
          inputText,
          forcedIntent,
          userInstruction
        })
      });

      const data = (await response.json()) as {
        result?: GeneratedResult;
        usage?: Usage;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error ?? "Generation failed.");
      }

      const nextGeneration: Generation = {
        id: crypto.randomUUID(),
        forcedIntent,
        detectedIntent: data.result.detectedIntent,
        inputText,
        result: data.result,
        usage: data.usage,
        createdAt: new Date().toISOString()
      };
      const nextHistory = [nextGeneration, ...history].slice(0, 20);

      setResult(data.result);
      setUsage(data.usage ?? null);
      setHistory(nextHistory);
      saveHistory(nextHistory);
      setStatus("idle");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not generate. Try again.");
      setStatus("error");
    }
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 border-2 border-ink bg-white p-4 shadow-block sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-black uppercase text-blue-700">Local memory + LLM</p>
          <h1 className="mt-1 text-3xl font-black leading-none text-ink sm:text-4xl">
            Paste a client message. Let AI choose the reply.
          </h1>
        </div>
        <div className="min-w-52">
          <div className="flex items-end justify-between gap-4">
            <p className="text-sm font-black text-gray-600">Memory strength</p>
            <p className="text-2xl font-black text-ink">{score.percent}%</p>
          </div>
          <div className="mt-2 h-3 border-2 border-ink bg-paper">
            <div className="h-full bg-proof transition-all" style={{ width: `${score.percent}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-gray-600">
            {score.completed}/{score.total} key fields filled
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1fr_0.9fr]">
        <section className="border-2 border-ink bg-white shadow-block">
          <PanelHeader eyebrow="Step 1" title="Business memory" />
          <div className="grid max-h-[760px] gap-4 overflow-y-auto p-4">
            {contextFields.map((field) => {
              const isTextarea = field.rows || field.key !== "name";

              return (
                <label key={field.key} className="block">
                  <span className="text-sm font-black text-ink">{field.label}</span>
                  {isTextarea ? (
                    <textarea
                      value={context[field.key]}
                      onChange={(event) => updateContext(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      rows={field.rows ?? 2}
                      className="focus-block mt-2 w-full resize-y rounded-md border-2 border-ink bg-[#fffdf8] px-3 py-3 text-sm font-bold leading-6 text-ink placeholder:text-gray-400"
                    />
                  ) : (
                    <input
                      value={context[field.key]}
                      onChange={(event) => updateContext(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      className="focus-block mt-2 min-h-11 w-full rounded-md border-2 border-ink bg-[#fffdf8] px-3 py-2 text-sm font-bold text-ink placeholder:text-gray-400"
                    />
                  )}
                </label>
              );
            })}
            <p className="border-2 border-ink bg-paper px-3 py-3 text-xs font-bold leading-5 text-gray-700">
              Stored in this browser. Sent to the server only when you click generate. Your API key stays server-side.
            </p>
            <button
              type="button"
              onClick={resetBusinessMemory}
              className="focus-block rounded-md border-2 border-ink bg-paper px-4 py-2 text-sm font-black text-ink transition hover:-translate-y-0.5"
            >
              {pendingReset === "business" ? "Confirm reset business" : "Reset business memory"}
            </button>
          </div>
        </section>

        <section className="border-2 border-ink bg-white shadow-block">
          <PanelHeader eyebrow="Step 2" title="Client input" />
          <div className="p-4">
            <label className="block">
              <span className="text-sm font-black text-ink">Paste message, job post, or form question</span>
              <textarea
                value={inputText}
                onChange={(event) => updateInput(event.target.value)}
                placeholder="Hey, can you build our landing page? Need it fast. Budget?"
                rows={10}
                className="focus-block mt-2 min-h-72 w-full resize-y rounded-md border-2 border-ink bg-[#fffdf8] px-4 py-3 text-base font-bold leading-7 text-ink placeholder:text-gray-400"
              />
            </label>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-black text-ink">Reply mode</span>
                <select
                  value={forcedIntent}
                  onChange={(event) => setForcedIntent(event.target.value as OutputType)}
                  className="focus-block mt-2 min-h-12 w-full rounded-md border-2 border-ink bg-[#fffdf8] px-3 py-2 text-sm font-black text-ink"
                >
                  {outputTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-black text-ink">Extra instruction</span>
                <input
                  value={userInstruction}
                  onChange={(event) => setUserInstruction(event.target.value)}
                  placeholder="Make it firmer, shorter, warmer..."
                  className="focus-block mt-2 min-h-12 w-full rounded-md border-2 border-ink bg-[#fffdf8] px-3 py-2 text-sm font-bold text-ink placeholder:text-gray-400"
                />
              </label>
            </div>

            <div className="mt-4 border-2 border-ink bg-paper p-3 text-xs font-bold leading-5 text-gray-700">
              Auto is the default. Use override only when AI guesses the wrong situation.
            </div>

            {error ? <p className="mt-4 text-sm font-black text-red-700">{error}</p> : null}
            <button
              type="button"
              onClick={generate}
              disabled={!inputText.trim() || status === "generating"}
              className="focus-block mt-5 w-full rounded-md border-2 border-ink bg-ink px-5 py-3 text-base font-black text-white shadow-[5px_5px_0_#f5d547] transition hover:-translate-y-0.5 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "generating" ? "Thinking..." : "Generate reply"}
            </button>
            <p className="mt-3 text-xs font-bold text-gray-600">
              {status === "saved" ? "Memory saved locally." : "Needs OPENAI_API_KEY in .env.local for real generation."}
            </p>
          </div>
        </section>

        <section className="border-2 border-ink bg-white shadow-block">
          <PanelHeader eyebrow="Step 3" title="AI output" />
          <div className="p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge label={result ? result.detectedIntent.replaceAll("_", " ") : "waiting"} />
              <Badge label={result ? `${Math.round(result.confidence * 100)}% confidence` : "auto detect"} />
            </div>

            <div className="min-h-72 whitespace-pre-wrap border-2 border-ink bg-ink p-4 text-sm font-bold leading-6 text-white">
              {outputText || "Your generated reply will show up here."}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <CopyButton value={outputText} />
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setUsage(null);
                }}
                disabled={!result}
                className="focus-block rounded-md border-2 border-ink bg-paper px-4 py-2 text-sm font-black text-ink transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>

            {result ? (
              <div className="mt-5 grid gap-3">
                <Insight title="Next step" value={result.recommendedNextStep} />
                <Insight
                  title="Risk"
                  value={`${result.riskLevel ?? "none"}${result.riskReason ? `: ${result.riskReason}` : ""}`}
                />
                <Insight title="Missing info" value={result.missingInfo.length ? result.missingInfo.join(", ") : "Nothing obvious."} />
                <Insight
                  title="Scope assessment"
                  value={[
                    result.scopeAssessment?.acceptedScope?.length ? `Accepted: ${result.scopeAssessment.acceptedScope.join(", ")}` : "",
                    result.scopeAssessment?.proposedScope?.length ? `Proposed: ${result.scopeAssessment.proposedScope.join(", ")}` : "",
                    result.scopeAssessment?.outOfScopeItems?.length ? `Out of scope: ${result.scopeAssessment.outOfScopeItems.join(", ")}` : "",
                    result.scopeAssessment?.suggestedAction ? `Action: ${result.scopeAssessment.suggestedAction}` : ""
                  ]
                    .filter(Boolean)
                    .join("\n") || "No scope change detected."}
                />
                <Insight
                  title="Memory updates"
                  value={[
                    result.memoryUpdates?.projectFacts?.length ? `Project: ${result.memoryUpdates.projectFacts.join(", ")}` : "",
                    result.memoryUpdates?.scopeIncluded?.length ? `Included: ${result.memoryUpdates.scopeIncluded.join(", ")}` : "",
                    result.memoryUpdates?.scopeExcluded?.length ? `Excluded: ${result.memoryUpdates.scopeExcluded.join(", ")}` : "",
                    result.memoryUpdates?.risks?.length ? `Risks: ${result.memoryUpdates.risks.join(", ")}` : "",
                    result.memoryUpdates?.needsConfirmation?.length ? `Confirm: ${result.memoryUpdates.needsConfirmation.join(", ")}` : "",
                    result.memoryUpdates?.contradictions?.length ? `Contradictions: ${result.memoryUpdates.contradictions.join(", ")}` : ""
                  ]
                    .filter(Boolean)
                    .join("\n") || "No updates."}
                />
                <Insight title="Context used by AI" value={result.contextUsed.length ? result.contextUsed.join(", ") : "No context reported."} />
                <Insight
                  title="Context sent to model"
                  value={usage?.compactedFields.length ? usage.compactedFields.join(", ") : "No usage data."}
                />
                <Insight
                  title="Token usage"
                  value={
                    usage
                      ? `${usage.totalTokens} total = ${usage.inputTokens} input + ${usage.outputTokens} output. Prompt size: ${usage.promptChars} chars.`
                      : "No usage data."
                  }
                />
                <Insight title="Why this works" value={result.notes} />
              </div>
            ) : null}

            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-black uppercase text-gray-600">History</h2>
                <button
                  type="button"
                  onClick={resetConversationMemory}
                  disabled={!inputText && !result && history.length === 0}
                  className="focus-block rounded-md border-2 border-ink bg-paper px-3 py-1.5 text-xs font-black text-ink transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingReset === "conversation" ? "Confirm reset conversation" : "Reset conversation"}
                </button>
              </div>
              <div className="mt-3 grid max-h-80 gap-3 overflow-y-auto">
                {history.length ? (
                  history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setResult(item.result);
                        setUsage(item.usage ?? null);
                        setInputText(item.inputText);
                        setForcedIntent(item.forcedIntent);
                      }}
                      className="focus-block border border-ink/15 bg-paper p-3 text-left transition hover:border-ink"
                    >
                      <span className="text-xs font-black uppercase text-blue-700">
                        {item.detectedIntent.replaceAll("_", " ")}
                      </span>
                      <span className="mt-2 line-clamp-3 block text-sm font-bold leading-6 text-gray-700">
                        {item.result.reply}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="border border-ink/15 bg-paper p-3 text-sm font-bold leading-6 text-gray-600">
                    Generate once and useful replies will stay here in this browser.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={resetAllLocalMemory}
              disabled={score.completed === 0 && !inputText && !result && history.length === 0}
              className="focus-block mt-5 w-full rounded-md border-2 border-red-900 bg-red-50 px-4 py-2 text-sm font-black text-red-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingReset === "all" ? "Confirm reset all" : "Reset all local memory"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function PanelHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="border-b-2 border-ink bg-[#f3f0ea] px-4 py-3">
      <p className="text-xs font-black uppercase text-blue-700">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-ink">{title}</h2>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-md border-2 border-ink bg-signal px-2.5 py-1 text-xs font-black capitalize text-ink">
      {label}
    </span>
  );
}

function Insight({ title, value }: { title: string; value: string }) {
  return (
    <div className="border border-ink/15 bg-paper p-3">
      <p className="text-xs font-black uppercase text-gray-600">{title}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-ink">{value}</p>
    </div>
  );
}

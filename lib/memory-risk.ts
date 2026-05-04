import type { ContextPacket, GenerateRequest, GeneratedResult } from "@/lib/memory";

const scopeTriggerPhrases = [
  "also",
  "quick",
  "small change",
  "while you're at it",
  "while you're there",
  "can you add",
  "could you add",
  "just",
  "should be easy",
  "one more thing",
  "bonus",
  "extra",
  "in addition"
];

const workWords = [
  "add",
  "analytics",
  "animation",
  "audit",
  "blog",
  "brand",
  "build",
  "cart",
  "checkout",
  "cms",
  "copy",
  "dashboard",
  "design",
  "develop",
  "feature",
  "figma",
  "fix",
  "homepage",
  "integration",
  "launch",
  "logo",
  "migration",
  "mobile",
  "page",
  "pricing",
  "redesign",
  "revision",
  "rewrite",
  "seo",
  "setup",
  "shopify",
  "template",
  "webflow"
];

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "can",
  "could",
  "for",
  "from",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "our",
  "please",
  "since",
  "that",
  "the",
  "this",
  "to",
  "we",
  "you",
  "your"
]);

export type MemoryRiskContext = {
  latestAsk: string;
  triggerPhrases: string[];
  requestedWorkItems: string[];
  matchedIncludedScope: string[];
  matchedExcludedScope: string[];
  possibleOutOfScopeItems: string[];
  contradictions: string[];
  riskLevelHint: "none" | "low" | "medium" | "high";
  riskReasonHint: string;
  suggestedActionHint: string;
};

export function buildMemoryRiskContext(requestOrPacket: GenerateRequest | ContextPacket): MemoryRiskContext {
  const packet: ContextPacket | null =
    "inputText" in requestOrPacket ? requestOrPacket.contextPacket ?? null : requestOrPacket;
  const pageContext =
    packet?.pageContext ?? ("pageContext" in requestOrPacket ? requestOrPacket.pageContext ?? null : null);
  const projectMemory = packet?.projectMemory ?? null;
  const businessMemory = packet?.businessMemory ?? ("context" in requestOrPacket ? requestOrPacket.context : null);
  const latestAsk = getLatestAsk(requestOrPacket);
  const triggerPhrases = findTriggerPhrases(latestAsk);
  const requestedWorkItems = extractRequestedWorkItems(latestAsk);
  const includedScope = projectMemory?.includedScope ?? [];
  const excludedScope = projectMemory?.excludedScope ?? [];
  const matchedIncludedScope = requestedWorkItems.filter((item) => scopeListCoversItem(includedScope, item));
  const matchedExcludedScope = requestedWorkItems.filter((item) => scopeListCoversItem(excludedScope, item));
  const possibleOutOfScopeItems = requestedWorkItems.filter((item) => !scopeListCoversItem(includedScope, item));
  const contradictions = findContradictions({
    latestAsk,
    budget: projectMemory?.budget ?? "",
    timeline: projectMemory?.timeline ?? "",
    paymentTerms: projectMemory?.paymentTerms ?? "",
    boundaries: businessMemory?.boundaries ?? ""
  });
  const riskLevelHint = getRiskLevelHint({
    triggerPhrases,
    possibleOutOfScopeItems,
    matchedExcludedScope,
    contradictions,
    hasStoredScope: includedScope.length > 0 || excludedScope.length > 0
  });
  const riskReasonHint = getRiskReasonHint({
    riskLevelHint,
    possibleOutOfScopeItems,
    matchedExcludedScope,
    contradictions,
    triggerPhrases,
    hasStoredScope: includedScope.length > 0 || excludedScope.length > 0
  });
  const hasStoredScope = includedScope.length > 0 || excludedScope.length > 0;
  const suggestedActionHint = getSuggestedActionHint(riskLevelHint, possibleOutOfScopeItems, contradictions, hasStoredScope);

  return {
    latestAsk: latestAsk || pageContext?.latestClientMessage || "",
    triggerPhrases,
    requestedWorkItems,
    matchedIncludedScope,
    matchedExcludedScope,
    possibleOutOfScopeItems,
    contradictions,
    riskLevelHint,
    riskReasonHint,
    suggestedActionHint
  };
}

export function formatMemoryRiskContext(context: MemoryRiskContext) {
  return [
    "Deterministic scope/risk hints (use as guardrails, not as invented facts):",
    context.triggerPhrases.length ? `triggerPhrases: ${context.triggerPhrases.join(", ")}` : "triggerPhrases: none",
    context.requestedWorkItems.length ? `requestedWorkItems: ${context.requestedWorkItems.join(" | ")}` : "requestedWorkItems: none detected",
    context.matchedIncludedScope.length
      ? `matchedIncludedScope: ${context.matchedIncludedScope.join(" | ")}`
      : "matchedIncludedScope: none",
    context.matchedExcludedScope.length
      ? `matchedExcludedScope: ${context.matchedExcludedScope.join(" | ")}`
      : "matchedExcludedScope: none",
    context.possibleOutOfScopeItems.length
      ? `possibleOutOfScopeItems: ${context.possibleOutOfScopeItems.join(" | ")}`
      : "possibleOutOfScopeItems: none",
    context.contradictions.length ? `contradictions: ${context.contradictions.join(" | ")}` : "contradictions: none",
    `riskLevelHint: ${context.riskLevelHint}`,
    context.riskReasonHint ? `riskReasonHint: ${context.riskReasonHint}` : "riskReasonHint: none",
    context.suggestedActionHint ? `suggestedActionHint: ${context.suggestedActionHint}` : "suggestedActionHint: none"
  ].join("\n");
}

export function applyRiskSafeguards(result: GeneratedResult, request: GenerateRequest): GeneratedResult {
  const hints = buildMemoryRiskContext(request);

  if (hints.riskLevelHint === "none") {
    return {
      ...result,
      scopeAssessment: mergeScopeAssessment(result, hints)
    };
  }

  const shouldUpgradeRisk = riskRank(hints.riskLevelHint) > riskRank(result.riskLevel);
  const riskReason = shouldUpgradeRisk && hints.riskReasonHint ? hints.riskReasonHint : result.riskReason;
  const suggestedAction =
    result.scopeAssessment?.suggestedAction || hints.suggestedActionHint || result.recommendedNextStep;

  return {
    ...result,
    detectedIntent: shouldUpgradeRisk && hints.possibleOutOfScopeItems.length ? "scope_creep" : result.detectedIntent,
    riskLevel: shouldUpgradeRisk ? hints.riskLevelHint : result.riskLevel,
    riskReason,
    recommendedNextStep: result.recommendedNextStep || hints.suggestedActionHint,
    memoryUpdates: {
      ...result.memoryUpdates,
      risks: mergeLists(
        result.memoryUpdates.risks,
        riskReason ? [`${shouldUpgradeRisk ? hints.riskLevelHint : result.riskLevel}: ${riskReason}`] : []
      ),
      needsConfirmation: mergeLists(result.memoryUpdates.needsConfirmation, [
        ...hints.possibleOutOfScopeItems.map((item) => `Confirm whether "${item}" is included, an add-on, or a scope swap.`),
        ...hints.contradictions
      ]),
      contradictions: mergeLists(result.memoryUpdates.contradictions, hints.contradictions)
    },
    scopeAssessment: {
      ...mergeScopeAssessment(result, hints),
      suggestedAction
    }
  };
}

function getLatestAsk(requestOrPacket: GenerateRequest | ContextPacket) {
  if ("inputText" in requestOrPacket && requestOrPacket.inputText.trim()) {
    return requestOrPacket.inputText.trim();
  }

  const pageContext =
    "inputText" in requestOrPacket
      ? requestOrPacket.contextPacket?.pageContext ?? requestOrPacket.pageContext ?? null
      : requestOrPacket.pageContext;

  return (
    pageContext?.latestClientMessage ||
    pageContext?.selectedText ||
    pageContext?.activeEditableText ||
    pageContext?.recentMessages
      .slice()
      .reverse()
      .find((message) => message.author !== "freelancer")?.text ||
    ""
  ).trim();
}

function findTriggerPhrases(text: string) {
  const lower = text.toLowerCase();

  return scopeTriggerPhrases.filter((phrase) => lower.includes(phrase));
}

function extractRequestedWorkItems(text: string) {
  const cleaned = text
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(should be quick|should be easy|since you are already working on it|since you're already working on it)\b/gi, " ");
  const roughParts = cleaned
    .split(/[.!?\n]/)
    .flatMap((sentence) => sentence.split(/,|;| & |\band\b|\bplus\b|\balso\b|\bin addition\b/gi))
    .map(cleanWorkItem)
    .filter(Boolean);

  const candidates = roughParts.filter((part) => {
    const lower = part.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);

    return words.length >= 2 && words.length <= 12 && workWords.some((word) => lower.includes(word));
  });

  return mergeLists([], candidates).slice(0, 12);
}

function cleanWorkItem(value: string) {
  return value
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .replace(
      /^(hey|hi|hello|please|can you|could you|would you|we need|we want|i need|i want|need|want|add|include|make|build|create|also add|just add|one more thing|while you're at it|while you're there|to)\s+/i,
      ""
    )
    .replace(/\s+(please|too|as well)$/i, "")
    .trim();
}

function scopeListCoversItem(scopeItems: string[], item: string) {
  return scopeItems.some((scopeItem) => itemsOverlap(scopeItem, item));
}

function itemsOverlap(scopeItem: string, item: string) {
  const scopeNormalized = normalizeComparableText(scopeItem);
  const itemNormalized = normalizeComparableText(item);

  if (!scopeNormalized || !itemNormalized) {
    return false;
  }

  if (scopeNormalized.includes(itemNormalized) || itemNormalized.includes(scopeNormalized)) {
    return true;
  }

  const scopeTokens = tokenizeComparableText(scopeNormalized);
  const itemTokens = tokenizeComparableText(itemNormalized);
  const overlap = itemTokens.filter((token) => scopeTokens.includes(token)).length;
  const ratio = overlap / Math.max(itemTokens.length, 1);

  return ratio >= 0.72;
}

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9$ ]+/g, " ")
    .replace(/\b(pages|page)\b/g, "page")
    .replace(/\b(templates|template)\b/g, "template")
    .replace(/\b(revisions|revision)\b/g, "revision")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeComparableText(value: string) {
  return normalizeComparableText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function findContradictions({
  latestAsk,
  budget,
  timeline,
  paymentTerms,
  boundaries
}: {
  latestAsk: string;
  budget: string;
  timeline: string;
  paymentTerms: string;
  boundaries: string;
}) {
  const contradictions: string[] = [];
  const latestBudget = extractBudgetPhrase(latestAsk);
  const latestTimeline = extractTimelinePhrase(latestAsk);
  const lower = latestAsk.toLowerCase();

  if (budget && latestBudget && !roughlySameText(budget, latestBudget)) {
    contradictions.push(`Saved budget is "${budget}", but latest message says "${latestBudget}".`);
  }

  if (timeline && latestTimeline && !roughlySameText(timeline, latestTimeline)) {
    contradictions.push(`Saved timeline is "${timeline}", but latest message says "${latestTimeline}".`);
  }

  if (paymentTerms && /\b(after launch|after delivery|when it is done|once it's done|no upfront|without deposit)\b/.test(lower)) {
    contradictions.push(`Saved payment terms are "${paymentTerms}", but latest message suggests delayed or no upfront payment.`);
  }

  if (boundaries && /\b(free|unpaid|quick audit|unlimited revisions|should be quick|should be easy)\b/.test(lower)) {
    contradictions.push(`Latest message may conflict with freelancer boundaries: "${boundaries}".`);
  }

  return contradictions;
}

function extractBudgetPhrase(text: string) {
  const match =
    text.match(/(?:budget\s*(?:is|:)?\s*)?(?:\$|usd\s?|eur\s?|gbp\s?|inr\s?)\s?\d[\d,]*(?:\.\d+)?(?:\s?-\s?(?:\$|usd\s?|eur\s?|gbp\s?|inr\s?)?\s?\d[\d,]*(?:\.\d+)?)?/i) ||
    text.match(/\b\d[\d,]*\s?(?:usd|eur|gbp|inr|dollars?)\b/i);

  return match?.[0]?.trim() ?? "";
}

function extractTimelinePhrase(text: string) {
  const match = text.match(
    /\b(today|tomorrow|this week|next week|next month|by\s+[a-z]+\s+\d{1,2}|by\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in\s+\d+\s?(?:days?|weeks?|months?)|\d+\s?(?:days?|weeks?|months?))\b/i
  );

  return match?.[0]?.trim() ?? "";
}

function roughlySameText(a: string, b: string) {
  const left = normalizeComparableText(a);
  const right = normalizeComparableText(b);

  return left.includes(right) || right.includes(left);
}

function getRiskLevelHint({
  triggerPhrases,
  possibleOutOfScopeItems,
  matchedExcludedScope,
  contradictions,
  hasStoredScope
}: {
  triggerPhrases: string[];
  possibleOutOfScopeItems: string[];
  matchedExcludedScope: string[];
  contradictions: string[];
  hasStoredScope: boolean;
}) {
  if (contradictions.length || matchedExcludedScope.length) {
    return "high";
  }

  if (hasStoredScope && possibleOutOfScopeItems.length) {
    return possibleOutOfScopeItems.length > 1 || triggerPhrases.length ? "medium" : "low";
  }

  if (!hasStoredScope && possibleOutOfScopeItems.length >= 4) {
    return "medium";
  }

  if (!hasStoredScope && triggerPhrases.length && possibleOutOfScopeItems.length > 1) {
    return "medium";
  }

  if (triggerPhrases.length && possibleOutOfScopeItems.length) {
    return "low";
  }

  return "none";
}

function getRiskReasonHint({
  riskLevelHint,
  possibleOutOfScopeItems,
  matchedExcludedScope,
  contradictions,
  triggerPhrases,
  hasStoredScope
}: {
  riskLevelHint: "none" | "low" | "medium" | "high";
  possibleOutOfScopeItems: string[];
  matchedExcludedScope: string[];
  contradictions: string[];
  triggerPhrases: string[];
  hasStoredScope: boolean;
}) {
  if (riskLevelHint === "none") {
    return "";
  }

  if (contradictions.length) {
    return contradictions[0];
  }

  if (matchedExcludedScope.length) {
    return `"${matchedExcludedScope[0]}" appears to match excluded scope.`;
  }

  if (possibleOutOfScopeItems.length && hasStoredScope) {
    return `Latest ask includes possible out-of-scope work: ${possibleOutOfScopeItems.join(", ")}.`;
  }

  if (possibleOutOfScopeItems.length && triggerPhrases.length) {
    return `Latest ask uses scope-creep language (${triggerPhrases.join(", ")}) around: ${possibleOutOfScopeItems.join(", ")}.`;
  }

  return "Latest ask needs scope confirmation before accepting.";
}

function getSuggestedActionHint(
  riskLevelHint: "none" | "low" | "medium" | "high",
  possibleOutOfScopeItems: string[],
  contradictions: string[],
  hasStoredScope: boolean
) {
  if (riskLevelHint === "none") {
    return "";
  }

  if (contradictions.length) {
    return "Ask the client to confirm which version is current before updating memory or committing.";
  }

  if (possibleOutOfScopeItems.length && hasStoredScope) {
    return `Treat ${possibleOutOfScopeItems.join(", ")} as add-on work or offer a scope swap.`;
  }

  if (possibleOutOfScopeItems.length) {
    return "Turn the request into a smaller confirmed scope before quoting or accepting.";
  }

  return "Confirm scope before accepting the request.";
}

function mergeScopeAssessment(result: GeneratedResult, hints: MemoryRiskContext) {
  return {
    acceptedScope: result.scopeAssessment?.acceptedScope ?? [],
    proposedScope: mergeLists(result.scopeAssessment?.proposedScope ?? [], hints.possibleOutOfScopeItems),
    outOfScopeItems: mergeLists(result.scopeAssessment?.outOfScopeItems ?? [], hints.possibleOutOfScopeItems),
    matchedExistingScope: mergeLists(result.scopeAssessment?.matchedExistingScope ?? [], hints.matchedIncludedScope),
    triggerPhrases: mergeLists(result.scopeAssessment?.triggerPhrases ?? [], hints.triggerPhrases),
    needsConfirmation: mergeLists(result.scopeAssessment?.needsConfirmation ?? [], [
      ...hints.possibleOutOfScopeItems.map((item) => `Confirm scope status for "${item}".`),
      ...hints.contradictions
    ]),
    contradictions: mergeLists(result.scopeAssessment?.contradictions ?? [], hints.contradictions),
    suggestedAction: result.scopeAssessment?.suggestedAction || hints.suggestedActionHint
  };
}

function riskRank(level: "none" | "low" | "medium" | "high") {
  return { none: 0, low: 1, medium: 2, high: 3 }[level];
}

function mergeLists(left: string[], right: string[]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of [...left, ...right]) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(normalized);
  }

  return merged;
}

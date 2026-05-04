import { emptyFreelancerContext, type FreelancerContext, type Generation } from "@/lib/memory";

const contextKey = "freelancer_memory_context";
const historyKey = "freelancer_memory_history";
const draftKey = "freelancer_memory_draft";
const betaKey = "freelancer_memory_beta_key";
const installIdKey = "freelancer_memory_install_id";

export function loadContext(): FreelancerContext {
  if (typeof window === "undefined") {
    return emptyFreelancerContext;
  }

  try {
    const raw = window.localStorage.getItem(contextKey);
    return raw ? { ...emptyFreelancerContext, ...JSON.parse(raw) } : emptyFreelancerContext;
  } catch {
    return emptyFreelancerContext;
  }
}

export function saveContext(context: FreelancerContext) {
  window.localStorage.setItem(contextKey, JSON.stringify(context));
}

export function loadHistory(): Generation[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(historyKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: Generation[]) {
  window.localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 20)));
}

export function loadDraft() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(draftKey) ?? "";
}

export function saveDraft(value: string) {
  window.localStorage.setItem(draftKey, value);
}

export function loadBetaKey() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(betaKey) ?? "";
}

export function saveBetaKey(value: string) {
  window.localStorage.setItem(betaKey, value);
}

export function loadInstallId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(installIdKey);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(installIdKey, next);
  return next;
}

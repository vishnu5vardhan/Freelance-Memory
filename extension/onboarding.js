const storageKeys = {
  context: "freelancer_memory_extension_context",
  diagnostics: "freelancer_memory_extension_diagnostics",
  installedAt: "freelancer_memory_extension_installed_at",
  installId: "freelancer_memory_extension_install_id",
  onboardingCompleted: "freelancer_memory_extension_onboarding_completed",
  onboardingCompletedAt: "freelancer_memory_extension_onboarding_completed_at"
};

const contextFieldKeys = ["role", "services", "pricing", "proof", "paymentTerms", "boundaries", "voice"];
const diagnosticsLimit = 50;

const elements = {};
let existingContext = {};
let cachedInstallId = "";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  await loadExistingMemory();
  trackEvent("onboarding_started", { source: "onboarding_page" });
}

async function trackEvent(name, payload = {}) {
  try {
    if (!name) {
      return;
    }

    const safePayload = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value === null || value === undefined) {
        continue;
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        safePayload[key] = value;
      }
    }

    const event = {
      name,
      createdAt: new Date().toISOString(),
      installId: cachedInstallId || "",
      ...safePayload
    };

    const stored = await chrome.storage.local.get(storageKeys.diagnostics);
    const list = Array.isArray(stored[storageKeys.diagnostics]) ? stored[storageKeys.diagnostics] : [];
    list.push(event);

    while (list.length > diagnosticsLimit) {
      list.shift();
    }

    await chrome.storage.local.set({ [storageKeys.diagnostics]: list });
  } catch (storageError) {
    console.warn("[FM] onboarding trackEvent failed:", storageError?.message || storageError);
  }
}

function cacheElements() {
  elements.form = document.querySelector("#memoryForm");
  elements.saveButton = document.querySelector("#saveButton");
  elements.statusText = document.querySelector("#statusText");
  elements.nextSteps = document.querySelector("#nextSteps");
  elements.openGmailButton = document.querySelector("#openGmailButton");
  elements.fields = Array.from(document.querySelectorAll("[data-field]"));
}

function bindEvents() {
  elements.form.addEventListener("submit", saveMemory);
  elements.openGmailButton.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://mail.google.com/" });
  });
}

async function loadExistingMemory() {
  const stored = await chrome.storage.local.get([
    storageKeys.context,
    storageKeys.installedAt,
    storageKeys.installId,
    storageKeys.onboardingCompleted
  ]);

  existingContext = stored[storageKeys.context] || {};
  cachedInstallId = stored[storageKeys.installId] || "";

  for (const field of elements.fields) {
    const key = field.dataset.field;
    field.value = existingContext[key] || "";
  }

  if (!stored[storageKeys.installedAt]) {
    await chrome.storage.local.set({
      [storageKeys.installedAt]: new Date().toISOString()
    });
  }

  if (stored[storageKeys.onboardingCompleted]) {
    showNextSteps("Memory already saved. Open a client message and generate your first reply.");
  }
}

async function saveMemory(event) {
  event.preventDefault();
  elements.saveButton.disabled = true;
  setStatus("Saving memory...", false);

  try {
    const stored = await chrome.storage.local.get([storageKeys.context, storageKeys.installedAt]);
    const currentContext = stored[storageKeys.context] || existingContext || {};
    const nextContext = { ...currentContext };

    for (const key of contextFieldKeys) {
      const field = document.querySelector(`[data-field="${key}"]`);
      nextContext[key] = field?.value.trim() || "";
    }

    const now = new Date().toISOString();
    const updates = {
      [storageKeys.context]: nextContext,
      [storageKeys.onboardingCompleted]: true,
      [storageKeys.onboardingCompletedAt]: now
    };

    if (!stored[storageKeys.installedAt]) {
      updates[storageKeys.installedAt] = now;
    }

    await chrome.storage.local.set(updates);
    existingContext = nextContext;
    showNextSteps("Memory saved. Open a client message and generate your first reply.");

    const filledCount = contextFieldKeys.filter((key) => (nextContext[key] || "").trim().length > 0).length;
    trackEvent("onboarding_completed", { filledCount, totalFields: contextFieldKeys.length });
  } catch (error) {
    console.warn("[FM] saveMemory failed:", error?.message || error);
    setStatus("Couldn’t save memory. Restart Chrome and try again.", true);
    trackEvent("onboarding_completed", { status: "error", errorCategory: "storage_failed" });
  } finally {
    elements.saveButton.disabled = false;
  }
}

function showNextSteps(message) {
  setStatus(message, false, true);
  elements.nextSteps.hidden = false;
  elements.nextSteps.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setStatus(message, isError, isSuccess = false) {
  elements.statusText.textContent = message;
  elements.statusText.classList.toggle("error", Boolean(isError));
  elements.statusText.classList.toggle("success", Boolean(isSuccess));
}

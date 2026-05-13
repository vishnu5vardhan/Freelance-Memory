const storageKeys = {
  installedAt: "freelancer_memory_extension_installed_at"
};

chrome.runtime.onInstalled.addListener((details) => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  if (details.reason !== "install") {
    return;
  }

  chrome.storage.local.set({
    [storageKeys.installedAt]: new Date().toISOString()
  });

  chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "freelancer-memory:generate-reply") {
    requestGeneration(message.endpoint, message.payload, message.installId, message.openaiKey)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: readableError(error) }));

    return true;
  }

  if (message?.type !== "freelancer-memory:open-side-panel") {
    return false;
  }

  const tabId = sender.tab?.id;

  if (!tabId) {
    sendResponse({ ok: false, error: "No active tab found." });
    return;
  }

  if (message.pageContext) {
    chrome.storage.local.set({
      freelancer_memory_extension_page_context: {
        ...message.pageContext,
        tabId
      }
    });
  }

  chrome.sidePanel
    .open({ tabId })
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error?.message || "Could not open side panel." }));

  return true;
});

const backgroundRequestTimeoutMs = 45000;

async function requestGeneration(endpoint, payload, installId, openaiKey) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (openaiKey && openaiKey.startsWith("sk-")) {
    headers["x-fm-openai-key"] = openaiKey;
  }

  if (installId) {
    headers["x-fm-install-id"] = installId;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), backgroundRequestTimeoutMs);

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timeout. The reply service did not respond in time.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.result) {
    throw new Error(data.error || data.detail || "Generation failed.");
  }

  return data;
}

function readableError(error) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("timeout") || lowerMessage.includes("aborted")) {
    return "The reply took too long. Check your connection and try again.";
  }

  if (lowerMessage.includes("failed to fetch") || lowerMessage.includes("network") || lowerMessage.includes("service unavailable")) {
    return "Couldn’t reach the reply service. Check your connection and try again.";
  }

  if (lowerMessage.includes("unauthorized") || lowerMessage.includes("forbidden")) {
    return "The API rejected this request. Check the API settings.";
  }

  if (lowerMessage.includes("generation failed") || lowerMessage.includes("internal server error")) {
    return "Couldn’t generate a reply. Check your connection and try again.";
  }

  return message;
}

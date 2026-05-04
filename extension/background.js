chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "freelancer-memory:generate-reply") {
    requestGenerationWithLocalFallback(message.endpoint, message.payload, message.betaKey, message.installId)
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

async function requestGenerationWithLocalFallback(endpoint, payload, betaKey, installId) {
  try {
    return await requestGeneration(endpoint, payload, betaKey, installId);
  } catch (error) {
    const fallbackEndpoint = getLocalFallbackEndpoint(endpoint);

    if (!fallbackEndpoint) {
      throw error;
    }

    return requestGeneration(fallbackEndpoint, payload, betaKey, installId);
  }
}

async function requestGeneration(endpoint, payload, betaKey, installId) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (betaKey) {
    headers["x-fm-beta-key"] = betaKey;
  }

  if (installId) {
    headers["x-fm-install-id"] = installId;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.result) {
    throw new Error(data.error || data.detail || "Generation failed.");
  }

  return data;
}

function getLocalFallbackEndpoint(endpoint) {
  if (endpoint === "http://localhost:3000/api/generate") {
    return "http://localhost:3001/api/generate";
  }

  if (endpoint === "http://127.0.0.1:3000/api/generate") {
    return "http://127.0.0.1:3001/api/generate";
  }

  return "";
}

function readableError(error) {
  const message = error instanceof Error ? error.message : "Something went wrong.";

  if (message.includes("Failed to fetch")) {
    return "Could not reach API from extension background. Start Next locally and check the endpoint.";
  }

  return message;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "freelancer-memory:generate-reply") {
    requestGeneration(message.endpoint, message.payload, message.betaKey, message.installId)
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

function readableError(error) {
  const message = error instanceof Error ? error.message : "Something went wrong.";

  if (message.includes("Failed to fetch")) {
    return "Could not reach the Freelancer Memory API. Check the endpoint and try again.";
  }

  return message;
}

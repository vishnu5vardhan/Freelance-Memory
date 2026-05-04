const selectionStorageKey = "freelancer_memory_extension_last_selection";
const pageContextStorageKey = "freelancer_memory_extension_page_context";
const contextStorageKey = "freelancer_memory_extension_context";
const betaKeyStorageKey = "freelancer_memory_extension_beta_key";
const endpointStorageKey = "freelancer_memory_extension_api_endpoint";
const installIdStorageKey = "freelancer_memory_extension_install_id";
const forcedIntentStorageKey = "freelancer_memory_extension_forced_intent";
const instructionStorageKey = "freelancer_memory_extension_instruction";
const lastResultStorageKey = "freelancer_memory_extension_last_result";
const socialsStorageKey = "freelancer_memory_extension_socials";
const projectsStorageKey = "freelancer_memory_projects";
const defaultApiEndpoint = "https://freelancer-memory.vercel.app/api/generate";
const buttonId = "freelancer-memory-generic-button";
const inlinePanelId = "freelancer-memory-inline-panel";
const styleId = "freelancer-memory-generic-style";

let lastSavedSelection = "";
let saveTimer = 0;
let scanTimer = 0;
let activeReplyBox = null;
let activeSocialField = null;
let activeSocialMatch = null;
let fmButton = null;
let inlinePanel = null;
let lastInlinePageContext = null;
let buttonMode = "reply";

const gmailAdapter = {
  id: "gmail",
  label: "Gmail",
  matches(pageLocation) {
    return pageLocation.hostname === "mail.google.com";
  },
  findReplyBox: findGmailReplyBox,
  extractConversation: extractGmailConversation,
  insertReply(text) {
    return insertReplyInto(text, this.findReplyBox());
  },
  injectButton
};

const xAdapter = {
  id: "x",
  label: "X / Twitter",
  matches(pageLocation) {
    return ["x.com", "twitter.com", "mobile.twitter.com"].includes(pageLocation.hostname);
  },
  findReplyBox: findXReplyBox,
  extractConversation: extractXConversation,
  insertReply(text) {
    return insertReplyInto(text, this.findReplyBox());
  },
  injectButton
};

const linkedinAdapter = {
  id: "linkedin",
  label: "LinkedIn",
  matches(pageLocation) {
    return pageLocation.hostname === "linkedin.com" || pageLocation.hostname.endsWith(".linkedin.com");
  },
  findReplyBox: findLinkedInReplyBox,
  extractConversation: extractLinkedInConversation,
  insertReply(text) {
    return insertReplyInto(text, this.findReplyBox());
  },
  injectButton
};

const upworkAdapter = {
  id: "upwork",
  label: "Upwork",
  matches(pageLocation) {
    return pageLocation.hostname === "upwork.com" || pageLocation.hostname.endsWith(".upwork.com");
  },
  findReplyBox: findUpworkReplyBox,
  extractConversation: extractUpworkConversation,
  insertReply(text) {
    return insertReplyInto(text, this.findReplyBox());
  },
  injectButton
};

const fiverrAdapter = {
  id: "fiverr",
  label: "Fiverr",
  matches(pageLocation) {
    return pageLocation.hostname === "fiverr.com" || pageLocation.hostname.endsWith(".fiverr.com");
  },
  findReplyBox: findFiverrReplyBox,
  extractConversation: extractFiverrConversation,
  insertReply(text) {
    return insertReplyInto(text, this.findReplyBox());
  },
  injectButton
};

const whatsappAdapter = {
  id: "whatsapp",
  label: "WhatsApp Web",
  matches(pageLocation) {
    return pageLocation.hostname === "web.whatsapp.com";
  },
  findReplyBox: findWhatsAppReplyBox,
  extractConversation: extractWhatsAppConversation,
  insertReply(text) {
    return insertReplyInto(text, this.findReplyBox());
  },
  injectButton
};

const genericAdapter = {
  id: "generic",
  label: "Generic",
  matches(pageLocation) {
    return pageLocation.protocol === "http:" || pageLocation.protocol === "https:";
  },
  findReplyBox: findGenericReplyBox,
  extractConversation: extractGenericConversation,
  insertReply(text) {
    return insertReplyInto(text, this.findReplyBox());
  },
  injectButton
};

const adapters = [gmailAdapter, xAdapter, linkedinAdapter, upworkAdapter, fiverrAdapter, whatsappAdapter, genericAdapter];

if (isSupportedPage()) {
  document.addEventListener("selectionchange", scheduleSelectionSave, true);
  document.addEventListener("mouseup", scheduleSelectionSave, true);
  document.addEventListener("keyup", scheduleSelectionSave, true);
  document.addEventListener("focusin", handlePossibleReplyFocus, true);
  document.addEventListener("input", handlePossibleReplyFocus, true);
  window.addEventListener("scroll", scheduleReplyBoxScan, true);
  window.addEventListener("resize", scheduleReplyBoxScan, true);

  getActiveAdapter().injectButton(handleFmClick);
  scheduleReplyBoxScan();

  const observer = new MutationObserver(scheduleReplyBoxScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const adapter = getActiveAdapter();

  if (message?.type === "freelancer-memory:get-selection") {
    const selection = readSelection();

    if (selection.text) {
      saveSelection(selection);
    }

    sendResponse(selection);
    return;
  }

  if (message?.type === "freelancer-memory:get-page-context") {
    const context = adapter.extractConversation();
    savePageContext(context);
    sendResponse(context);
    return;
  }

  if (message?.type === "freelancer-memory:insert-reply") {
    sendResponse(adapter.insertReply(message.text || ""));
  }
});

function isSupportedPage() {
  return location.protocol === "http:" || location.protocol === "https:";
}

function getActiveAdapter() {
  return adapters.find((adapter) => adapter.matches(location)) || genericAdapter;
}

function scheduleSelectionSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const selection = readSelection();

    scheduleReplyBoxScan();

    if (!selection.text || selection.text === lastSavedSelection) {
      return;
    }

    saveSelection(selection);
  }, 120);
}

function scheduleReplyBoxScan() {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(updateButtonPosition, 120);
}

function handlePossibleReplyFocus(event) {
  if (isVisibleEditable(event.target)) {
    activeReplyBox = event.target;
  }

  scheduleReplyBoxScan();
}

async function handleFmClick() {
  if (buttonMode === "social") {
    await handleSocialFill();
    return;
  }

  if (getActiveAdapter().id === "gmail" && buttonMode === "reply") {
    const handled = await showGmailSavedReplyInsert();

    if (handled) {
      return;
    }
  }

  const context = getActiveAdapter().extractConversation();
  await savePageContext(context);

  if (buttonMode === "selection" && context.selectedText) {
    await generateInlineReply(context);
    return;
  }

  chrome.runtime.sendMessage({
    type: "freelancer-memory:open-side-panel",
    pageContext: context
  });
}

function readSelection() {
  const text = getSelectedText();

  return {
    text: text.slice(0, 10000),
    title: document.title,
    url: location.href,
    savedAt: Date.now()
  };
}

function extractGenericConversation() {
  return buildConversationContext(genericAdapter, {});
}

function extractGmailConversation() {
  const messages = Array.from(document.querySelectorAll(".a3s"))
    .filter(isVisibleElement)
    .map((body) => {
      const wrapper = body.closest(".adn, .gs");
      const senderNode = wrapper?.querySelector(".gD, .go, .qu");
      const sender = senderNode?.textContent?.trim() || "unknown";
      const senderEmail = senderNode?.getAttribute("email") || senderNode?.getAttribute("data-hovercard-id") || "";

      return {
        author: sender,
        emailOrHandle: senderEmail,
        text: cleanText(body.innerText || body.textContent || ""),
        timestamp: wrapper?.querySelector(".g3, .gH .gK")?.textContent?.trim() || ""
      };
    })
    .filter((message) => message.text);
  const latestIncoming = messages.filter((message) => message.author && !isLikelySelfAuthor(message.author)).at(-1) || messages.at(-1);
  const latest = latestIncoming?.text || "";

  return buildConversationContext(gmailAdapter, {
    threadTitle: textFromFirst(["h2.hP", "[data-thread-perm-id] h2"]) || getThreadTitle(),
    clientName: latestIncoming?.author || messages.at(-1)?.author || textFromFirst([".gD", ".go"]),
    emailOrHandle: latestIncoming?.emailOrHandle || messages.at(-1)?.emailOrHandle || "",
    latestClientMessage: latest,
    recentMessages: messages.slice(-6),
    visibleText: messages.map((message) => message.text).join("\n\n")
  });
}

function extractXConversation() {
  const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'))
    .filter(isVisibleElement)
    .map((tweet) => {
      const userName = tweet.querySelector('[data-testid="User-Name"]')?.textContent?.replace(/\s+/g, " ").trim() || "";
      const handle = userName.match(/@\w+/)?.[0] || tweet.querySelector('a[href^="/"]')?.getAttribute("href")?.replace(/^\//, "@") || "";
      const author = userName || handle || "unknown";

      return {
        author,
        emailOrHandle: handle,
        text: cleanText(tweet.innerText || tweet.textContent || ""),
        timestamp: tweet.querySelector("time")?.getAttribute("datetime") || tweet.querySelector("time")?.textContent?.trim() || ""
      };
    })
    .filter((tweet) => tweet.text);
  const latestTweet = tweets.at(-1)?.text || "";

  return buildConversationContext(xAdapter, {
    threadTitle: tweets[0]?.text?.split("\n").slice(0, 2).join(" ") || getThreadTitle(),
    clientName: tweets.at(-1)?.author || "",
    emailOrHandle: tweets.at(-1)?.emailOrHandle || "",
    latestClientMessage: latestTweet,
    recentMessages: tweets.slice(-8),
    visibleText: tweets.map((tweet) => tweet.text).join("\n\n")
  });
}

function extractLinkedInConversation() {
  const messageNodes = Array.from(
    document.querySelectorAll(
      ".msg-s-message-list__event, .msg-s-event-listitem, .msg-s-message-group, [data-view-name*='message']"
    )
  ).filter(isVisibleElement);
  const messages = messageNodes
    .map((message) => {
      const author =
        textFromWithin(message, [
          ".msg-s-message-group__name",
          ".msg-s-event-listitem__profile-link",
          ".msg-s-message-group__profile-link",
          "strong",
          "a[aria-label]"
        ]) || "unknown";
      const text =
        collectTextWithin(message, [
          ".msg-s-event-listitem__body",
          ".msg-s-message-group__message",
          ".msg-s-message-list__event-content",
          ".msg-s-event-with-indicator",
          "p"
        ]) || cleanText(message.innerText || message.textContent || "");

      return {
        author,
        emailOrHandle: "",
        text,
        timestamp: textFromWithin(message, ["time", ".msg-s-message-group__timestamp"]) || ""
      };
    })
    .filter((message) => message.text && !isLinkedInChromeText(message.text));

  const postText = collectTextFromSelectors([
    ".feed-shared-update-v2",
    ".comments-comment-item",
    "article",
    "main"
  ]);
  const visibleText = messages.length ? messages.map((message) => `${message.author}: ${message.text}`).join("\n\n") : postText;
  const latestMessage = messages.filter((message) => !isLikelySelfAuthor(message.author)).at(-1) || messages.at(-1);

  return buildConversationContext(linkedinAdapter, {
    threadTitle:
      textFromFirst([
        ".msg-thread__topcard-title",
        ".msg-entity-lockup__entity-title",
        ".feed-shared-actor__name",
        "h1",
        "h2"
      ]) || getThreadTitle(),
    clientName:
      latestMessage?.author ||
      textFromFirst([
        ".msg-thread__topcard-title",
        ".msg-entity-lockup__entity-title",
        ".feed-shared-actor__name",
        ".text-heading-xlarge"
      ]),
    latestClientMessage: latestMessage?.text || getLikelyLatestMessage(postText),
    recentMessages: messages.slice(-8),
    visibleText
  });
}

function extractUpworkConversation() {
  const messageText = collectTextFromSelectors([
    '[data-test*="message"]',
    '[data-qa*="message"]',
    '[data-cy*="message"]',
    ".air3-card",
    "main"
  ]);

  return buildConversationContext(upworkAdapter, {
    threadTitle: textFromFirst(["h1", '[data-test="job-title"]', '[data-qa="job-title"]', "h2"]) || getThreadTitle(),
    clientName: textFromFirst(['[data-test*="client"]', '[data-qa*="client"]']),
    emailOrHandle: textFromFirst(['[data-test*="client"]', '[data-qa*="client"]']),
    latestClientMessage: getLikelyLatestMessage(messageText),
    recentMessages: buildRecentMessages(messageText),
    visibleText: messageText
  });
}

function extractFiverrConversation() {
  const messageText = collectTextFromSelectors([
    '[data-testid*="message"]',
    '[data-qa*="message"]',
    '[class*="message"]',
    '[class*="conversation"]',
    "main"
  ]);

  return buildConversationContext(fiverrAdapter, {
    threadTitle: textFromFirst(["h1", "h2", '[data-testid*="title"]']) || getThreadTitle(),
    clientName: textFromFirst(['[data-testid*="username"]', '[class*="username"]', "header a"]),
    emailOrHandle: textFromFirst(['[data-testid*="username"]', '[class*="username"]', "header a"]),
    latestClientMessage: getLikelyLatestMessage(messageText),
    recentMessages: buildRecentMessages(messageText),
    visibleText: messageText
  });
}

function extractWhatsAppConversation() {
  const messages = Array.from(document.querySelectorAll('[data-pre-plain-text], div.message-in, div.message-out'))
    .filter(isVisibleElement)
    .map((message) => {
      const meta = message.getAttribute("data-pre-plain-text") || "";
      const author = meta.match(/\]\s*([^:]+):/)?.[1]?.trim() || (message.classList.contains("message-out") ? "freelancer" : "client");
      const text =
        Array.from(message.querySelectorAll(".selectable-text, [dir='ltr'], [dir='auto']"))
          .map((node) => node.textContent?.trim() || "")
          .filter(Boolean)
          .join("\n") || cleanText(message.innerText || message.textContent || "");

      return {
        author,
        text: cleanText(text),
        timestamp: meta.match(/\[(.*?)\]/)?.[1] || ""
      };
    })
    .filter((message) => message.text);

  return buildConversationContext(whatsappAdapter, {
    threadTitle: getWhatsAppThreadTitle() || getThreadTitle(),
    clientName: getWhatsAppThreadTitle(),
    emailOrHandle: getWhatsAppThreadTitle(),
    latestClientMessage: messages.filter((message) => message.author !== "freelancer").at(-1)?.text || messages.at(-1)?.text || "",
    recentMessages: messages.slice(-10),
    visibleText: messages.map((message) => `${message.author}: ${message.text}`).join("\n\n")
  });
}

function buildConversationContext(adapter, overrides) {
  const replyBox = adapter.findReplyBox();
  const selectedText = getSelectedText();
  const activeEditableText = readEditableText(replyBox);
  const nearbyText = replyBox ? getNearbyText(replyBox) : "";
  const visibleText = cleanText(overrides.visibleText || selectedText || nearbyText || getVisibleText(document.body));
  const latestClientMessage = cleanText(
    selectedText || overrides.latestClientMessage || getLikelyLatestMessage(nearbyText) || activeEditableText || ""
  );
  const recentMessages = overrides.recentMessages?.length ? normalizeRecentMessages(overrides.recentMessages) : buildRecentMessages(visibleText);

  return {
    source: adapter.id,
    sourceLabel: adapter.label,
    pageUrl: location.href,
    pageTitle: document.title,
    threadTitle: cleanText(overrides.threadTitle || getThreadTitle()),
    clientName: cleanText(overrides.clientName || ""),
    clientCompany: cleanText(overrides.clientCompany || ""),
    emailOrHandle: cleanText(overrides.emailOrHandle || ""),
    selectedText: selectedText.slice(0, 10000),
    activeEditableText: activeEditableText.slice(0, 10000),
    latestClientMessage: latestClientMessage.slice(0, 10000),
    recentMessages,
    visibleText: visibleText.slice(0, 12000),
    replyBoxFound: Boolean(replyBox),
    extractedAt: Date.now()
  };
}

function getSelectedText() {
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement) {
    const start = activeElement.selectionStart ?? 0;
    const end = activeElement.selectionEnd ?? 0;
    const selected = activeElement.value.slice(start, end).trim();

    if (selected) {
      return selected;
    }
  }

  return window.getSelection()?.toString().trim() || "";
}

function findGmailReplyBox() {
  const composeBody = findLastVisibleEditable([
    'div[aria-label="Message Body"][contenteditable="true"]',
    'div[aria-label="Message Body"][g_editable="true"]',
    ".Am.Al.editable[contenteditable='true']",
    '[role="textbox"][g_editable="true"]'
  ]);

  if (composeBody) {
    return rememberReplyBox(composeBody);
  }

  const candidates = getEditableCandidates().filter((element) => {
    const label = getElementSignalText(element);

    return (
      label.includes("message body") ||
      label.includes("reply") ||
      element.getAttribute("g_editable") === "true" ||
      element.classList.contains("editable")
    );
  });

  return rememberReplyBox(candidates[0] || findFirstVisibleEditable([".Am.Al.editable", '[role="textbox"][contenteditable="true"]']));
}

function findXReplyBox() {
  return rememberReplyBox(
    findFirstVisibleEditable([
      '[data-testid^="tweetTextarea_"]',
      '[aria-label*="Post text"]',
      '[aria-label*="Tweet text"]',
      '[role="textbox"][contenteditable="true"]'
    ])
  );
}

function findLinkedInReplyBox() {
  return rememberReplyBox(
    findEditableBySignals(["write a message", "message", "reply", "comment", "add a comment"]) ||
      findFirstVisibleEditable([
        ".msg-form__contenteditable[contenteditable='true']",
        ".ql-editor[contenteditable='true']",
        '[aria-label*="Write a message"]',
        '[aria-label*="Message"]',
        '[aria-label*="Add a comment"]',
        '[data-placeholder*="message"]',
        '[data-placeholder*="comment"]',
        '[contenteditable="true"][role="textbox"]'
      ])
  );
}

function findUpworkReplyBox() {
  return rememberReplyBox(
    findEditableBySignals(["message", "reply", "cover letter", "proposal", "terms", "respond"]) ||
      findFirstVisibleEditable([
        'textarea[name*="message"]',
        'textarea[name*="cover"]',
        'textarea[name*="proposal"]',
        '[contenteditable="true"][role="textbox"]'
      ])
  );
}

function findFiverrReplyBox() {
  return rememberReplyBox(
    findEditableBySignals(["message", "reply", "offer", "respond"]) ||
      findFirstVisibleEditable([
        'textarea[name*="message"]',
        '[data-testid*="message"] textarea',
        '[contenteditable="true"][role="textbox"]'
      ])
  );
}

function findWhatsAppReplyBox() {
  return rememberReplyBox(
    findFirstVisibleEditable([
      'footer [contenteditable="true"][role="textbox"]',
      'footer [contenteditable="true"][data-tab]',
      '[aria-label*="Type a message"]',
      '[aria-placeholder*="Type a message"]'
    ])
  );
}

function findGenericReplyBox() {
  if (isVisibleEditable(activeReplyBox) && isLikelyReplyEditable(activeReplyBox)) {
    return activeReplyBox;
  }

  const focused = document.activeElement;

  if (isVisibleEditable(focused) && isLikelyReplyEditable(focused)) {
    return rememberReplyBox(focused);
  }

  const editables = getEditableCandidates().filter(isLikelyReplyEditable);

  return rememberReplyBox(editables[0] || null);
}

function findEditableBySignals(signals) {
  return getEditableCandidates().find((element) => {
    const text = getElementSignalText(element);

    return signals.some((signal) => text.includes(signal));
  });
}

function findFirstVisibleEditable(selectors) {
  for (const selector of selectors) {
    const element = Array.from(document.querySelectorAll(selector)).find(isVisibleEditable);

    if (element) {
      return element;
    }
  }

  return null;
}

function findLastVisibleEditable(selectors) {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector)).filter(isVisibleEditable);
    const element = elements.at(-1);

    if (element) {
      return element;
    }
  }

  return null;
}

function rememberReplyBox(element) {
  activeReplyBox = element || null;
  return activeReplyBox;
}

function getEditableCandidates() {
  return Array.from(
    document.querySelectorAll(
      'textarea, input[type="text"], input[type="email"], input:not([type]), [contenteditable="true"], [role="textbox"]'
    )
  )
    .filter(isVisibleEditable)
    .sort((a, b) => scoreEditable(b) - scoreEditable(a));
}

function scoreEditable(element) {
  const rect = element.getBoundingClientRect();
  const text = getElementSignalText(element);
  let score = rect.width * rect.height;

  if (/(reply|message|comment|compose|proposal|write|respond|tweet|post|offer)/.test(text)) {
    score += 50000;
  }

  if (isInMainComposerArea(element)) {
    score += 25000;
  }

  if (element === document.activeElement) {
    score += 100000;
  }

  return score;
}

function getElementSignalText(element) {
  return [
    element.getAttribute("aria-label"),
    element.getAttribute("aria-placeholder"),
    element.getAttribute("placeholder"),
    element.getAttribute("name"),
    element.getAttribute("data-testid"),
    element.getAttribute("data-qa"),
    element.className
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isInMainComposerArea(element) {
  return Boolean(element.closest("footer, form, [role='dialog'], [data-testid*='composer'], [class*='composer'], [class*='reply']"));
}

function isLikelyReplyEditable(element) {
  const rect = element.getBoundingClientRect();
  const text = getElementSignalText(element);

  return (
    /(reply|message|comment|compose|proposal|write|respond|tweet|post|offer|type a message|message body|cover letter)/.test(text) ||
    element instanceof HTMLTextAreaElement ||
    Boolean(element?.isContentEditable && isInMainComposerArea(element)) ||
    (rect.width >= 180 && rect.height >= 70 && !isIgnoredEditable(element))
  );
}

function isVisibleEditable(element) {
  if (!isEditable(element)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const type = element.getAttribute("type")?.toLowerCase();

  return (
    type !== "password" &&
    type !== "hidden" &&
    !isIgnoredEditable(element) &&
    !element.disabled &&
    !element.readOnly &&
    rect.width >= 40 &&
    rect.height >= 18 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0
  );
}

function isIgnoredEditable(element) {
  const type = element.getAttribute("type")?.toLowerCase();
  const role = element.getAttribute("role")?.toLowerCase();
  const signal = getElementSignalText(element);

  return (
    type === "search" ||
    role === "searchbox" ||
    role === "combobox" ||
    /(search|find|filter|subject|recipient|to:|cc:|bcc:|address|url|phone)/.test(signal)
  );
}

function isEditable(element) {
  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement ||
    Boolean(element?.isContentEditable) ||
    element?.getAttribute?.("role") === "textbox"
  );
}

function injectButton(onClick) {
  if (document.getElementById(buttonId)) {
    return;
  }

  injectButtonStyle();
  fmButton = document.createElement("button");
  fmButton.id = buttonId;
  fmButton.type = "button";
  fmButton.textContent = "FM";
  fmButton.title = "Open Freelancer Memory";
  fmButton.setAttribute("aria-label", "Open Freelancer Memory");
  fmButton.addEventListener("mousedown", (event) => event.preventDefault());
  fmButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  document.documentElement.append(fmButton);
}

function injectButtonStyle() {
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    #${buttonId} {
      position: fixed;
      z-index: 2147483647;
      display: none;
      width: 36px;
      height: 30px;
      border: 2px solid #111827;
      border-radius: 7px;
      background: #f5d547;
      color: #111827;
      box-shadow: 3px 3px 0 #111827;
      font: 950 12px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
      cursor: pointer;
    }
    #${buttonId}:hover {
      transform: translateY(-1px);
    }
    #${buttonId}.freelancer-memory-selection {
      width: auto;
      min-width: 116px;
      padding: 0 10px;
      background: #111827;
      color: #ffffff;
      box-shadow: 3px 3px 0 #f5d547;
    }
    #${inlinePanelId} {
      position: fixed;
      z-index: 2147483647;
      width: min(360px, calc(100vw - 24px));
      max-height: min(420px, calc(100vh - 24px));
      overflow: auto;
      border: 2px solid #111827;
      border-radius: 8px;
      background: #ffffff;
      color: #111827;
      box-shadow: 5px 5px 0 #111827;
      font: 500 13px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    #${inlinePanelId} * {
      box-sizing: border-box;
      font-family: inherit;
      letter-spacing: 0;
    }
    #${inlinePanelId} .fm-inline-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      background: #f5d547;
      font-weight: 900;
    }
    #${inlinePanelId} .fm-inline-close {
      width: 24px;
      height: 24px;
      border: 1px solid #111827;
      border-radius: 6px;
      background: #ffffff;
      color: #111827;
      cursor: pointer;
      font-weight: 900;
      line-height: 1;
    }
    #${inlinePanelId} .fm-inline-body {
      padding: 12px;
    }
    #${inlinePanelId} .fm-inline-status {
      margin: 0;
      color: #4b5563;
      font-weight: 700;
    }
    #${inlinePanelId} .fm-inline-error {
      color: #b91c1c;
    }
    #${inlinePanelId} .fm-inline-reply {
      width: 100%;
      min-height: 118px;
      resize: vertical;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      padding: 9px;
      background: #ffffff;
      color: #111827;
      font: 500 13px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #${inlinePanelId} .fm-inline-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    #${inlinePanelId} .fm-inline-actions button {
      border: 1px solid #111827;
      border-radius: 7px;
      background: #ffffff;
      color: #111827;
      padding: 7px 9px;
      cursor: pointer;
      font-weight: 850;
    }
    #${inlinePanelId} .fm-inline-actions button:first-child {
      background: #111827;
      color: #ffffff;
    }
    #${inlinePanelId} .fm-inline-preview {
      max-height: 148px;
      overflow: auto;
      margin: 0 0 10px;
      white-space: pre-wrap;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      background: #fffdf8;
      padding: 9px;
      color: #111827;
      font-weight: 650;
    }
  `;
  document.documentElement.append(style);
}

function updateButtonPosition() {
  if (!fmButton) {
    return;
  }

  const selectionRect = getSelectionButtonRect();

  if (selectionRect) {
    buttonMode = "selection";
    activeSocialField = null;
    activeSocialMatch = null;
    fmButton.textContent = "Generate reply";
    fmButton.title = "Generate a reply from highlighted text";
    fmButton.setAttribute("aria-label", "Generate a reply from highlighted text");
    fmButton.classList.add("freelancer-memory-selection");
    fmButton.style.top = `${selectionRect.top}px`;
    fmButton.style.left = `${selectionRect.left}px`;
    fmButton.style.display = "block";
    return;
  }

  const socialTarget = findSocialFillField();

  if (socialTarget) {
    const rect = socialTarget.element.getBoundingClientRect();
    const top = Math.max(8, rect.top - 34);
    const left = Math.min(window.innerWidth - 44, Math.max(8, rect.right - 38));

    buttonMode = "social";
    activeSocialField = socialTarget.element;
    activeSocialMatch = socialTarget.match;
    fmButton.textContent = "FM";
    fmButton.title = activeSocialMatch.kind
      ? `Fill ${getSocialLabel(activeSocialMatch.kind)}`
      : "Pick a saved link to fill";
    fmButton.setAttribute("aria-label", fmButton.title);
    fmButton.classList.remove("freelancer-memory-selection");
    fmButton.style.top = `${top}px`;
    fmButton.style.left = `${left}px`;
    fmButton.style.display = "block";
    return;
  }

  const replyBox = getActiveAdapter().findReplyBox();

  if (!replyBox) {
    activeSocialField = null;
    activeSocialMatch = null;
    fmButton.style.display = "none";
    return;
  }

  const rect = replyBox.getBoundingClientRect();
  const top = Math.max(8, rect.top - 34);
  const left = Math.min(window.innerWidth - 44, Math.max(8, rect.right - 38));

  buttonMode = "reply";
  activeSocialField = null;
  activeSocialMatch = null;
  fmButton.textContent = "FM";
  fmButton.title = "Open Freelancer Memory";
  fmButton.setAttribute("aria-label", "Open Freelancer Memory");
  fmButton.classList.remove("freelancer-memory-selection");
  fmButton.style.top = `${top}px`;
  fmButton.style.left = `${left}px`;
  fmButton.style.display = "block";
}

function getSelectionButtonRect() {
  const selection = window.getSelection();
  const text = selection?.toString().trim() || "";

  if (!selection || !text || text.length < 4 || !selection.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = Array.from(range.getClientRects()).find((item) => item.width > 0 && item.height > 0) || range.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return null;
  }

  return {
    top: Math.min(window.innerHeight - 40, Math.max(8, rect.bottom + 8)),
    left: Math.min(window.innerWidth - 132, Math.max(8, rect.left))
  };
}

async function handleSocialFill() {
  if (!activeSocialField) {
    return;
  }

  const stored = await chrome.storage.local.get(socialsStorageKey);
  const socials = stored[socialsStorageKey] || {};
  const kind = activeSocialMatch?.kind || "";
  const value = kind ? String(socials[kind] || "").trim() : "";

  if (kind && activeSocialMatch.confidence >= 2 && value) {
    insertValueIntoField(activeSocialField, value);
    return;
  }

  showSocialPicker(socials, activeSocialField, kind);
}

function showSocialPicker(socials, target, preferredKind = "") {
  const entries = getSocialEntries(socials);

  if (!entries.length) {
    showInlinePanel("Add your socials in the side panel first.", true);
    return;
  }

  showChoicePanel({
    title: preferredKind ? `Fill ${getSocialLabel(preferredKind)}` : "Pick saved link",
    body: preferredKind && !socials[preferredKind] ? `${getSocialLabel(preferredKind)} is not saved yet.` : "",
    actions: entries.map(([kind, value]) => ({
      label: getSocialLabel(kind),
      onClick: () => {
        insertValueIntoField(target, value);
        closeInlinePanel();
      }
    }))
  });
}

async function showGmailSavedReplyInsert() {
  const replyBox = getActiveAdapter().findReplyBox();

  if (!replyBox) {
    return false;
  }

  const stored = await chrome.storage.local.get(lastResultStorageKey);
  const saved = stored[lastResultStorageKey];
  const reply = String(saved?.result?.reply || "").trim();

  if (!reply) {
    return false;
  }

  showChoicePanel({
    title: "Insert saved reply?",
    body: reply,
    actions: [
      {
        label: "Insert",
        primary: true,
        onClick: () => {
          const response = insertReplyInto(reply, replyBox);

          if (!response.ok) {
            showInlinePanel(response.error || "Could not insert reply.", true);
            return;
          }

          closeInlinePanel();
        }
      },
      {
        label: "Open panel",
        onClick: openSidePanelFromInline
      }
    ]
  });

  return true;
}

function showChoicePanel({ title, body, actions }) {
  const rect = activeSocialField?.getBoundingClientRect() || getActiveAdapter().findReplyBox()?.getBoundingClientRect() || null;

  if (!inlinePanel) {
    inlinePanel = document.createElement("section");
    inlinePanel.id = inlinePanelId;
    inlinePanel.setAttribute("role", "dialog");
    inlinePanel.setAttribute("aria-label", title);
    document.documentElement.append(inlinePanel);
  }

  inlinePanel.innerHTML = `
    <div class="fm-inline-head">
      <span>${escapeHtml(title)}</span>
      <button class="fm-inline-close" type="button" aria-label="Close">x</button>
    </div>
    <div class="fm-inline-body">
      ${body ? `<p class="fm-inline-preview">${escapeHtml(body)}</p>` : ""}
      <div class="fm-inline-actions">
        ${actions.map((action, index) => `<button type="button" data-choice="${index}">${escapeHtml(action.label)}</button>`).join("")}
      </div>
    </div>
  `;

  const top = rect ? Math.max(12, rect.top - 8) : 72;
  const left = rect ? Math.max(12, rect.left) : 12;
  const maxLeft = Math.max(12, window.innerWidth - 372);
  inlinePanel.style.top = `${Math.min(window.innerHeight - 40, top)}px`;
  inlinePanel.style.left = `${Math.min(maxLeft, left)}px`;
  inlinePanel.querySelector(".fm-inline-close")?.addEventListener("click", closeInlinePanel);

  for (const button of Array.from(inlinePanel.querySelectorAll("[data-choice]"))) {
    const action = actions[Number(button.dataset.choice)];
    button.addEventListener("click", action.onClick);
  }
}

function findSocialFillField() {
  const active = document.activeElement;
  const activeMatch = detectSocialField(active);

  if (activeMatch && isVisibleFillField(active)) {
    return {
      element: active,
      match: activeMatch
    };
  }

  const candidates = getSocialFieldCandidates()
    .map((element) => ({
      element,
      match: detectSocialField(element)
    }))
    .filter((candidate) => candidate.match)
    .sort((a, b) => b.match.confidence - a.match.confidence);

  return candidates[0] || null;
}

function getSocialFieldCandidates() {
  return Array.from(
    document.querySelectorAll(
      'input[type="url"], input[type="text"], input[type="email"], input:not([type]), textarea, [contenteditable="true"], [role="textbox"]'
    )
  ).filter(isVisibleFillField);
}

function detectSocialField(element) {
  if (!isEditable(element)) {
    return null;
  }

  const text = getFieldContextText(element);
  const checks = [
    ["linkedin", /\b(linkedin|linkedin\.com|\/in\/)\b/i, 3],
    ["x", /\b(x\.com|twitter|twitter\.com)\b|@\.\.\.|@\w*/i, 3],
    ["portfolio", /\b(portfolio|work samples?|case studies|projects)\b/i, 3],
    ["website", /\b(website|web site|personal site|homepage)\b/i, 3],
    ["email", /\b(email|e-mail|mail)\b/i, 3],
    ["calendar", /\b(calendar|calendly|cal\.com|booking link|schedule)\b/i, 3]
  ];

  for (const [kind, pattern, confidence] of checks) {
    if (pattern.test(text)) {
      return { kind, confidence };
    }
  }

  if (/\b(site url|url|link)\b/i.test(text) || (element instanceof HTMLInputElement && (element.type === "url" || element.placeholder?.includes("https://")))) {
    return { kind: "", confidence: 1 };
  }

  return null;
}

function getFieldContextText(element) {
  const id = element.getAttribute("id");
  const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || "" : "";
  const labelWrapper = element.closest("label")?.textContent || "";

  return [
    getElementSignalText(element),
    label,
    labelWrapper,
    element.previousElementSibling?.textContent || "",
    element.parentElement?.previousElementSibling?.textContent || ""
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getSocialEntries(socials) {
  return ["linkedin", "x", "website", "portfolio", "email", "calendar"]
    .map((kind) => [kind, String(socials[kind] || "").trim()])
    .filter(([, value]) => value);
}

function getSocialLabel(kind) {
  const labels = {
    linkedin: "LinkedIn",
    x: "X.com",
    website: "Website",
    portfolio: "Portfolio",
    email: "Email",
    calendar: "Calendar"
  };

  return labels[kind] || "Saved link";
}

function insertValueIntoField(target, value) {
  target.focus();

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.value = value;
    dispatchEditableEvents(target);
    return;
  }

  target.textContent = value;
  dispatchEditableEvents(target);
}

function isVisibleFillField(element) {
  if (!isEditable(element)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const type = element.getAttribute("type")?.toLowerCase();
  const role = element.getAttribute("role")?.toLowerCase();

  return (
    type !== "password" &&
    type !== "hidden" &&
    type !== "search" &&
    role !== "searchbox" &&
    !element.disabled &&
    !element.readOnly &&
    rect.width >= 40 &&
    rect.height >= 18 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0
  );
}

async function generateInlineReply(pageContext) {
  const inputText = cleanText(pageContext.selectedText || pageContext.latestClientMessage || "");

  if (!inputText) {
    showInlinePanel("Select the text you want to answer first.", true);
    return;
  }

  showInlinePanel("Generating reply...", false);
  lastInlinePageContext = pageContext;
  fmButton.disabled = true;

  try {
    const stored = await chrome.storage.local.get([
      contextStorageKey,
      betaKeyStorageKey,
      endpointStorageKey,
      installIdStorageKey,
      forcedIntentStorageKey,
      instructionStorageKey,
      projectsStorageKey
    ]);
    const businessMemory = stored[contextStorageKey] || {};
    const projectMemory = findInlineProjectMemory(stored[projectsStorageKey], pageContext);
    const contextPacket = {
      action: "reply",
      source: normalizeSource(pageContext.source),
      businessMemory: {
        ...businessMemory,
        updatedAt: new Date().toISOString()
      },
      clientMemory: null,
      projectMemory,
      sessionMemory: null,
      pageContext: sanitizeInlinePageContext(pageContext, inputText),
      userInstruction: String(stored[instructionStorageKey] || "").trim()
    };
    const payload = {
      context: businessMemory,
      inputText,
      pageContext: contextPacket.pageContext,
      sessionMemory: null,
      contextPacket,
      forcedIntent: stored[forcedIntentStorageKey] || "auto",
      userInstruction: contextPacket.userInstruction
    };
    const endpoint = normalizeEndpoint(stored[endpointStorageKey] || defaultApiEndpoint);
    const betaKey = String(stored[betaKeyStorageKey] || "").trim();
    const installId = String(stored[installIdStorageKey] || "").trim();
    const data = await requestInlineGeneration(endpoint, payload, betaKey, installId);

    await chrome.storage.local.set({
      [lastResultStorageKey]: {
        result: data.result,
        usage: data.usage || null
      }
    });
    showInlinePanel(data.result.reply || "", false, data.result);
  } catch (error) {
    showInlinePanel(readableInlineError(error), true);
  } finally {
    fmButton.disabled = false;
  }
}

function showInlinePanel(message, isError, result = null) {
  const rect = getSelectionButtonRect();

  if (!inlinePanel) {
    inlinePanel = document.createElement("section");
    inlinePanel.id = inlinePanelId;
    inlinePanel.setAttribute("role", "dialog");
    inlinePanel.setAttribute("aria-label", "Generated reply");
    document.documentElement.append(inlinePanel);
  }

  const reply = result ? message : "";
  inlinePanel.innerHTML = `
    <div class="fm-inline-head">
      <span>${result ? "Reply ready" : "Freelancer Memory"}</span>
      <button class="fm-inline-close" type="button" aria-label="Close">x</button>
    </div>
    <div class="fm-inline-body">
      ${
        result
          ? `<textarea class="fm-inline-reply" spellcheck="true">${escapeHtml(reply)}</textarea>
             <div class="fm-inline-actions">
               <button type="button" data-action="copy">Copy</button>
               <button type="button" data-action="insert">Insert</button>
               <button type="button" data-action="panel">Open panel</button>
             </div>`
          : `<p class="fm-inline-status ${isError ? "fm-inline-error" : ""}">${escapeHtml(message)}</p>
             <div class="fm-inline-actions">
               <button type="button" data-action="panel">Open panel</button>
             </div>`
      }
    </div>
  `;

  const top = rect ? rect.top : 72;
  const left = rect ? rect.left : 12;
  const maxLeft = Math.max(12, window.innerWidth - 372);
  inlinePanel.style.top = `${Math.min(window.innerHeight - 40, Math.max(12, top))}px`;
  inlinePanel.style.left = `${Math.min(maxLeft, Math.max(12, left))}px`;
  inlinePanel.querySelector(".fm-inline-close")?.addEventListener("click", closeInlinePanel);
  inlinePanel.querySelector('[data-action="copy"]')?.addEventListener("click", copyInlineReply);
  inlinePanel.querySelector('[data-action="insert"]')?.addEventListener("click", insertInlineReply);
  inlinePanel.querySelector('[data-action="panel"]')?.addEventListener("click", openSidePanelFromInline);
}

function closeInlinePanel() {
  inlinePanel?.remove();
  inlinePanel = null;
}

async function copyInlineReply() {
  const reply = inlinePanel?.querySelector(".fm-inline-reply")?.value.trim() || "";

  if (!reply) {
    return;
  }

  await navigator.clipboard.writeText(reply);
}

function insertInlineReply() {
  const reply = inlinePanel?.querySelector(".fm-inline-reply")?.value.trim() || "";
  const response = getActiveAdapter().insertReply(reply);

  if (!response.ok) {
    showInlinePanel(response.error || "Could not insert reply.", true);
    return;
  }

  closeInlinePanel();
}

async function openSidePanelFromInline() {
  const context = lastInlinePageContext || getActiveAdapter().extractConversation();
  await savePageContext(context);
  chrome.runtime.sendMessage({
    type: "freelancer-memory:open-side-panel",
    pageContext: context
  });
}

function sanitizeInlinePageContext(pageContext, inputText) {
  return {
    ...pageContext,
    selectedText: trimInlineText(pageContext.selectedText, 10000),
    activeEditableText: trimInlineText(pageContext.activeEditableText, 10000),
    latestClientMessage: trimInlineText(pageContext.latestClientMessage || inputText, 10000),
    visibleText: trimInlineText(pageContext.visibleText || inputText, 12000),
    recentMessages: Array.isArray(pageContext.recentMessages)
      ? pageContext.recentMessages
          .map((message) => ({
            author: trimInlineText(message.author || "unknown", 120),
            text: trimInlineText(message.text || "", 2000),
            timestamp: trimInlineText(message.timestamp || "", 120)
          }))
          .filter((message) => message.text)
          .slice(-10)
      : []
  };
}

async function requestInlineGeneration(endpoint, payload, betaKey, installId) {
  const response = await chrome.runtime.sendMessage({
    type: "freelancer-memory:generate-reply",
    endpoint,
    betaKey,
    installId,
    payload
  });

  if (!response?.ok || !response.data?.result) {
    throw new Error(response?.error || "Generation failed.");
  }

  return response.data;
}

function normalizeEndpoint(value) {
  const trimmed = String(value || "").trim() || defaultApiEndpoint;

  if (trimmed.endsWith("/api/generate")) {
    return trimmed;
  }

  return `${trimmed.replace(/\/$/, "")}/api/generate`;
}

function normalizeSource(source) {
  const allowedSources = new Set(["gmail", "linkedin", "upwork", "fiverr", "generic", "x", "whatsapp"]);
  const normalized = String(source || "generic").toLowerCase();

  return allowedSources.has(normalized) ? normalized : "generic";
}

function findInlineProjectMemory(projects, pageContext) {
  if (!Array.isArray(projects) || !pageContext) {
    return null;
  }

  const pageKey = getInlinePageKey(pageContext.pageUrl);
  const title = cleanText(pageContext.threadTitle || pageContext.pageTitle || "").toLowerCase();

  return (
    projects.find((project) => pageKey && project.sourceUrls?.some((url) => getInlinePageKey(url) === pageKey)) ||
    projects.find((project) => title && cleanText(project.title || "").toLowerCase() === title) ||
    null
  );
}

function getInlinePageKey(pageUrl) {
  try {
    const url = new URL(pageUrl);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return pageUrl || "";
  }
}

function trimInlineText(value, maxLength) {
  const text = String(value || "").trim();

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function readableInlineError(error) {
  const message = error instanceof Error ? error.message : "Something went wrong.";

  if (message.includes("Failed to fetch")) {
    return "Could not reach API. Start Next locally or open the panel to check endpoint.";
  }

  return message;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function insertReplyInto(text, target) {
  const trimmed = text.trim();

  if (!trimmed) {
    return { ok: false, error: "No reply text to insert." };
  }

  if (!target) {
    return { ok: false, error: "No editable reply box found." };
  }

  activeReplyBox = target;
  target.focus();

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const prefix = target.value && start === target.value.length ? "\n\n" : "";
    target.setRangeText(`${prefix}${trimmed}`, start, end, "end");
    dispatchEditableEvents(target);
    return { ok: true };
  }

  const beforeText = readEditableText(target);
  const inserted = insertTextIntoContentEditable(trimmed, target);
  const afterText = readEditableText(target);

  if (!inserted || afterText === beforeText) {
    const prefix = beforeText ? "\n\n" : "";
    target.textContent = `${beforeText}${prefix}${trimmed}`;
  }

  dispatchEditableEvents(target);

  return { ok: true };
}

function insertTextIntoContentEditable(text, target) {
  const selection = window.getSelection();

  if (!selection || !target) {
    return false;
  }

  if (!selection.rangeCount || !target.contains(selection.anchorNode)) {
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  if (document.queryCommandSupported?.("insertText")) {
    return document.execCommand("insertText", false, text);
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function dispatchEditableEvents(element) {
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function readEditableText(element) {
  if (!element) {
    return "";
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value.trim();
  }

  return element.textContent?.trim() || "";
}

function getNearbyText(element) {
  let node = element;
  let bestText = "";

  for (let depth = 0; depth < 5 && node?.parentElement; depth += 1) {
    node = node.parentElement;
    const text = getVisibleText(node);

    if (text.length > bestText.length) {
      bestText = text;
    }

    if (bestText.length > 2500) {
      break;
    }
  }

  return bestText.slice(0, 12000);
}

function collectTextFromSelectors(selectors) {
  const blocks = [];

  for (const selector of selectors) {
    for (const element of Array.from(document.querySelectorAll(selector)).filter(isVisibleElement)) {
      const text = cleanText(element.innerText || element.textContent || "");

      if (text && !blocks.includes(text)) {
        blocks.push(text);
      }

      if (blocks.join("\n\n").length > 12000) {
        return blocks.join("\n\n").slice(0, 12000);
      }
    }
  }

  return blocks.join("\n\n") || getVisibleText(document.body);
}

function getVisibleText(root) {
  if (!root) {
    return "";
  }

  const text = root.innerText || root.textContent || "";

  return cleanText(text);
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getLikelyLatestMessage(text) {
  const chunks = cleanText(text)
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 20 && !chunk.includes("Freelancer Memory"));

  return chunks.at(-1) || cleanText(text);
}

function isLikelySelfAuthor(author) {
  const normalized = cleanText(author).toLowerCase();

  return normalized === "me" || normalized === "you" || normalized.includes("to me");
}

function buildRecentMessages(text) {
  return cleanText(text)
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 20 && chunk.length < 2000 && !chunk.includes("Freelancer Memory"))
    .slice(-6)
    .map((chunk) => ({
      author: "unknown",
      text: chunk,
      timestamp: ""
    }));
}

function normalizeRecentMessages(messages) {
  return messages
    .map((message) => ({
      author: cleanText(message.author || "unknown").slice(0, 120),
      text: cleanText(message.text || "").slice(0, 2000),
      timestamp: cleanText(message.timestamp || "").slice(0, 120)
    }))
    .filter((message) => message.text)
    .slice(-10);
}

function getThreadTitle() {
  const heading = Array.from(document.querySelectorAll("h1, h2"))
    .map((element) => element.textContent?.trim() || "")
    .find(Boolean);

  return heading || document.title || "";
}

function getWhatsAppThreadTitle() {
  return (
    textFromFirst(["header span[title]", "header [dir='auto']", "header [role='button'] span"]) ||
    document.title.replace(/^WhatsApp\s*/, "").trim()
  );
}

function textFromFirst(selectors) {
  for (const selector of selectors) {
    const element = Array.from(document.querySelectorAll(selector)).find(isVisibleElement);
    const text = cleanText(element?.getAttribute("title") || element?.textContent || "");

    if (text) {
      return text;
    }
  }

  return "";
}

function textFromWithin(root, selectors) {
  for (const selector of selectors) {
    const element = Array.from(root.querySelectorAll(selector)).find(isVisibleElement);
    const text = cleanText(element?.getAttribute("aria-label") || element?.getAttribute("title") || element?.textContent || "");

    if (text) {
      return text;
    }
  }

  return "";
}

function collectTextWithin(root, selectors) {
  const blocks = [];

  for (const selector of selectors) {
    for (const element of Array.from(root.querySelectorAll(selector)).filter(isVisibleElement)) {
      const text = cleanText(element.innerText || element.textContent || "");

      if (text && !blocks.includes(text)) {
        blocks.push(text);
      }
    }
  }

  return blocks.join("\n");
}

function isLinkedInChromeText(text) {
  return /^(sent|seen|typing|press enter|start a post|open profile|premium|linkedin member)$/i.test(cleanText(text));
}

function isVisibleElement(element) {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
}

async function savePageContext(context) {
  await chrome.storage.local.set({ [pageContextStorageKey]: context });
}

function saveSelection(selection) {
  lastSavedSelection = selection.text;
  chrome.storage.local.set({ [selectionStorageKey]: selection });
}

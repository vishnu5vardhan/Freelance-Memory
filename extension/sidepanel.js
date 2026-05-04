const storageKeys = {
  context: "freelancer_memory_extension_context",
  betaKey: "freelancer_memory_extension_beta_key",
  draft: "freelancer_memory_extension_draft",
  endpoint: "freelancer_memory_extension_api_endpoint",
  forcedIntent: "freelancer_memory_extension_forced_intent",
  installId: "freelancer_memory_extension_install_id",
  instruction: "freelancer_memory_extension_instruction",
  lastResult: "freelancer_memory_extension_last_result",
  lastSelection: "freelancer_memory_extension_last_selection",
  pageContext: "freelancer_memory_extension_page_context",
  pendingUpdates: "freelancer_memory_pending_updates",
  socials: "freelancer_memory_extension_socials",
  sessions: "freelancer_memory_sessions",
  clients: "freelancer_memory_clients",
  projects: "freelancer_memory_projects"
};

const defaultApiEndpoint = "https://freelancer-memory.vercel.app/api/generate";
const sessionTtlMs = 2 * 60 * 60 * 1000;

const emptyContext = {
  name: "",
  role: "",
  niche: "",
  shortBio: "",
  services: "",
  pricing: "",
  proof: "",
  portfolioLinks: "",
  process: "",
  availability: "",
  paymentTerms: "",
  boundaries: "",
  voice: ""
};

const emptySocials = {
  linkedin: "",
  x: "",
  website: "",
  portfolio: "",
  email: "",
  calendar: ""
};

const contextFields = [
  ["name", "Name", "Alex Carter", 1],
  ["role", "Role", "Webflow developer, brand designer, Shopify expert...", 2],
  ["niche", "Niche", "Landing pages for B2B SaaS, ecommerce stores, coaches...", 2],
  ["shortBio", "Short bio", "One honest paragraph about what you do and who you help.", 4],
  ["services", "Services", "Landing page design, Webflow build, conversion audit...", 4],
  ["pricing", "Pricing", "Starting price, packages, hourly rate, minimum budget...", 4],
  ["proof", "Proof", "Results, testimonials, client names you can mention, case study bullets...", 4],
  ["portfolioLinks", "Portfolio links", "https://...", 3],
  ["process", "Process", "Discovery, scope, deposit, build, feedback, launch...", 4],
  ["availability", "Availability", "Taking 2 projects/month, starts next Monday, timezone...", 3],
  ["paymentTerms", "Payment terms", "50% upfront, Stripe invoice, net 7, milestone terms...", 3],
  ["boundaries", "Boundaries", "No unpaid calls, no unlimited revisions, minimum budget...", 4],
  ["voice", "Voice", "Direct, warm, concise. Avoid corporate fluff. Use simple words.", 3]
];

const socialFields = [
  ["linkedin", "LinkedIn", "https://www.linkedin.com/in/your-name"],
  ["x", "X.com", "https://x.com/yourhandle"],
  ["website", "Website", "https://yourdomain.com"],
  ["portfolio", "Portfolio", "https://yourdomain.com/work"],
  ["email", "Email", "you@example.com"],
  ["calendar", "Calendar", "https://cal.com/yourname"]
];

const projectFields = [
  ["title", "Project title", "Landing page redesign", 1, "text"],
  ["status", "Status", "", 1, "status"],
  ["budget", "Budget", "$2,000", 1, "text"],
  ["timeline", "Timeline", "10 days", 1, "text"],
  ["includedScope", "Included scope", "Homepage redesign\nResponsive setup", 4, "list"],
  ["excludedScope", "Excluded scope", "Dashboard pages\nUnlimited revisions", 4, "list"],
  ["paymentTerms", "Payment terms", "50% upfront, 50% before launch", 3, "text"],
  ["agreedFacts", "Agreed facts", "One fact per line", 4, "list"],
  ["risks", "Risks", "One risk per line", 4, "list"],
  ["nextStep", "Next step", "Send fixed scope for approval", 2, "text"]
];

const projectStatuses = ["discovery", "quoted", "active", "waiting", "done"];
const listProjectFields = ["includedScope", "excludedScope", "agreedFacts", "risks"];
const outputTypes = [
  ["auto", "Auto"],
  ["first_reply", "First reply"],
  ["pricing_reply", "Pricing"],
  ["scope", "Scope"],
  ["follow_up", "Follow-up"],
  ["push_back", "Push back"],
  ["profile_answer", "Form answer"]
];

const importantFields = ["role", "services", "pricing", "proof", "process", "boundaries", "voice"];
const reviewWorthyLabels = {
  budget: "Budget",
  timeline: "Timeline",
  paymentTerms: "Payment terms",
  includedScope: "Included scope",
  excludedScope: "Excluded scope",
  risks: "Risk flags",
  agreedFacts: "Important fact",
  notes: "Client note"
};

const elements = {};
let context = { ...emptyContext };
let socials = { ...emptySocials };
let result = null;
let currentPageContext = null;
let currentSession = null;
let currentClientMemory = null;
let currentProjectMemory = null;
let pendingMemoryUpdates = [];
let installId = "";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  renderModeOptions();
  renderMemoryFields();
  renderSocialFields();
  renderProjectFields();
  bindEvents();
  await cleanExpiredSessions();
  await loadState();
  await loadStoredPageContext();

  if (!currentPageContext?.latestClientMessage) {
    await grabSelection();
  }
}

function cacheElements() {
  elements.inputText = document.querySelector("#inputText");
  elements.betaKey = document.querySelector("#betaKey");
  elements.forcedIntent = document.querySelector("#forcedIntent");
  elements.apiEndpoint = document.querySelector("#apiEndpoint");
  elements.userInstruction = document.querySelector("#userInstruction");
  elements.generateButton = document.querySelector("#generateButton");
  elements.copyButton = document.querySelector("#copyButton");
  elements.insertButton = document.querySelector("#insertButton");
  elements.insertHint = document.querySelector("#insertHint");
  elements.grabPageButton = document.querySelector("#grabPageButton");
  elements.grabSelectionButton = document.querySelector("#grabSelectionButton");
  elements.replyOutput = document.querySelector("#replyOutput");
  elements.replyMeta = document.querySelector("#replyMeta");
  elements.statusText = document.querySelector("#statusText");
  elements.pageHint = document.querySelector("#pageHint");
  elements.sessionHint = document.querySelector("#sessionHint");
  elements.projectHint = document.querySelector("#projectHint");
  elements.memoryFields = document.querySelector("#memoryFields");
  elements.socialFields = document.querySelector("#socialFields");
  elements.projectFields = document.querySelector("#projectFields");
  elements.memoryTab = document.querySelector("#memoryTab");
  elements.projectTab = document.querySelector("#projectTab");
  elements.socialsTab = document.querySelector("#socialsTab");
  elements.memoryPanel = document.querySelector("#memoryPanel");
  elements.projectPanel = document.querySelector("#projectPanel");
  elements.socialsPanel = document.querySelector("#socialsPanel");
  elements.scoreText = document.querySelector("#scoreText");
  elements.scoreBar = document.querySelector("#scoreBar");
  elements.intentBadge = document.querySelector("#intentBadge");
  elements.confidenceBadge = document.querySelector("#confidenceBadge");
  elements.riskBox = document.querySelector("#riskBox");
  elements.riskTitle = document.querySelector("#riskTitle");
  elements.riskReason = document.querySelector("#riskReason");
  elements.analysisBox = document.querySelector("#analysisBox");
  elements.pendingReviewList = document.querySelector("#pendingReviewList");
  elements.memoryReviewEmpty = document.querySelector("#memoryReviewEmpty");
  elements.acceptAllMemoryButton = document.querySelector("#acceptAllMemoryButton");
  elements.rejectAllMemoryButton = document.querySelector("#rejectAllMemoryButton");
  elements.memorySnapshot = document.querySelector("#memorySnapshot");
}

function renderModeOptions() {
  elements.forcedIntent.replaceChildren(
    ...outputTypes.map(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    })
  );
}

function renderMemoryFields() {
  elements.memoryFields.replaceChildren(
    ...contextFields.map(([key, label, placeholder, rows]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "field";

      const labelNode = document.createElement("span");
      labelNode.textContent = label;

      const control = rows === 1 ? document.createElement("input") : document.createElement("textarea");
      control.id = `memory-${key}`;
      control.dataset.memoryKey = key;
      control.placeholder = placeholder;
      control.spellcheck = true;

      if (rows !== 1) {
        control.rows = rows;
      }

      wrapper.append(labelNode, control);
      return wrapper;
    })
  );
}

function renderSocialFields() {
  elements.socialFields.replaceChildren(
    ...socialFields.map(([key, label, placeholder]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "field";

      const labelNode = document.createElement("span");
      labelNode.textContent = label;

      const control = document.createElement("input");
      control.id = `social-${key}`;
      control.dataset.socialKey = key;
      control.placeholder = placeholder;
      control.spellcheck = false;

      wrapper.append(labelNode, control);
      return wrapper;
    })
  );
}

function renderProjectFields() {
  elements.projectFields.replaceChildren(
    ...projectFields.map(([key, label, placeholder, rows, kind]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "field";

      const labelNode = document.createElement("span");
      labelNode.textContent = label;

      let control;

      if (kind === "status") {
        control = document.createElement("select");

        for (const status of projectStatuses) {
          const option = document.createElement("option");
          option.value = status;
          option.textContent = status.replaceAll("_", " ");
          control.append(option);
        }
      } else {
        control = rows === 1 ? document.createElement("input") : document.createElement("textarea");
        control.placeholder = placeholder;
        control.spellcheck = true;

        if (rows !== 1) {
          control.rows = rows;
        }
      }

      control.id = `project-${key}`;
      control.dataset.projectKey = key;
      control.dataset.projectKind = kind;

      wrapper.append(labelNode, control);
      return wrapper;
    })
  );
}

function bindEvents() {
  elements.inputText.addEventListener("input", () => {
    setStoredValue(storageKeys.draft, elements.inputText.value);
  });

  elements.forcedIntent.addEventListener("change", () => {
    setStoredValue(storageKeys.forcedIntent, elements.forcedIntent.value);
  });

  elements.apiEndpoint.addEventListener("input", () => {
    setStoredValue(storageKeys.endpoint, elements.apiEndpoint.value);
  });

  elements.betaKey.addEventListener("input", () => {
    setStoredValue(storageKeys.betaKey, elements.betaKey.value);
  });

  elements.userInstruction.addEventListener("input", () => {
    setStoredValue(storageKeys.instruction, elements.userInstruction.value);
  });

  elements.generateButton.addEventListener("click", generateReply);
  elements.copyButton.addEventListener("click", copyReply);
  elements.insertButton.addEventListener("click", insertReplyIntoPage);
  elements.grabPageButton.addEventListener("click", grabPageContext);
  elements.grabSelectionButton.addEventListener("click", grabSelection);
  elements.memoryTab.addEventListener("click", () => showSavedInfoTab("memory"));
  elements.projectTab.addEventListener("click", () => showSavedInfoTab("project"));
  elements.socialsTab.addEventListener("click", () => showSavedInfoTab("socials"));
  elements.pendingReviewList.addEventListener("click", handlePendingReviewClick);
  elements.acceptAllMemoryButton.addEventListener("click", acceptAllPendingMemoryUpdates);
  elements.rejectAllMemoryButton.addEventListener("click", rejectAllPendingMemoryUpdates);

  elements.memoryFields.addEventListener("input", (event) => {
    const key = event.target.dataset.memoryKey;

    if (!key) {
      return;
    }

    context = { ...context, [key]: event.target.value };
    chrome.storage.local.set({ [storageKeys.context]: context });
    updateScore();
    setStatus("Memory saved.", false);
  });

  elements.socialFields.addEventListener("input", (event) => {
    const key = event.target.dataset.socialKey;

    if (!key) {
      return;
    }

    socials = { ...socials, [key]: event.target.value };
    chrome.storage.local.set({ [storageKeys.socials]: socials });
    setStatus("Socials saved.", false);
  });

  elements.projectFields.addEventListener("input", handleProjectFieldChange);
  elements.projectFields.addEventListener("change", handleProjectFieldChange);

  chrome.storage.onChanged.addListener(handleStorageChange);
}

function showSavedInfoTab(tab) {
  const memoryActive = tab === "memory";
  const projectActive = tab === "project";
  const socialsActive = tab === "socials";

  elements.memoryPanel.hidden = !memoryActive;
  elements.projectPanel.hidden = !projectActive;
  elements.socialsPanel.hidden = !socialsActive;
  elements.memoryTab.classList.toggle("active", memoryActive);
  elements.projectTab.classList.toggle("active", projectActive);
  elements.socialsTab.classList.toggle("active", socialsActive);
  elements.memoryTab.setAttribute("aria-selected", String(memoryActive));
  elements.projectTab.setAttribute("aria-selected", String(projectActive));
  elements.socialsTab.setAttribute("aria-selected", String(socialsActive));
}

async function handleStorageChange(changes, areaName) {
  if (areaName !== "local" || !changes[storageKeys.pageContext]?.newValue) {
    return;
  }

  const pageContext = changes[storageKeys.pageContext].newValue;
  const isFresh = pageContext?.extractedAt && Date.now() - pageContext.extractedAt < 10 * 60 * 1000;
  const isNewer = !currentPageContext?.extractedAt || pageContext.extractedAt >= currentPageContext.extractedAt;

  if (!isFresh || !isNewer) {
    return;
  }

  await applyPageContext(pageContext, "Updated from latest highlight.");
}

async function loadState() {
  const stored = await chrome.storage.local.get(Object.values(storageKeys));
  context = { ...emptyContext, ...(stored[storageKeys.context] || {}) };
  socials = { ...emptySocials, ...(stored[storageKeys.socials] || {}) };
  pendingMemoryUpdates = normalizePendingMemoryUpdates(stored[storageKeys.pendingUpdates]);
  installId = stored[storageKeys.installId] || crypto.randomUUID();

  if (!stored[storageKeys.installId]) {
    await setStoredValue(storageKeys.installId, installId);
  }

  for (const [key] of contextFields) {
    const control = document.querySelector(`#memory-${key}`);

    if (control) {
      control.value = context[key] || "";
    }
  }

  for (const [key] of socialFields) {
    const control = document.querySelector(`#social-${key}`);

    if (control) {
      control.value = socials[key] || "";
    }
  }

  elements.inputText.value = stored[storageKeys.draft] || "";
  elements.forcedIntent.value = stored[storageKeys.forcedIntent] || "auto";
  elements.apiEndpoint.value = stored[storageKeys.endpoint] || defaultApiEndpoint;
  elements.betaKey.value = stored[storageKeys.betaKey] || "";
  elements.userInstruction.value = stored[storageKeys.instruction] || "";

  if (stored[storageKeys.lastResult]) {
    setResult(stored[storageKeys.lastResult]);
  }

  renderPendingMemoryUpdates();
  renderMemorySnapshot();
  updateScore();
}

async function loadStoredPageContext() {
  const stored = await chrome.storage.local.get(storageKeys.pageContext);
  const pageContext = stored[storageKeys.pageContext];
  const isFresh = pageContext?.extractedAt && Date.now() - pageContext.extractedAt < 10 * 60 * 1000;

  if (!isFresh) {
    return;
  }

  await applyPageContext(pageContext, "Loaded page context from FM click.");
}

async function grabPageContext() {
  setStatus("Reading page context...", false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    const pageContext = await askContentScriptForPageContext(tab.id);

    if (!pageContext?.latestClientMessage && !pageContext?.visibleText) {
      throw new Error("No useful page context found. Highlight the client message instead.");
    }

    const nextPageContext = { ...pageContext, tabId: tab.id };
    await chrome.storage.local.set({ [storageKeys.pageContext]: nextPageContext });
    await applyPageContext(nextPageContext, "Page context loaded.");
  } catch (error) {
    setStatus(readableError(error), true);
  }
}

async function applyPageContext(pageContext, statusMessage) {
  currentPageContext = pageContext;
  currentClientMemory = await upsertClientMemory(pageContext);
  currentProjectMemory = await upsertProjectMemory(pageContext, currentClientMemory);
  currentSession = await getSessionForPage(pageContext);
  renderProjectValues();
  renderMemorySnapshot();

  const inputText = pageContext.latestClientMessage || pageContext.selectedText || "";

  if (inputText) {
    elements.inputText.value = inputText;
    await setStoredValue(storageKeys.draft, inputText);
  }

  const label = pageContext.threadTitle || pageContext.pageTitle || pageContext.pageUrl || "current page";
  const replyStatus = pageContext.replyBoxFound ? "reply box found" : "no reply box found";
  const clientHint = currentClientMemory?.name ? ` Client: ${currentClientMemory.name}.` : "";
  elements.pageHint.textContent = `From ${pageContext.sourceLabel || pageContext.source || "page"}: ${label} (${replyStatus}).${clientHint}`;
  updateSessionHint();
  updateProjectHint();
  updateReplyActions();
  setStatus(statusMessage, false);
}

async function grabSelection() {
  setStatus("Reading highlighted text...", false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    const data = await getSelectionFromActiveTab(tab);

    if (data.text) {
      const pageContext = await askContentScriptForPageContext(tab.id);
      const nextPageContext = {
        ...buildSelectionPageContext(data),
        ...(pageContext || {}),
        selectedText: data.text,
        latestClientMessage: data.text,
        visibleText: pageContext?.visibleText || data.text,
        tabId: tab.id,
        extractedAt: Date.now()
      };

      await chrome.storage.local.set({ [storageKeys.pageContext]: nextPageContext });
      await applyPageContext(nextPageContext, "Highlighted text loaded.");
      return;
    }

    if (!elements.inputText.value.trim() && data.activeEditableText) {
      elements.inputText.value = data.activeEditableText;
      await setStoredValue(storageKeys.draft, data.activeEditableText);
      elements.pageHint.textContent = `Loaded focused field from: ${data.title || "current page"}`;
      setStatus("Focused field loaded.", false);
      return;
    }

    setStatus("No highlighted text found. Paste the client message here.", false);
  } catch (error) {
    setStatus(readableError(error), true);
  }
}

async function getSelectionFromActiveTab(tab) {
  const liveSelection = await askContentScriptForSelection(tab.id);

  if (liveSelection?.text) {
    return liveSelection;
  }

  const scriptSelection = await executeSelectionReader(tab.id);

  if (scriptSelection?.text || scriptSelection?.activeEditableText) {
    return scriptSelection;
  }

  const cachedSelection = await getCachedSelection(tab.url);

  if (cachedSelection?.text) {
    return cachedSelection;
  }

  return {};
}

async function askContentScriptForSelection(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "freelancer-memory:get-selection" });
  } catch {
    return null;
  }
}

async function askContentScriptForPageContext(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "freelancer-memory:get-page-context" });
  } catch {
    return null;
  }
}

async function executeSelectionReader(tabId) {
  try {
    const [execution] = await chrome.scripting.executeScript({
      target: { tabId },
      func: readPageSelection
    });

    return execution?.result || {};
  } catch {
    return null;
  }
}

async function getCachedSelection(tabUrl) {
  const stored = await chrome.storage.local.get(storageKeys.lastSelection);
  const cached = stored[storageKeys.lastSelection];
  const isFresh = cached?.savedAt && Date.now() - cached.savedAt < 5 * 60 * 1000;
  const isSameTab = !tabUrl || !cached?.url || cached.url === tabUrl;

  return isFresh && isSameTab ? cached : null;
}

function readPageSelection() {
  const activeElement = document.activeElement;
  const selection = getSelectedTextFromPage();
  let activeEditableText = "";

  if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement) {
    activeEditableText = activeElement.value.trim();
  } else if (activeElement?.isContentEditable) {
    activeEditableText = activeElement.textContent?.trim() || "";
  }

  return {
    text: selection.slice(0, 10000),
    activeEditableText: activeEditableText.slice(0, 10000),
    title: document.title,
    url: location.href,
    savedAt: Date.now()
  };
}

function getSelectedTextFromPage() {
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

function buildSelectionPageContext(selection) {
  return {
    source: "generic",
    sourceLabel: "Generic",
    pageUrl: selection.url || "",
    pageTitle: selection.title || "",
    threadTitle: selection.title || "",
    clientName: "",
    clientCompany: "",
    emailOrHandle: "",
    selectedText: selection.text || "",
    activeEditableText: selection.activeEditableText || "",
    latestClientMessage: selection.text || selection.activeEditableText || "",
    recentMessages: selection.text
      ? [
          {
            author: "unknown",
            text: selection.text,
            timestamp: ""
          }
        ]
      : [],
    visibleText: selection.text || selection.activeEditableText || "",
    replyBoxFound: false,
    extractedAt: Date.now()
  };
}

async function generateReply() {
  const inputText = elements.inputText.value.trim();

  if (!inputText) {
    setStatus("Add a client message first.", true);
    elements.inputText.focus();
    return;
  }

  setStatus("Analyzing client and scope...", false);
  elements.generateButton.disabled = true;
  elements.copyButton.disabled = true;
  elements.insertButton.disabled = true;

  try {
    await cleanExpiredSessions();

    if (!currentPageContext) {
      await refreshPageContextSilently();
    }

    const contextPacket = await buildContextPacket("reply", inputText);
    let endpoints = getApiEndpoints(elements.apiEndpoint.value);
    const analysisState = await runAnalysisStep(endpoints, contextPacket);

    if (analysisState.apiBase !== endpoints.base) {
      endpoints = getApiEndpoints(analysisState.apiBase);
      elements.apiEndpoint.value = endpoints.generate;
      await setStoredValue(storageKeys.endpoint, endpoints.generate);
    }

    currentClientMemory = analysisState.clientMemory;
    currentProjectMemory = analysisState.projectMemory;
    contextPacket.clientMemory = currentClientMemory;
    contextPacket.projectMemory = currentProjectMemory;
    renderProjectValues();
    renderMemorySnapshot();
    updateProjectHint();
    renderAnalysisSummary(analysisState.clientAnalysis, analysisState.scopeRisk, analysisState.warnings);
    renderRisk(buildAnalysisRiskDisplay(analysisState.scopeRisk));
    setStatus("Writing reply...", false);

    const payload = {
      context,
      inputText,
      pageContext: contextPacket.pageContext,
      sessionMemory: contextPacket.sessionMemory,
      contextPacket,
      forcedIntent: elements.forcedIntent.value,
      userInstruction: elements.userInstruction.value
    };
    const data = await requestGenerationWithLocalFallback(endpoints.generate, payload);

    setResult(data.result, data.usage);
    renderRisk(buildCombinedRiskDisplay(data.result, analysisState.scopeRisk));
    const memoryResult = await processResultMemoryUpdates(data.result, currentPageContext, currentClientMemory, currentProjectMemory);
    currentClientMemory = memoryResult.clientMemory;
    currentProjectMemory = memoryResult.projectMemory;
    renderProjectValues();
    renderMemorySnapshot();
    currentSession = await saveSessionMemory({
      pageContext: currentPageContext,
      inputText,
      generatedReply: data.result.reply,
      userInstruction: elements.userInstruction.value,
      nextStep: data.result.recommendedNextStep,
      facts: buildSessionFacts(currentPageContext, data.result),
      clientMemory: currentClientMemory,
      projectMemory: currentProjectMemory
    });
    updateSessionHint();
    updateProjectHint();
    updateReplyActions();
    await chrome.storage.local.set({
      [storageKeys.draft]: inputText,
      [storageKeys.lastResult]: {
        result: data.result,
        usage: data.usage || null
      }
    });
    setStatus(getReplyReadyStatus(mergeMemoryResults(analysisState.memoryResult, memoryResult), analysisState.warnings), false);
  } catch (error) {
    setStatus(readableError(error), true);
  } finally {
    elements.generateButton.disabled = false;
    updateReplyActions();
  }
}

async function runAnalysisStep(endpoints, contextPacket) {
  const state = {
    apiBase: endpoints.base,
    clientAnalysis: null,
    scopeRisk: null,
    clientMemory: currentClientMemory,
    projectMemory: currentProjectMemory,
    memoryResult: {
      autoSavedCount: 0,
      pendingCount: 0
    },
    warnings: []
  };

  try {
    const data = await requestAnalyzeClient(endpoints.analyzeClient, contextPacket);
    state.clientAnalysis = data.result;
  } catch (error) {
    const fallbackBase = getLocalFallbackApiBase(endpoints.base);

    if (fallbackBase) {
      try {
        const fallbackEndpoints = getApiEndpoints(fallbackBase);
        const data = await requestAnalyzeClient(fallbackEndpoints.analyzeClient, contextPacket);
        state.clientAnalysis = data.result;
        state.apiBase = fallbackBase;
      } catch (fallbackError) {
        state.warnings.push(`Client analysis skipped: ${readableError(fallbackError)}`);
      }
    } else {
      state.warnings.push(`Client analysis skipped: ${readableError(error)}`);
    }
  }

  const scopeEndpoints = getApiEndpoints(state.apiBase);

  try {
    const data = await requestAnalyzeScopeRisk(scopeEndpoints.analyzeScopeRisk, contextPacket);
    state.scopeRisk = data.result;
  } catch (error) {
    state.warnings.push(`Scope analysis skipped: ${readableError(error)}`);
  }

  state.memoryResult = await processAnalysisMemoryUpdates(
    state.clientAnalysis,
    state.scopeRisk,
    currentPageContext,
    state.clientMemory,
    state.projectMemory
  );
  state.clientMemory = state.memoryResult.clientMemory;
  state.projectMemory = state.memoryResult.projectMemory;

  return state;
}

async function requestGenerationWithLocalFallback(endpoint, payload) {
  try {
    return await requestGenerateReply(endpoint, payload);
  } catch (error) {
    const fallbackEndpoint = getLocalFallbackEndpoint(endpoint);

    if (!fallbackEndpoint) {
      throw error;
    }

    setStatus("Port 3000 failed. Trying 3001...", false);
    const data = await requestGenerateReply(fallbackEndpoint, payload);
    elements.apiEndpoint.value = fallbackEndpoint;
    await setStoredValue(storageKeys.endpoint, fallbackEndpoint);
    return data;
  }
}

async function requestAnalyzeClient(endpoint, contextPacket) {
  return requestApiResult(endpoint, contextPacket, "Client analysis failed.");
}

async function requestAnalyzeScopeRisk(endpoint, contextPacket) {
  return requestApiResult(endpoint, contextPacket, "Scope analysis failed.");
}

async function requestGenerateReply(endpoint, payload) {
  return requestApiResult(endpoint, payload, "Generation failed.");
}

async function requestApiResult(endpoint, payload, fallbackMessage) {
  const headers = {
    "Content-Type": "application/json"
  };
  const betaKey = elements.betaKey?.value.trim();

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
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

function setResult(nextResult, usage = null) {
  result = nextResult.result ? nextResult.result : nextResult;
  const nextUsage = nextResult.usage || usage;
  const reply = result?.reply || "";

  elements.replyOutput.value = reply;
  elements.intentBadge.textContent = (result?.detectedIntent || "waiting").replaceAll("_", " ");
  elements.confidenceBadge.textContent = result?.confidence ? `${Math.round(result.confidence * 100)}% confidence` : "auto";
  renderRisk(result);
  updateReplyActions();

  if (result) {
    elements.replyMeta.hidden = false;
    elements.replyMeta.textContent = [
      `Risk: ${result.riskLevel || "none"}${result.riskReason ? ` - ${result.riskReason}` : ""}`,
      result.scopeAssessment?.outOfScopeItems?.length ? `Out of scope: ${result.scopeAssessment.outOfScopeItems.join(", ")}` : "",
      result.scopeAssessment?.proposedScope?.length ? `Proposed scope: ${result.scopeAssessment.proposedScope.join(", ")}` : "",
      result.memoryUpdates?.needsConfirmation?.length ? `Confirm: ${result.memoryUpdates.needsConfirmation.join(", ")}` : "",
      result.memoryUpdates?.contradictions?.length ? `Contradictions: ${result.memoryUpdates.contradictions.join(", ")}` : "",
      `Next: ${result.recommendedNextStep || "No next step returned."}`,
      `Missing: ${result.missingInfo?.length ? result.missingInfo.join(", ") : "Nothing obvious."}`,
      `Used: ${result.contextUsed?.length ? result.contextUsed.join(", ") : "No context reported."}`,
      nextUsage?.totalTokens ? `Tokens: ${nextUsage.totalTokens}` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }
}

function renderRisk(result) {
  const level = result?.riskLevel || "none";
  const reason = result?.riskReason || "";
  const shouldShow = Boolean(result && (level !== "none" || reason));

  elements.riskBox.hidden = !shouldShow;

  if (!shouldShow) {
    return;
  }

  elements.riskBox.dataset.level = level;
  elements.riskTitle.textContent = `${level.replaceAll("_", " ")} risk`;
  elements.riskReason.textContent = reason || "No obvious deal risk.";
}

function renderAnalysisSummary(clientAnalysis, scopeRisk, warnings = []) {
  if (!elements.analysisBox) {
    return;
  }

  const groups = [
    {
      label: "Money / timing",
      items: normalizeStringList([
        clientAnalysis?.projectMemoryPatch?.budget ? `Budget: ${clientAnalysis.projectMemoryPatch.budget}` : "",
        clientAnalysis?.projectMemoryPatch?.timeline ? `Timeline: ${clientAnalysis.projectMemoryPatch.timeline}` : "",
        clientAnalysis?.projectMemoryPatch?.paymentTerms ? `Payment: ${clientAnalysis.projectMemoryPatch.paymentTerms}` : ""
      ])
    },
    {
      label: "Scope",
      items: normalizeStringList([
        ...(clientAnalysis?.acceptedScope || []).map((item) => `Accepted: ${item}`),
        ...(clientAnalysis?.proposedScope || []).map((item) => `Proposed: ${item}`),
        ...(scopeRisk?.outOfScopeItems || []).map((item) => `Out of scope: ${item}`)
      ])
    },
    {
      label: "Risk",
      kind: "risk",
      items: normalizeStringList([
        scopeRisk?.riskReason || "",
        ...(clientAnalysis?.risks || []),
        ...(scopeRisk?.contradictions || []).map((item) => `Contradiction: ${item}`),
        ...(warnings || [])
      ])
    }
  ];
  const visibleGroups = groups.filter((group) => group.items.length);

  if (!visibleGroups.length) {
    elements.analysisBox.hidden = true;
    elements.analysisBox.replaceChildren();
    return;
  }

  const title = document.createElement("h3");
  title.textContent = "Analysis";
  elements.analysisBox.replaceChildren(
    title,
    ...visibleGroups.map((group) => {
      const wrapper = document.createElement("div");
      wrapper.className = "analysis-group";
      const label = document.createElement("strong");
      label.textContent = group.label;
      wrapper.append(label);

      for (const item of group.items.slice(0, 5)) {
        const row = document.createElement("span");
        row.dataset.kind = group.kind || "";
        row.textContent = item;
        wrapper.append(row);
      }

      return wrapper;
    })
  );
  elements.analysisBox.hidden = false;
}

function buildAnalysisRiskDisplay(scopeRisk) {
  if (!scopeRisk) {
    return null;
  }

  return {
    riskLevel: scopeRisk.riskLevel || "none",
    riskReason: scopeRisk.riskReason || scopeRisk.suggestedAction || ""
  };
}

function buildCombinedRiskDisplay(generatedResult, scopeRisk) {
  const generatedLevel = generatedResult?.riskLevel || "none";
  const analysisLevel = scopeRisk?.riskLevel || "none";
  const riskLevel = getHigherRiskLevel(generatedLevel, analysisLevel);
  const reasons = normalizeStringList([generatedResult?.riskReason || "", scopeRisk?.riskReason || "", scopeRisk?.suggestedAction || ""]);

  return {
    riskLevel,
    riskReason: reasons.join(" ")
  };
}

function getHigherRiskLevel(first, second) {
  const order = ["none", "low", "medium", "high"];
  const firstIndex = order.indexOf(first);
  const secondIndex = order.indexOf(second);

  return order[Math.max(firstIndex, secondIndex, 0)] || "none";
}

async function copyReply() {
  const reply = elements.replyOutput.value.trim();

  if (!reply) {
    return;
  }

  try {
    await navigator.clipboard.writeText(reply);
    setStatus("Copied.", false);
  } catch {
    elements.replyOutput.select();
    document.execCommand("copy");
    window.getSelection()?.removeAllRanges();
    setStatus("Copied.", false);
  }
}

async function insertReplyIntoPage() {
  const reply = elements.replyOutput.value.trim();

  if (!reply) {
    return;
  }

  setStatus("Inserting reply...", false);

  try {
    const tabId = await getTargetTabId();

    if (!tabId) {
      throw new Error("No active tab found.");
    }

    const response = await chrome.tabs.sendMessage(tabId, {
      type: "freelancer-memory:insert-reply",
      text: reply
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Could not insert reply.");
    }

    if (currentSession) {
      currentSession = await saveSessionMemory({
        pageContext: currentPageContext,
        inputText: elements.inputText.value.trim(),
        generatedReply: reply,
        userInstruction: elements.userInstruction.value,
        nextStep: result?.recommendedNextStep || currentSession.nextStep,
        facts: currentSession.facts || [],
        clientMemory: currentClientMemory,
        projectMemory: currentProjectMemory
      });
    }

    setStatus("Inserted. Review before sending.", false);
  } catch (error) {
    setStatus(readableError(error), true);
  }
}

async function refreshPageContextSilently() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tab?.id) {
      return;
    }

    const pageContext = await askContentScriptForPageContext(tab.id);

    if (pageContext?.latestClientMessage || pageContext?.visibleText) {
      currentPageContext = { ...pageContext, tabId: tab.id };
      currentClientMemory = await upsertClientMemory(currentPageContext);
      currentProjectMemory = await upsertProjectMemory(currentPageContext, currentClientMemory);
      await chrome.storage.local.set({ [storageKeys.pageContext]: currentPageContext });
      renderMemorySnapshot();
    }
  } catch {
    // Generation still works with pasted text only.
  }
}

async function getTargetTabId() {
  const storedTabId = currentPageContext?.tabId;

  if (storedTabId) {
    try {
      await chrome.tabs.get(storedTabId);
      return storedTabId;
    } catch {
      // Fall back to the currently active tab.
    }
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id || null;
}

async function buildContextPacket(action, inputText) {
  if (!currentPageContext) {
    await refreshPageContextSilently();
  }

  const pageContext = sanitizePageContext(currentPageContext, inputText);
  currentClientMemory = await upsertClientMemory(pageContext);
  currentProjectMemory = await upsertProjectMemory(pageContext, currentClientMemory);
  currentSession = await getSessionForPage(pageContext);
  renderMemorySnapshot();

  return {
    action,
    source: normalizeSource(pageContext.source),
    businessMemory: {
      ...context,
      updatedAt: new Date().toISOString()
    },
    clientMemory: currentClientMemory,
    projectMemory: currentProjectMemory,
    sessionMemory: currentSession,
    pageContext,
    userInstruction: elements.userInstruction.value.trim()
  };
}

function sanitizePageContext(pageContext, inputText) {
  const fallbackPageContext = {
    source: "generic",
    sourceLabel: "Generic",
    pageUrl: "",
    pageTitle: "",
    threadTitle: "",
    clientName: "",
    clientCompany: "",
    emailOrHandle: "",
    selectedText: "",
    activeEditableText: "",
    latestClientMessage: inputText,
    recentMessages: [],
    visibleText: inputText,
    replyBoxFound: false,
    extractedAt: Date.now()
  };
  const next = { ...fallbackPageContext, ...(pageContext || {}) };

  return {
    ...next,
    source: normalizeSource(next.source),
    selectedText: trimStorageText(next.selectedText, 10000),
    activeEditableText: trimStorageText(next.activeEditableText, 10000),
    latestClientMessage: trimStorageText(next.latestClientMessage || inputText, 10000),
    visibleText: trimStorageText(next.visibleText || inputText, 12000),
    recentMessages: Array.isArray(next.recentMessages)
      ? next.recentMessages
          .map((message) => ({
            author: trimStorageText(message.author || "unknown", 120),
            text: trimStorageText(message.text || "", 2000),
            timestamp: trimStorageText(message.timestamp || "", 120)
          }))
          .filter((message) => message.text)
          .slice(-10)
      : []
  };
}

async function cleanExpiredSessions() {
  const sessions = await loadSessions();
  const now = Date.now();
  const freshSessions = sessions.filter((session) => session.expiresAt > now);

  if (freshSessions.length !== sessions.length) {
    await chrome.storage.local.set({ [storageKeys.sessions]: freshSessions });
  }
}

async function loadSessions() {
  const stored = await chrome.storage.local.get(storageKeys.sessions);
  const sessions = stored[storageKeys.sessions];

  return Array.isArray(sessions) ? sessions : [];
}

async function getSessionForPage(pageContext) {
  if (!pageContext?.pageUrl) {
    return null;
  }

  const sessions = await loadSessions();
  const now = Date.now();
  const pageKey = getPageKey(pageContext);
  const session =
    sessions.find((item) => item.pageUrl === pageContext.pageUrl && item.expiresAt > now) ||
    sessions.find((item) => getPageKey(item) === pageKey && item.expiresAt > now) ||
    null;

  return session;
}

async function saveSessionMemory({ pageContext, inputText, generatedReply, userInstruction, nextStep, facts, clientMemory, projectMemory }) {
  const now = Date.now();
  const domain = getDomain(pageContext?.pageUrl || "");
  const pageUrl = pageContext?.pageUrl || "";
  const existing = await getSessionForPage(pageContext);
  const nextSession = {
    id: existing?.id || crypto.randomUUID(),
    domain,
    pageUrl,
    clientId: clientMemory?.id || existing?.clientId || "",
    projectId: projectMemory?.id || existing?.projectId || "",
    facts: mergeFacts(existing?.facts || [], facts || []),
    lastClientMessage: inputText.slice(0, 3000),
    lastGeneratedReply: generatedReply.slice(0, 3000),
    lastUserInstruction: userInstruction.slice(0, 1000),
    nextStep: (nextStep || "").slice(0, 1000),
    createdAt: existing?.createdAt || now,
    expiresAt: now + sessionTtlMs
  };
  const sessions = await loadSessions();
  const pageKey = getPageKey(nextSession);
  const nextSessions = [nextSession, ...sessions.filter((item) => item.id !== nextSession.id && getPageKey(item) !== pageKey)]
    .filter((item) => item.expiresAt > now)
    .slice(0, 20);

  await chrome.storage.local.set({ [storageKeys.sessions]: nextSessions });
  return nextSession;
}

function buildSessionFacts(pageContext, generatedResult) {
  return [
    pageContext?.threadTitle ? `Thread: ${pageContext.threadTitle}` : "",
    pageContext?.pageTitle ? `Page: ${pageContext.pageTitle}` : "",
    generatedResult?.detectedIntent ? `Last intent: ${generatedResult.detectedIntent}` : "",
    generatedResult?.recommendedNextStep ? `Next step: ${generatedResult.recommendedNextStep}` : ""
  ].filter(Boolean);
}

function mergeFacts(existingFacts, nextFacts) {
  return Array.from(new Set([...existingFacts, ...nextFacts].map((fact) => fact.trim()).filter(Boolean))).slice(-12);
}

async function loadClientMemories() {
  const stored = await chrome.storage.local.get(storageKeys.clients);
  const clients = stored[storageKeys.clients];

  return Array.isArray(clients) ? clients : [];
}

async function saveClientMemory(clientMemory) {
  if (!clientMemory?.id) {
    return null;
  }

  const clients = await loadClientMemories();
  const nextClient = {
    ...clientMemory,
    notes: normalizeStringList(clientMemory.notes),
    updatedAt: new Date().toISOString()
  };
  const nextClients = [nextClient, ...clients.filter((client) => client.id !== nextClient.id)].slice(0, 100);

  await chrome.storage.local.set({ [storageKeys.clients]: nextClients });
  return nextClient;
}

async function loadProjectMemories() {
  const stored = await chrome.storage.local.get(storageKeys.projects);
  const projects = stored[storageKeys.projects];

  return Array.isArray(projects) ? projects : [];
}

async function saveProjectMemory(projectMemory) {
  if (!projectMemory?.id) {
    return null;
  }

  const projects = await loadProjectMemories();
  const nextProject = normalizeProjectMemory(projectMemory);
  const nextProjects = [nextProject, ...projects.filter((project) => project.id !== nextProject.id)].slice(0, 100);

  await chrome.storage.local.set({ [storageKeys.projects]: nextProjects });
  return nextProject;
}

async function upsertProjectMemory(pageContext, clientMemory) {
  if (!shouldTrackProjectMemory(pageContext, clientMemory)) {
    return null;
  }

  const now = new Date().toISOString();
  const projects = await loadProjectMemories();
  const title = trimStorageText(pageContext.threadTitle || pageContext.pageTitle || "Client project", 160);
  const pageKey = getPageKey(pageContext);
  const existing =
    projects.find((project) => clientMemory?.id && project.clientId === clientMemory.id && project.sourceUrls?.some((url) => getPageKey(url) === pageKey)) ||
    projects.find((project) => clientMemory?.id && project.clientId === clientMemory.id && normalizeClientKey(project.title) === normalizeClientKey(title)) ||
    projects.find((project) => pageKey && project.sourceUrls?.some((url) => getPageKey(url) === pageKey)) ||
    null;

  const nextProject = normalizeProjectMemory({
    id: existing?.id || crypto.randomUUID(),
    clientId: clientMemory?.id || existing?.clientId || "",
    title: existing?.title || title,
    budget: existing?.budget || "",
    timeline: existing?.timeline || "",
    status: existing?.status || "discovery",
    includedScope: existing?.includedScope || [],
    excludedScope: existing?.excludedScope || [],
    paymentTerms: existing?.paymentTerms || "",
    agreedFacts: mergeFacts(existing?.agreedFacts || [], buildInitialProjectFacts(pageContext)),
    risks: existing?.risks || [],
    nextStep: existing?.nextStep || "",
    sourceUrls: mergeFacts(existing?.sourceUrls || [], pageContext.pageUrl ? [pageContext.pageUrl] : []),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });

  await saveProjectMemory(nextProject);
  return nextProject;
}

function shouldTrackProjectMemory(pageContext, clientMemory) {
  if (!pageContext?.pageUrl && !pageContext?.threadTitle && !pageContext?.latestClientMessage) {
    return false;
  }

  if (pageContext.source === "x") {
    return false;
  }

  if (pageContext.source === "linkedin") {
    return pageContext.pageUrl?.includes("/messaging") || Boolean(pageContext.replyBoxFound && clientMemory);
  }

  return Boolean(clientMemory || pageContext.replyBoxFound || ["gmail", "upwork", "fiverr", "whatsapp"].includes(pageContext.source));
}

function buildInitialProjectFacts(pageContext) {
  return [
    pageContext.threadTitle ? `Thread: ${pageContext.threadTitle}` : "",
    pageContext.latestClientMessage ? `Latest ask: ${trimStorageText(pageContext.latestClientMessage, 220)}` : ""
  ].filter(Boolean);
}

function normalizeProjectMemory(project) {
  const now = new Date().toISOString();

  return {
    id: project?.id || crypto.randomUUID(),
    clientId: project?.clientId || "",
    title: trimStorageText(project?.title || "Client project", 160),
    budget: trimStorageText(project?.budget || "", 160),
    timeline: trimStorageText(project?.timeline || "", 160),
    status: projectStatuses.includes(project?.status) ? project.status : "discovery",
    includedScope: normalizeStringList(project?.includedScope),
    excludedScope: normalizeStringList(project?.excludedScope),
    paymentTerms: trimStorageText(project?.paymentTerms || "", 240),
    agreedFacts: normalizeStringList(project?.agreedFacts),
    risks: normalizeStringList(project?.risks),
    nextStep: trimStorageText(project?.nextStep || "", 240),
    sourceUrls: normalizeStringList(project?.sourceUrls),
    createdAt: project?.createdAt || now,
    updatedAt: now
  };
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => trimStorageText(item, 240)).filter(Boolean))).slice(-20);
  }

  return String(value || "")
    .split(/\n+/)
    .map((item) => trimStorageText(item, 240))
    .filter(Boolean)
    .slice(-20);
}

async function processAnalysisMemoryUpdates(clientAnalysis, scopeRisk, pageContext, clientMemory, projectMemory) {
  const pendingUpdates = [];
  const clientPatch = clientAnalysis?.clientMemoryPatch || null;
  const projectPatch = clientAnalysis?.projectMemoryPatch || null;
  let nextClientMemory = await applyClientAnalysisPatch(clientPatch, pageContext, clientMemory, pendingUpdates);
  let nextProjectMemory = await ensureProjectMemoryForAnalysis(pageContext, nextClientMemory, projectMemory, projectPatch, scopeRisk);
  let autoSavedCount = 0;

  if (nextClientMemory && nextClientMemory !== clientMemory) {
    autoSavedCount += 1;
  }

  if (nextProjectMemory) {
    const projectResult = await applyProjectAnalysisPatch(nextProjectMemory, projectPatch, clientAnalysis, scopeRisk, pendingUpdates);
    nextProjectMemory = projectResult.projectMemory;
    autoSavedCount += projectResult.autoSavedCount;
  }

  const pendingCount = await addPendingMemoryUpdates(pendingUpdates);

  return {
    clientMemory: nextClientMemory,
    projectMemory: nextProjectMemory,
    autoSavedCount,
    pendingCount
  };
}

async function applyClientAnalysisPatch(patch, pageContext, clientMemory, pendingUpdates) {
  if (!patch) {
    return clientMemory;
  }

  const notes = normalizeStringList(patch.notes || []);
  const autoNotes = notes.filter((note) => !isImportantMemoryText(note));
  const reviewNotes = notes.filter(isImportantMemoryText);
  const hasIdentity = patch.name || patch.company || patch.emailOrHandle || clientMemory?.id;
  let nextClientMemory = clientMemory;

  if (hasIdentity) {
    const now = new Date().toISOString();
    const base =
      clientMemory || {
        id: crypto.randomUUID(),
        name: patch.name || patch.emailOrHandle || "Unknown client",
        company: "",
        emailOrHandle: "",
        source: normalizeSource(pageContext?.source),
        lastSeenUrl: pageContext?.pageUrl || "",
        notes: [],
        status: "lead",
        createdAt: now,
        updatedAt: now
      };
    const nextStatus = patch.status && patch.status !== "" ? patch.status : base.status;

    nextClientMemory = await saveClientMemory({
      ...base,
      name: patch.name || base.name,
      company: patch.company || base.company,
      emailOrHandle: patch.emailOrHandle || base.emailOrHandle,
      source: normalizeSource(base.source || pageContext?.source),
      lastSeenUrl: pageContext?.pageUrl || base.lastSeenUrl,
      notes: mergeFacts(base.notes || [], autoNotes),
      status: nextStatus
    });
  }

  for (const note of reviewNotes) {
    pendingUpdates.push(
      buildPendingMemoryUpdate({
        target: "client",
        targetId: nextClientMemory?.id || "",
        field: "notes",
        mode: "append",
        currentValue: nextClientMemory?.notes || [],
        proposedValue: [note],
        reason: "Analysis found a client note that touches money, scope, timing, payment, or risk."
      })
    );
  }

  return nextClientMemory;
}

async function ensureProjectMemoryForAnalysis(pageContext, clientMemory, projectMemory, projectPatch, scopeRisk) {
  if (projectMemory) {
    return projectMemory;
  }

  const existing = await upsertProjectMemory(pageContext, clientMemory);

  if (existing) {
    return existing;
  }

  const hasProjectSignal = Boolean(
    projectPatch?.title ||
      projectPatch?.budget ||
      projectPatch?.timeline ||
      projectPatch?.paymentTerms ||
      projectPatch?.nextStep ||
      normalizeStringList(projectPatch?.includedScope || []).length ||
      normalizeStringList(projectPatch?.excludedScope || []).length ||
      normalizeStringList(projectPatch?.agreedFacts || []).length ||
      normalizeStringList(projectPatch?.risks || []).length ||
      normalizeStringList(scopeRisk?.proposedScopeItems || []).length ||
      normalizeStringList(scopeRisk?.outOfScopeItems || []).length
  );

  if (!hasProjectSignal) {
    return null;
  }

  return saveProjectMemory(
    normalizeProjectMemory({
      clientId: clientMemory?.id || "",
      title: projectPatch?.title || pageContext?.threadTitle || pageContext?.pageTitle || "Client project",
      status: projectPatch?.status || "discovery",
      nextStep: projectPatch?.nextStep || "",
      sourceUrls: pageContext?.pageUrl ? [pageContext.pageUrl] : []
    })
  );
}

async function applyProjectAnalysisPatch(projectMemory, projectPatch, clientAnalysis, scopeRisk, pendingUpdates) {
  const autoFacts = [];
  const patch = projectPatch || {};

  addPendingReplaceUpdate(pendingUpdates, projectMemory, "budget", patch.budget, "Analysis found budget. Confirm before saving.");
  addPendingReplaceUpdate(pendingUpdates, projectMemory, "timeline", patch.timeline, "Analysis found timeline. Confirm before saving.");
  addPendingReplaceUpdate(
    pendingUpdates,
    projectMemory,
    "paymentTerms",
    patch.paymentTerms,
    "Analysis found payment terms. Confirm before saving."
  );

  for (const fact of normalizeStringList(patch.agreedFacts || [])) {
    const classified = classifyProjectFact(fact);

    if (!classified.reviewWorthy) {
      autoFacts.push(fact);
      continue;
    }

    pendingUpdates.push(
      buildPendingMemoryUpdate({
        target: "project",
        targetId: projectMemory.id,
        field: classified.field,
        mode: classified.mode,
        currentValue: projectMemory[classified.field],
        proposedValue: classified.value,
        reason: classified.reason
      })
    );
  }

  pendingUpdates.push(
    ...buildPendingListUpdates(projectMemory, "includedScope", patch.includedScope, "Analysis found included scope. Confirm before saving."),
    ...buildPendingListUpdates(
      projectMemory,
      "includedScope",
      clientAnalysis?.acceptedScope || [],
      "Analysis found accepted scope. Confirm before saving."
    ),
    ...buildPendingListUpdates(
      projectMemory,
      "includedScope",
      mergeFacts(clientAnalysis?.proposedScope || [], scopeRisk?.proposedScopeItems || []),
      "This looks like proposed scope, not accepted scope yet. Confirm before saving as included."
    ),
    ...buildPendingListUpdates(projectMemory, "excludedScope", patch.excludedScope, "Analysis found excluded scope. Confirm it."),
    ...buildPendingListUpdates(
      projectMemory,
      "excludedScope",
      mergeFacts(clientAnalysis?.explicitlyExcludedScope || [], scopeRisk?.outOfScopeItems || []),
      "Analysis found out-of-scope work. Confirm before saving."
    ),
    ...buildPendingListUpdates(projectMemory, "risks", buildAnalysisRiskUpdates(clientAnalysis, scopeRisk, patch), "Analysis found risk. Review before saving.")
  );

  const nextStep = clientAnalysis?.followUpNextStep || scopeRisk?.suggestedAction || patch.nextStep || "";
  const nextProjectMemory = await saveProjectMemory({
    ...projectMemory,
    title: patch.title || projectMemory.title,
    status: projectStatuses.includes(patch.status) && patch.status !== "" ? patch.status : projectMemory.status,
    agreedFacts: mergeFacts(projectMemory.agreedFacts || [], autoFacts),
    nextStep: nextStep || projectMemory.nextStep,
    updatedAt: new Date().toISOString()
  });

  return {
    projectMemory: nextProjectMemory,
    autoSavedCount: autoFacts.length + (nextStep ? 1 : 0)
  };
}

function addPendingReplaceUpdate(pendingUpdates, projectMemory, field, value, reason) {
  const proposedValue = trimStorageText(value || "", field === "paymentTerms" ? 240 : 160);

  if (!projectMemory?.id || !proposedValue || proposedValue === (projectMemory[field] || "")) {
    return;
  }

  pendingUpdates.push(
    buildPendingMemoryUpdate({
      target: "project",
      targetId: projectMemory.id,
      field,
      mode: "replace",
      currentValue: projectMemory[field],
      proposedValue,
      reason
    })
  );
}

function buildAnalysisRiskUpdates(clientAnalysis, scopeRisk, projectPatch) {
  const clientContradictions = (clientAnalysis?.contradictions || []).map((item) =>
    [`Contradiction in ${item.field || "memory"}`, item.savedValue ? `saved: ${item.savedValue}` : "", item.newValue ? `new: ${item.newValue}` : "", item.reason]
      .filter(Boolean)
      .join(" - ")
  );

  return mergeFacts(
    mergeFacts(projectPatch?.risks || [], clientAnalysis?.risks || []),
    [
      ...(scopeRisk?.riskLevel && scopeRisk.riskLevel !== "none" && scopeRisk.riskReason ? [`${scopeRisk.riskLevel}: ${scopeRisk.riskReason}`] : []),
      ...(scopeRisk?.outOfScopeItems || []).map((item) => `Possible out-of-scope item: ${item}`),
      ...(clientAnalysis?.needsConfirmation || []).map((item) => `Needs confirmation: ${item}`),
      ...(scopeRisk?.needsConfirmation || []).map((item) => `Needs confirmation: ${item}`),
      ...clientContradictions,
      ...(scopeRisk?.contradictions || []).map((item) => `Contradiction: ${item}`)
    ]
  );
}

async function processResultMemoryUpdates(result, pageContext, clientMemory, projectMemory) {
  const updates = result?.memoryUpdates || {};
  const project = projectMemory || (await upsertProjectMemory(pageContext, clientMemory));
  const pendingUpdates = [];
  let nextClientMemory = clientMemory;
  let nextProjectMemory = project;
  const autoClientFacts = normalizeStringList(updates.clientFacts || []).filter((fact) => !isImportantMemoryText(fact));
  const reviewClientFacts = normalizeStringList(updates.clientFacts || []).filter(isImportantMemoryText);
  const autoProjectFacts = [];

  if (nextClientMemory?.id && autoClientFacts.length) {
    nextClientMemory = await saveClientMemory({
      ...nextClientMemory,
      notes: mergeFacts(nextClientMemory.notes || [], autoClientFacts)
    });
  }

  for (const fact of reviewClientFacts) {
    pendingUpdates.push(
      buildPendingMemoryUpdate({
        target: "client",
        targetId: nextClientMemory?.id || "",
        field: "notes",
        mode: "append",
        currentValue: nextClientMemory?.notes || [],
        proposedValue: [fact],
        reason: "This client note touches money, scope, timing, payment, or risk."
      })
    );
  }

  if (!nextProjectMemory) {
    const pendingCount = await addPendingMemoryUpdates(pendingUpdates);
    return {
      clientMemory: nextClientMemory,
      projectMemory: null,
      autoSavedCount: autoClientFacts.length,
      pendingCount
    };
  }

  for (const fact of normalizeStringList(updates.projectFacts || [])) {
    const classified = classifyProjectFact(fact);

    if (!classified.reviewWorthy) {
      autoProjectFacts.push(fact);
      continue;
    }

    pendingUpdates.push(
      buildPendingMemoryUpdate({
        target: "project",
        targetId: nextProjectMemory.id,
        field: classified.field,
        mode: classified.mode,
        currentValue: nextProjectMemory[classified.field],
        proposedValue: classified.value,
        reason: classified.reason
      })
    );
  }

  pendingUpdates.push(
    ...buildPendingListUpdates(nextProjectMemory, "includedScope", updates.scopeIncluded, "Included scope should be confirmed before it becomes memory."),
    ...buildPendingListUpdates(
      nextProjectMemory,
      "includedScope",
      result?.scopeAssessment?.proposedScope || [],
      "This is proposed scope, not accepted scope yet. Confirm before saving as included."
    ),
    ...buildPendingListUpdates(nextProjectMemory, "excludedScope", updates.scopeExcluded, "Excluded scope protects the deal. Confirm it."),
    ...buildPendingListUpdates(nextProjectMemory, "risks", buildRiskUpdates(result, updates), "Risk flags should not be silently saved.")
  );

  const shouldSaveProject = autoProjectFacts.length || result?.recommendedNextStep;

  if (shouldSaveProject) {
    nextProjectMemory = await saveProjectMemory({
      ...nextProjectMemory,
      agreedFacts: mergeFacts(nextProjectMemory.agreedFacts || [], autoProjectFacts),
      nextStep: result?.recommendedNextStep || nextProjectMemory.nextStep,
      updatedAt: new Date().toISOString()
    });
  }

  const pendingCount = await addPendingMemoryUpdates(pendingUpdates);

  return {
    clientMemory: nextClientMemory,
    projectMemory: nextProjectMemory,
    autoSavedCount: autoClientFacts.length + autoProjectFacts.length + (result?.recommendedNextStep ? 1 : 0),
    pendingCount
  };
}

function classifyProjectFact(fact) {
  const text = trimStorageText(fact, 240);
  const lower = text.toLowerCase();
  const afterColon = text.includes(":") ? text.split(":").slice(1).join(":").trim() : text;

  if (/\bbudget\b|\bprice\b|\bcost\b|\bquote\b|\brate\b|\$\s?\d|\busd\b|\binr\b|\beur\b|\bgbp\b/.test(lower)) {
    return {
      reviewWorthy: true,
      field: "budget",
      mode: "replace",
      value: afterColon,
      reason: "Budget changes need confirmation."
    };
  }

  if (/\btimeline\b|\bdeadline\b|\bdue\b|\bdelivery\b|\blaunch\b|\bby\s+\w+|\b\d+\s?(days?|weeks?|months?)\b/.test(lower)) {
    return {
      reviewWorthy: true,
      field: "timeline",
      mode: "replace",
      value: afterColon,
      reason: "Timeline changes need confirmation."
    };
  }

  if (/\bpayment\b|\bdeposit\b|\bupfront\b|\bmilestone\b|\bnet\s?\d+\b|\binvoice\b|\brefund\b/.test(lower)) {
    return {
      reviewWorthy: true,
      field: "paymentTerms",
      mode: "replace",
      value: afterColon,
      reason: "Payment terms should be reviewed before saving."
    };
  }

  if (/\bexcluded?\b|\bnot included\b|\bout of scope\b|\bwon't include\b|\bdoes not include\b/.test(lower)) {
    return {
      reviewWorthy: true,
      field: "excludedScope",
      mode: "append",
      value: [afterColon],
      reason: "Excluded scope protects the deal. Confirm it."
    };
  }

  if (/\bincluded?\b|\bscope\b|\bdeliverables?\b|\brevisions?\b|\bpages?\b|\bfeatures?\b/.test(lower)) {
    return {
      reviewWorthy: true,
      field: "includedScope",
      mode: "append",
      value: [afterColon],
      reason: "Included scope should be confirmed before it becomes memory."
    };
  }

  if (/\brisk\b|\bred flag\b|\bblocked\b|\bblocker\b|\bconcern\b|\bdelay\b|\blate\b|\bcreep\b|\bunpaid\b/.test(lower)) {
    return {
      reviewWorthy: true,
      field: "risks",
      mode: "append",
      value: [afterColon],
      reason: "Risk flags should not be silently saved."
    };
  }

  return {
    reviewWorthy: false,
    field: "agreedFacts",
    mode: "append",
    value: [text],
    reason: ""
  };
}

function isImportantMemoryText(value) {
  const text = String(value || "").toLowerCase();

  return /\bbudget\b|\bprice\b|\bcost\b|\bquote\b|\brate\b|\$\s?\d|\btimeline\b|\bdeadline\b|\bdue\b|\bpayment\b|\bdeposit\b|\bupfront\b|\bmilestone\b|\bscope\b|\bincluded?\b|\bexcluded?\b|\bout of scope\b|\brisk\b|\bred flag\b|\bcreep\b|\bunpaid\b/.test(text);
}

function buildRiskUpdates(result, updates) {
  const updateRisks = normalizeStringList(updates?.risks || []);
  const generatedRisk =
    result?.riskLevel && result.riskLevel !== "none" && result.riskReason ? [`${result.riskLevel}: ${result.riskReason}`] : [];
  const scopeRisks = normalizeStringList([
    ...(result?.scopeAssessment?.outOfScopeItems || []).map((item) => `Possible out-of-scope item: ${item}`),
    ...(updates?.needsConfirmation || []).map((item) => `Needs confirmation: ${item}`),
    ...(updates?.contradictions || []).map((item) => `Contradiction: ${item}`),
    ...(result?.scopeAssessment?.contradictions || []).map((item) => `Contradiction: ${item}`)
  ]);

  return mergeFacts(mergeFacts(updateRisks, generatedRisk), scopeRisks);
}

function buildPendingListUpdates(project, field, values, reason) {
  const proposedValue = normalizeStringList(values).filter((item) => !normalizeStringList(project?.[field]).includes(item));

  if (!proposedValue.length) {
    return [];
  }

  return [
    buildPendingMemoryUpdate({
      target: "project",
      targetId: project.id,
      field,
      mode: "append",
      currentValue: project[field] || [],
      proposedValue,
      reason
    })
  ];
}

function buildPendingMemoryUpdate({ target, targetId, field, mode, currentValue, proposedValue, reason }) {
  if (!targetId || !field || isEmptyProposedValue(proposedValue)) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    target,
    targetId,
    field,
    label: reviewWorthyLabels[field] || field,
    mode,
    currentValue: normalizePendingValue(currentValue),
    proposedValue: normalizePendingValue(proposedValue),
    reason,
    createdAt: Date.now()
  };
}

function normalizePendingValue(value) {
  if (Array.isArray(value)) {
    return normalizeStringList(value);
  }

  return trimStorageText(value || "", 500);
}

function isEmptyProposedValue(value) {
  return Array.isArray(value) ? !normalizeStringList(value).length : !String(value || "").trim();
}

async function addPendingMemoryUpdates(updates) {
  const nextUpdates = normalizePendingMemoryUpdates(updates);

  if (!nextUpdates.length) {
    renderPendingMemoryUpdates();
    return 0;
  }

  const seenKeys = new Set(pendingMemoryUpdates.map(getPendingMemoryUpdateKey));
  const uniqueUpdates = [];

  for (const update of nextUpdates) {
    const key = getPendingMemoryUpdateKey(update);

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    uniqueUpdates.push(update);
  }

  pendingMemoryUpdates = [...uniqueUpdates, ...pendingMemoryUpdates].slice(0, 30);
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  return uniqueUpdates.length;
}

function normalizePendingMemoryUpdates(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(Boolean)
    .map((update) => ({
      id: update.id || crypto.randomUUID(),
      target: update.target === "client" ? "client" : "project",
      targetId: trimStorageText(update.targetId || "", 120),
      field: trimStorageText(update.field || "", 80),
      label: trimStorageText(update.label || reviewWorthyLabels[update.field] || update.field || "Memory update", 80),
      mode: update.mode === "replace" ? "replace" : "append",
      currentValue: normalizePendingValue(update.currentValue),
      proposedValue: normalizePendingValue(update.proposedValue),
      reason: trimStorageText(update.reason || "", 220),
      createdAt: Number(update.createdAt) || Date.now()
    }))
    .filter((update) => update.targetId && update.field && !isEmptyProposedValue(update.proposedValue));
}

function getPendingMemoryUpdateKey(update) {
  return [update.target, update.targetId, update.field, update.mode, normalizePendingKeyText(formatPendingValue(update.proposedValue))].join("|");
}

function normalizePendingKeyText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function syncPendingMemoryUpdates() {
  await chrome.storage.local.set({ [storageKeys.pendingUpdates]: pendingMemoryUpdates });
}

function renderPendingMemoryUpdates() {
  const count = pendingMemoryUpdates.length;
  elements.memoryReviewEmpty.hidden = count > 0;
  elements.acceptAllMemoryButton.disabled = count === 0;
  elements.rejectAllMemoryButton.disabled = count === 0;

  elements.pendingReviewList.replaceChildren(
    ...pendingMemoryUpdates.map((update) => {
      const card = document.createElement("article");
      card.className = "pending-card";
      card.dataset.updateId = update.id;
      card.dataset.conflict = String(hasPendingConflict(update));

      const header = document.createElement("header");
      const title = document.createElement("h3");
      title.textContent = `${update.target === "client" ? "Client" : "Project"}: ${update.label}`;
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = hasPendingConflict(update) ? "diff" : update.mode;
      header.append(title, pill);

      const diff = document.createElement("div");
      diff.className = "diff-grid";
      diff.append(buildDiffBlock("Saved now", formatPendingValue(update.currentValue) || "Empty"));
      diff.append(buildDiffBlock(update.mode === "replace" ? "Proposed" : "Add", formatPendingValue(update.proposedValue)));

      const reason = document.createElement("p");
      reason.className = "hint";
      reason.textContent = update.reason || "Review before saving.";

      const actions = document.createElement("div");
      actions.className = "pending-actions";
      const reject = document.createElement("button");
      reject.className = "button secondary";
      reject.type = "button";
      reject.dataset.action = "reject";
      reject.dataset.updateId = update.id;
      reject.textContent = "Reject";
      const accept = document.createElement("button");
      accept.className = "button secondary";
      accept.type = "button";
      accept.dataset.action = "accept";
      accept.dataset.updateId = update.id;
      accept.textContent = "Accept";
      actions.append(reject, accept);

      card.append(header, diff, reason, actions);
      return card;
    })
  );

  updateReplyActions();
}

function buildDiffBlock(label, value) {
  const block = document.createElement("div");
  block.className = "diff-block";
  const labelNode = document.createElement("strong");
  labelNode.textContent = label;
  const valueNode = document.createElement("p");
  valueNode.textContent = value || "Empty";
  block.append(labelNode, valueNode);
  return block;
}

function formatPendingValue(value) {
  if (Array.isArray(value)) {
    return normalizeStringList(value).join("\n");
  }

  return String(value || "").trim();
}

function hasPendingConflict(update) {
  const current = formatPendingValue(update.currentValue);
  const proposed = formatPendingValue(update.proposedValue);

  return Boolean(current && proposed && current !== proposed);
}

async function handlePendingReviewClick(event) {
  const button = event.target.closest("button[data-action][data-update-id]");

  if (!button) {
    return;
  }

  if (button.dataset.action === "accept") {
    await acceptPendingMemoryUpdate(button.dataset.updateId);
    return;
  }

  await rejectPendingMemoryUpdate(button.dataset.updateId);
}

async function acceptPendingMemoryUpdate(updateId) {
  const update = pendingMemoryUpdates.find((item) => item.id === updateId);

  if (!update) {
    return;
  }

  if (update.target === "client") {
    await applyClientPendingUpdate(update);
  } else {
    await applyProjectPendingUpdate(update);
  }

  pendingMemoryUpdates = pendingMemoryUpdates.filter((item) => item.id !== updateId);
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  renderProjectValues();
  renderMemorySnapshot();
  updateProjectHint();
  setStatus("Memory update accepted.", false);
}

async function rejectPendingMemoryUpdate(updateId) {
  pendingMemoryUpdates = pendingMemoryUpdates.filter((item) => item.id !== updateId);
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  setStatus("Memory update rejected.", false);
}

async function acceptAllPendingMemoryUpdates() {
  const updateIds = pendingMemoryUpdates.map((update) => update.id);

  for (const updateId of updateIds) {
    const update = pendingMemoryUpdates.find((item) => item.id === updateId);

    if (!update) {
      continue;
    }

    if (update.target === "client") {
      await applyClientPendingUpdate(update);
    } else {
      await applyProjectPendingUpdate(update);
    }
  }

  pendingMemoryUpdates = [];
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  renderProjectValues();
  renderMemorySnapshot();
  updateProjectHint();
  setStatus("All memory updates accepted.", false);
}

async function rejectAllPendingMemoryUpdates() {
  pendingMemoryUpdates = [];
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  setStatus("All memory updates rejected.", false);
}

async function applyClientPendingUpdate(update) {
  const clients = await loadClientMemories();
  const client = clients.find((item) => item.id === update.targetId) || currentClientMemory;

  if (!client?.id) {
    return;
  }

  currentClientMemory = await saveClientMemory({
    ...client,
    notes: mergeFacts(client.notes || [], normalizeStringList(update.proposedValue))
  });
}

async function applyProjectPendingUpdate(update) {
  const projects = await loadProjectMemories();
  const project = projects.find((item) => item.id === update.targetId) || currentProjectMemory;

  if (!project?.id) {
    return;
  }

  const value = update.proposedValue;
  const patch = listProjectFields.includes(update.field)
    ? { [update.field]: mergeFacts(project[update.field] || [], normalizeStringList(value)) }
    : { [update.field]: trimStorageText(value, update.field === "paymentTerms" ? 240 : 160) };

  currentProjectMemory = await saveProjectMemory({
    ...project,
    ...patch,
    updatedAt: new Date().toISOString()
  });
}

async function handleProjectFieldChange(event) {
  const key = event.target.dataset.projectKey;

  if (!key) {
    return;
  }

  const base =
    currentProjectMemory ||
    normalizeProjectMemory({
      title: currentPageContext?.threadTitle || currentPageContext?.pageTitle || "Client project",
      clientId: currentClientMemory?.id || "",
      sourceUrls: currentPageContext?.pageUrl ? [currentPageContext.pageUrl] : []
    });
  const kind = event.target.dataset.projectKind;
  const value = kind === "list" ? normalizeStringList(event.target.value) : event.target.value;

  currentProjectMemory = await saveProjectMemory({
    ...base,
    [key]: value,
    updatedAt: new Date().toISOString()
  });
  updateProjectHint();
  renderMemorySnapshot();
  setStatus("Project memory saved.", false);
}

function renderProjectValues() {
  for (const [key, , , , kind] of projectFields) {
    const control = document.querySelector(`#project-${key}`);

    if (!control) {
      continue;
    }

    const value = currentProjectMemory?.[key];
    control.value = kind === "list" ? normalizeStringList(value).join("\n") : value || (kind === "status" ? "discovery" : "");
  }
}

function renderMemorySnapshot() {
  if (!elements.memorySnapshot) {
    return;
  }

  const clientCard = buildSnapshotCard({
    title: currentClientMemory?.name || "No client detected yet",
    status: currentClientMemory?.status || "lead",
    body: currentClientMemory
      ? [currentClientMemory.company, currentClientMemory.emailOrHandle, currentClientMemory.source].filter(Boolean).join(" · ") || "Client memory found."
      : "Use page or highlight text to create client memory.",
    groups: [
      {
        label: "Notes",
        items: currentClientMemory?.notes || []
      }
    ]
  });
  const projectCard = buildSnapshotCard({
    title: currentProjectMemory?.title || "No project detected yet",
    status: currentProjectMemory?.status || "discovery",
    body: currentProjectMemory?.nextStep ? `Next: ${currentProjectMemory.nextStep}` : "Latest next step appears here after generation.",
    groups: [
      {
        label: "Included",
        items: currentProjectMemory?.includedScope || []
      },
      {
        label: "Excluded",
        items: currentProjectMemory?.excludedScope || []
      },
      {
        label: "Risks",
        items: currentProjectMemory?.risks || [],
        kind: "risk"
      }
    ]
  });

  elements.memorySnapshot.replaceChildren(clientCard, projectCard);
}

function buildSnapshotCard({ title, status, body, groups }) {
  const card = document.createElement("article");
  card.className = "snapshot-card";

  const top = document.createElement("div");
  top.className = "snapshot-top";
  const titleNode = document.createElement("h3");
  titleNode.textContent = title;
  const statusNode = document.createElement("span");
  statusNode.className = "pill";
  statusNode.textContent = status.replaceAll("_", " ");
  top.append(titleNode, statusNode);

  const bodyNode = document.createElement("p");
  bodyNode.textContent = body;
  card.append(top, bodyNode);

  for (const group of groups) {
    const items = normalizeStringList(group.items).slice(-4);

    if (!items.length) {
      continue;
    }

    const list = document.createElement("div");
    list.className = "mini-list";

    for (const item of items) {
      const row = document.createElement("span");
      row.dataset.kind = group.kind || "";
      row.textContent = `${group.label}: ${item}`;
      list.append(row);
    }

    card.append(list);
  }

  return card;
}

async function upsertClientMemory(pageContext) {
  if (!pageContext?.pageUrl && !pageContext?.clientName && !pageContext?.emailOrHandle) {
    return null;
  }

  const now = new Date().toISOString();
  const source = normalizeSource(pageContext.source);
  const name = trimStorageText(pageContext.clientName || deriveClientName(pageContext), 140);
  const company = trimStorageText(pageContext.clientCompany || "", 140);
  const emailOrHandle = trimStorageText(pageContext.emailOrHandle || deriveEmailOrHandle(pageContext), 160);
  const note = buildClientNote(pageContext);

  if (!name && !emailOrHandle) {
    return null;
  }

  const clients = await loadClientMemories();
  const existing = findMatchingClient(clients, { source, name, emailOrHandle, pageUrl: pageContext.pageUrl });
  const nextClient = {
    id: existing?.id || crypto.randomUUID(),
    name: name || existing?.name || emailOrHandle || "Unknown client",
    company: company || existing?.company || "",
    emailOrHandle: emailOrHandle || existing?.emailOrHandle || "",
    source,
    lastSeenUrl: pageContext.pageUrl || existing?.lastSeenUrl || "",
    notes: mergeFacts(existing?.notes || [], note ? [note] : []),
    status: existing?.status || "lead",
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  const nextClients = [nextClient, ...clients.filter((client) => client.id !== nextClient.id)].slice(0, 100);

  await chrome.storage.local.set({ [storageKeys.clients]: nextClients });
  return nextClient;
}

function findMatchingClient(clients, candidate) {
  const candidateHandle = normalizeClientKey(candidate.emailOrHandle);
  const candidateName = normalizeClientKey(candidate.name);
  const candidatePageKey = getPageKey(candidate.pageUrl);

  return (
    clients.find((client) => client.source === candidate.source && candidateHandle && normalizeClientKey(client.emailOrHandle) === candidateHandle) ||
    clients.find((client) => client.source === candidate.source && candidateName && normalizeClientKey(client.name) === candidateName) ||
    clients.find((client) => client.source === candidate.source && candidatePageKey && getPageKey(client.lastSeenUrl) === candidatePageKey) ||
    null
  );
}

function buildClientNote(pageContext) {
  const title = pageContext.threadTitle || pageContext.pageTitle || "";
  const ask = trimStorageText(pageContext.latestClientMessage || pageContext.selectedText || "", 220);

  if (title && ask) {
    return `${title}: ${ask}`;
  }

  return title || ask;
}

function deriveClientName(pageContext) {
  if (pageContext.source === "gmail") {
    const message = pageContext.recentMessages?.at(-1);
    return message?.author || "";
  }

  if (pageContext.source === "whatsapp") {
    return pageContext.threadTitle || pageContext.pageTitle.replace(/^WhatsApp\s*/, "");
  }

  return pageContext.threadTitle || "";
}

function deriveEmailOrHandle(pageContext) {
  const text = [pageContext.clientName, pageContext.threadTitle, pageContext.pageTitle, pageContext.visibleText].filter(Boolean).join("\n");
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";

  if (email) {
    return email;
  }

  const handle = text.match(/@\w{2,30}/)?.[0] || "";

  if (handle) {
    return handle;
  }

  return "";
}

function normalizeClientKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function updateSessionHint() {
  if (!elements.sessionHint) {
    return;
  }

  if (!currentSession) {
    elements.sessionHint.textContent = "Session memory: empty for this page.";
    return;
  }

  const minutesLeft = Math.max(1, Math.round((currentSession.expiresAt - Date.now()) / 60000));
  const nextStep = currentSession.nextStep ? ` Next: ${currentSession.nextStep}` : "";
  elements.sessionHint.textContent = `Session memory: ${minutesLeft} min left.${nextStep}`;
}

function updateProjectHint() {
  if (!elements.projectHint) {
    return;
  }

  if (!currentProjectMemory) {
    elements.projectHint.textContent = "Project memory: empty for this page.";
    return;
  }

  const scopeCount = (currentProjectMemory.includedScope?.length || 0) + (currentProjectMemory.excludedScope?.length || 0);
  const riskCount = currentProjectMemory.risks?.length || 0;
  const title = currentProjectMemory.title || "Client project";
  elements.projectHint.textContent = `Project memory: ${title}. Scope items: ${scopeCount}. Risks: ${riskCount}.`;
}

function getPageKey(value) {
  const pageUrl = typeof value === "string" ? value : value?.pageUrl || "";

  try {
    const url = new URL(pageUrl);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return pageUrl;
  }
}

function getDomain(pageUrl) {
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return "";
  }
}

function normalizeSource(source) {
  const allowedSources = new Set(["gmail", "linkedin", "upwork", "fiverr", "generic", "x", "whatsapp"]);
  const normalized = String(source || "generic").toLowerCase();

  return allowedSources.has(normalized) ? normalized : "generic";
}

function trimStorageText(value, maxLength) {
  const text = String(value || "").trim();

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function updateScore() {
  const completed = importantFields.filter((field) => context[field]?.trim()).length;
  const percent = Math.round((completed / importantFields.length) * 100);

  elements.scoreText.textContent = `${percent}%`;
  elements.scoreBar.style.width = `${percent}%`;
}

function updateReplyActions() {
  const hasReply = Boolean(elements.replyOutput?.value.trim());
  const pendingCount = getBlockingPendingMemoryUpdateCount();

  elements.copyButton.disabled = !hasReply;
  elements.insertButton.disabled = !hasReply || pendingCount > 0;

  if (!elements.insertHint) {
    return;
  }

  if (!hasReply) {
    elements.insertHint.textContent = "Generate first. Then review and insert.";
    return;
  }

  if (pendingCount > 0) {
    elements.insertHint.textContent = `Review ${pendingCount} pending memory update${pendingCount === 1 ? "" : "s"} before inserting.`;
    return;
  }

  elements.insertHint.textContent = "Memory reviewed. Insert when the reply looks right.";
}

function getBlockingPendingMemoryUpdateCount() {
  const activeMemoryIds = new Set([currentClientMemory?.id, currentProjectMemory?.id].filter(Boolean));

  if (!activeMemoryIds.size) {
    return pendingMemoryUpdates.length;
  }

  return pendingMemoryUpdates.filter((update) => activeMemoryIds.has(update.targetId)).length;
}

function mergeMemoryResults(first, second) {
  return {
    autoSavedCount: (first?.autoSavedCount || 0) + (second?.autoSavedCount || 0),
    pendingCount: (first?.pendingCount || 0) + (second?.pendingCount || 0)
  };
}

function getReplyReadyStatus(memoryResult, warnings = []) {
  const warningText = warnings.length ? ` Analysis fallback used: ${warnings.length} issue${warnings.length === 1 ? "" : "s"}.` : "";

  if (memoryResult.pendingCount > 0) {
    return `Reply ready. Review ${memoryResult.pendingCount} memory update${memoryResult.pendingCount === 1 ? "" : "s"}.${warningText}`;
  }

  if (memoryResult.autoSavedCount > 0) {
    return `Reply ready. Auto-saved ${memoryResult.autoSavedCount} low-risk fact${memoryResult.autoSavedCount === 1 ? "" : "s"}.${warningText}`;
  }

  return `Reply ready.${warningText}`;
}

function setStatus(message, isError) {
  elements.statusText.textContent = message;
  elements.statusText.classList.toggle("error", Boolean(isError));
}

async function setStoredValue(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

function normalizeEndpoint(value) {
  return getApiEndpoints(value).generate;
}

function getApiEndpoints(value) {
  const base = normalizeApiBase(value);

  return {
    base,
    analyzeClient: buildApiEndpoint(base, "analyze-client"),
    analyzeScopeRisk: buildApiEndpoint(base, "analyze-scope-risk"),
    generate: buildApiEndpoint(base, "generate")
  };
}

function normalizeApiBase(value) {
  const trimmed = String(value || defaultApiEndpoint).trim() || defaultApiEndpoint;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const apiIndex = url.pathname.indexOf("/api");
    const basePath = apiIndex >= 0 ? url.pathname.slice(0, apiIndex) : url.pathname;
    const normalizedPath = basePath.replace(/\/+$/, "");

    return `${url.origin}${normalizedPath === "/" ? "" : normalizedPath}`;
  } catch {
    return normalizeApiBase(defaultApiEndpoint);
  }
}

function buildApiEndpoint(base, route) {
  return `${base.replace(/\/+$/, "")}/api/${route}`;
}

function getLocalFallbackEndpoint(endpoint) {
  const fallbackBase = getLocalFallbackApiBase(normalizeApiBase(endpoint));

  if (!fallbackBase) {
    return "";
  }

  return buildApiEndpoint(fallbackBase, getApiRouteName(endpoint));
}

function getLocalFallbackApiBase(apiBase) {
  try {
    const url = new URL(apiBase);

    if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port === "3000") {
      url.port = "3001";
      return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
    }
  } catch {
    return "";
  }

  return "";
}

function getApiRouteName(endpoint) {
  try {
    const url = new URL(endpoint);
    const match = url.pathname.match(/\/api\/([^/]+)\/?$/);

    return match?.[1] || "generate";
  } catch {
    return "generate";
  }
}

function readableError(error) {
  const message = error instanceof Error ? error.message : "Something went wrong.";

  if (message.includes("Cannot access")) {
    return "Chrome blocked this page. Try a normal website tab.";
  }

  if (message.includes("Receiving end does not exist")) {
    return "Refresh the page so the extension can inject its content script.";
  }

  if (message.includes("Failed to fetch")) {
    return "Could not reach API. Start Next locally or check the endpoint.";
  }

  return message;
}

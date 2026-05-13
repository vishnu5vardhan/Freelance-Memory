const storageKeys = {
  context: "freelancer_memory_extension_context",
  draft: "freelancer_memory_extension_draft",
  diagnostics: "freelancer_memory_extension_diagnostics",
  endpoint: "freelancer_memory_extension_api_endpoint",
  forcedIntent: "freelancer_memory_extension_forced_intent",
  installId: "freelancer_memory_extension_install_id",
  instruction: "freelancer_memory_extension_instruction",
  lastResult: "freelancer_memory_extension_last_result",
  lastSelection: "freelancer_memory_extension_last_selection",
  onboardingCompleted: "freelancer_memory_extension_onboarding_completed",
  openaiKey: "freelancer_memory_extension_openai_key",
  pageContext: "freelancer_memory_extension_page_context",
  pendingUpdates: "freelancer_memory_pending_updates",
  socials: "freelancer_memory_extension_socials",
  sessions: "freelancer_memory_sessions",
  clients: "freelancer_memory_clients",
  projects: "freelancer_memory_projects"
};

const defaultApiEndpoint = "https://freelancer-memory.vercel.app/api/generate";
const sessionTtlMs = 2 * 60 * 60 * 1000;
const slowGenerationMs = 6000;
const diagnosticsLimit = 50;
const weakMemoryThreshold = 40;

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

const clientFields = [
  ["name", "Client name", "Sarah Chen", 1, "text"],
  ["company", "Company", "GlowSkin", 1, "text"],
  ["emailOrHandle", "Email / handle", "sarah@example.com or @sarah", 1, "text"],
  ["source", "Source", "", 1, "source"],
  ["status", "Status", "", 1, "clientStatus"],
  ["notes", "Notes", "One note per line", 4, "list"]
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

const sourceOptions = ["generic", "gmail", "linkedin", "upwork", "fiverr", "whatsapp", "x"];
const clientStatuses = ["lead", "quoted", "active", "waiting", "done"];
const projectStatuses = ["discovery", "quoted", "active", "waiting", "done"];
const listProjectFields = ["includedScope", "excludedScope", "agreedFacts", "risks"];
const coreContextFieldKeys = ["role", "services", "pricing", "proof", "paymentTerms", "boundaries", "voice"];
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
let pendingResetAction = "";
let activeTesterTab = "clients";
let activeTopTab = "reply";
let isGenerating = false;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  renderModeOptions();
  renderMemoryFields();
  renderClientFields();
  renderSocialFields();
  renderProjectFields();
  bindEvents();
  showTopTab("reply");
  await cleanExpiredSessions();
  await loadState();
  await loadStoredPageContext();
  trackEvent("extension_opened", { source: currentPageContext?.source || "" });

  if (!currentPageContext?.latestClientMessage) {
    await grabSelection();
  }
}

function cacheElements() {
  elements.replyTopTab = document.querySelector("#replyTopTab");
  elements.memoryTopTab = document.querySelector("#memoryTopTab");
  elements.advancedTopTab = document.querySelector("#advancedTopTab");
  elements.replyTabPanel = document.querySelector("#replyTabPanel");
  elements.memoryTabPanel = document.querySelector("#memoryTabPanel");
  elements.advancedTabPanel = document.querySelector("#advancedTabPanel");
  elements.inputText = document.querySelector("#inputText");
  elements.openaiKey = document.querySelector("#openaiKey");
  elements.forcedIntent = document.querySelector("#forcedIntent");
  elements.apiEndpoint = document.querySelector("#apiEndpoint");
  elements.userInstruction = document.querySelector("#userInstruction");
  elements.generateButton = document.querySelector("#generateButton");
  elements.copyButton = document.querySelector("#copyButton");
  elements.insertButton = document.querySelector("#insertButton");
  elements.insertHint = document.querySelector("#insertHint");
  elements.onboardingNotice = document.querySelector("#onboardingNotice");
  elements.openOnboardingButton = document.querySelector("#openOnboardingButton");
  elements.grabPageButton = document.querySelector("#grabPageButton");
  elements.grabSelectionButton = document.querySelector("#grabSelectionButton");
  elements.replyOutput = document.querySelector("#replyOutput");
  elements.replyEmpty = document.querySelector("#replyEmpty");
  elements.replyMeta = document.querySelector("#replyMeta");
  elements.statusText = document.querySelector("#statusText");
  elements.pageHint = document.querySelector("#pageHint");
  elements.sessionHint = document.querySelector("#sessionHint");
  elements.projectHint = document.querySelector("#projectHint");
  elements.memoryFields = document.querySelector("#memoryFields");
  elements.socialFields = document.querySelector("#socialFields");
  elements.clientFields = document.querySelector("#clientFields");
  elements.projectFields = document.querySelector("#projectFields");
  elements.activeClientSelect = document.querySelector("#activeClientSelect");
  elements.activeProjectSelect = document.querySelector("#activeProjectSelect");
  elements.clientTab = document.querySelector("#clientTab");
  elements.memoryTab = document.querySelector("#memoryTab");
  elements.projectTab = document.querySelector("#projectTab");
  elements.socialsTab = document.querySelector("#socialsTab");
  elements.clientPanel = document.querySelector("#clientPanel");
  elements.memoryPanel = document.querySelector("#memoryPanel");
  elements.projectPanel = document.querySelector("#projectPanel");
  elements.socialsPanel = document.querySelector("#socialsPanel");
  elements.businessDetails = document.querySelector("#businessDetails");
  elements.clientDetails = document.querySelector("#clientDetails");
  elements.projectDetails = document.querySelector("#projectDetails");
  elements.socialsDetails = document.querySelector("#socialsDetails");
  elements.importDetails = document.querySelector("#importDetails");
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
  elements.resetClientMemoryButton = document.querySelector("#resetClientMemoryButton");
  elements.resetProjectMemoryButton = document.querySelector("#resetProjectMemoryButton");
  elements.resetAllContextButton = document.querySelector("#resetAllContextButton");
  elements.clientsTab = document.querySelector("#clientsTab");
  elements.projectsTab = document.querySelector("#projectsTab");
  elements.sessionTab = document.querySelector("#sessionTab");
  elements.importTab = document.querySelector("#importTab");
  elements.clientsPanel = document.querySelector("#clientsPanel");
  elements.projectsPanel = document.querySelector("#projectsPanel");
  elements.sessionPanel = document.querySelector("#sessionPanel");
  elements.importPanel = document.querySelector("#importPanel");
  elements.clientsList = document.querySelector("#clientsList");
  elements.projectsList = document.querySelector("#projectsList");
  elements.sessionDetails = document.querySelector("#sessionDetails");
  elements.clientsEmpty = document.querySelector("#clientsEmpty");
  elements.projectsEmpty = document.querySelector("#projectsEmpty");
  elements.sessionEmpty = document.querySelector("#sessionEmpty");
  elements.refreshSessionButton = document.querySelector("#refreshSessionButton");
  elements.clearSessionButton = document.querySelector("#clearSessionButton");
  elements.expireSessionButton = document.querySelector("#expireSessionButton");
  elements.importTarget = document.querySelector("#importTarget");
  elements.importSource = document.querySelector("#importSource");
  elements.importClientName = document.querySelector("#importClientName");
  elements.importCompany = document.querySelector("#importCompany");
  elements.importEmailHandle = document.querySelector("#importEmailHandle");
  elements.importProjectTitle = document.querySelector("#importProjectTitle");
  elements.importFile = document.querySelector("#importFile");
  elements.importText = document.querySelector("#importText");
  elements.runImportButton = document.querySelector("#runImportButton");
  elements.importStatus = document.querySelector("#importStatus");
  elements.diagnosticsList = document.querySelector("#diagnosticsList");
  elements.diagnosticsEmpty = document.querySelector("#diagnosticsEmpty");
  elements.diagnosticsDetails = document.querySelector("#diagnosticsDetails");
  elements.copyDiagnosticsButton = document.querySelector("#copyDiagnosticsButton");
  elements.clearDiagnosticsButton = document.querySelector("#clearDiagnosticsButton");
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
  const coreFields = contextFields.filter(([key]) => coreContextFieldKeys.includes(key));
  const optionalFields = contextFields.filter(([key]) => !coreContextFieldKeys.includes(key));
  const optionalDetails = document.createElement("details");
  optionalDetails.className = "memory-advanced";
  const summary = document.createElement("summary");
  summary.innerHTML = "<strong>Optional profile details</strong><span>Name, niche, bio, links, process, and availability.</span>";
  const optionalGrid = document.createElement("div");
  optionalGrid.className = "memory-fields";
  optionalGrid.append(...optionalFields.map(createMemoryField));
  optionalDetails.append(summary, optionalGrid);

  elements.memoryFields.replaceChildren(...coreFields.map(createMemoryField), optionalDetails);
}

function createMemoryField([key, label, placeholder, rows]) {
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
}

function renderClientFields() {
  elements.clientFields.replaceChildren(
    ...clientFields.map(([key, label, placeholder, rows, kind]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "field";

      const labelNode = document.createElement("span");
      labelNode.textContent = label;

      let control;

      if (kind === "source" || kind === "clientStatus") {
        control = document.createElement("select");
        const options = kind === "source" ? sourceOptions : clientStatuses;

        for (const optionValue of options) {
          const option = document.createElement("option");
          option.value = optionValue;
          option.textContent = optionValue.replaceAll("_", " ");
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

      control.id = `client-${key}`;
      control.dataset.clientKey = key;
      control.dataset.clientKind = kind;

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
  elements.replyTopTab.addEventListener("click", () => showTopTab("reply"));
  elements.memoryTopTab.addEventListener("click", () => showTopTab("memory"));
  elements.advancedTopTab.addEventListener("click", () => showTopTab("advanced"));

  elements.inputText.addEventListener("input", () => {
    setStoredValue(storageKeys.draft, elements.inputText.value);
    updateInputEmptyState();
  });

  elements.forcedIntent.addEventListener("change", () => {
    setStoredValue(storageKeys.forcedIntent, elements.forcedIntent.value);
  });

  elements.apiEndpoint.addEventListener("input", () => {
    setStoredValue(storageKeys.endpoint, elements.apiEndpoint.value);
  });

  elements.openaiKey?.addEventListener("input", () => {
    setStoredValue(storageKeys.openaiKey, elements.openaiKey.value.trim());
  });

  elements.userInstruction.addEventListener("input", () => {
    setStoredValue(storageKeys.instruction, elements.userInstruction.value);
  });

  elements.generateButton.addEventListener("click", generateReply);
  elements.copyButton.addEventListener("click", copyReply);
  elements.insertButton.addEventListener("click", insertReplyIntoPage);
  elements.openOnboardingButton.addEventListener("click", openOnboardingPage);
  elements.grabPageButton.addEventListener("click", grabPageContext);
  elements.grabSelectionButton.addEventListener("click", grabSelection);
  elements.activeClientSelect.addEventListener("change", handleActiveClientSelectChange);
  elements.activeProjectSelect.addEventListener("change", handleActiveProjectSelectChange);
  elements.clientTab.addEventListener("click", () => showSavedInfoTab("client"));
  elements.memoryTab.addEventListener("click", () => showSavedInfoTab("memory"));
  elements.projectTab.addEventListener("click", () => showSavedInfoTab("project"));
  elements.socialsTab.addEventListener("click", () => showSavedInfoTab("socials"));
  elements.pendingReviewList.addEventListener("click", handlePendingReviewClick);
  elements.acceptAllMemoryButton.addEventListener("click", acceptAllPendingMemoryUpdates);
  elements.rejectAllMemoryButton.addEventListener("click", rejectAllPendingMemoryUpdates);
  elements.resetClientMemoryButton.addEventListener("click", resetClientMemory);
  elements.resetProjectMemoryButton.addEventListener("click", resetProjectMemory);
  elements.resetAllContextButton.addEventListener("click", resetAllContextMemory);
  elements.clientsTab.addEventListener("click", () => showTesterTab("clients"));
  elements.projectsTab.addEventListener("click", () => showTesterTab("projects"));
  elements.sessionTab.addEventListener("click", () => showTesterTab("session"));
  elements.importTab.addEventListener("click", () => showTesterTab("import"));
  elements.clientsList.addEventListener("click", handleClientsListClick);
  elements.projectsList.addEventListener("click", handleProjectsListClick);
  elements.refreshSessionButton.addEventListener("click", refreshSessionTester);
  elements.clearSessionButton.addEventListener("click", clearActiveSession);
  elements.expireSessionButton.addEventListener("click", expireActiveSession);
  elements.importFile.addEventListener("change", handleImportFileChange);
  elements.runImportButton.addEventListener("click", importExistingContext);
  elements.copyDiagnosticsButton?.addEventListener("click", copyDiagnostics);
  elements.clearDiagnosticsButton?.addEventListener("click", clearDiagnostics);
  elements.diagnosticsDetails?.addEventListener("toggle", () => {
    if (elements.diagnosticsDetails.open) {
      renderDiagnostics();
    }
  });

  elements.memoryFields.addEventListener("input", (event) => {
    const key = event.target.dataset.memoryKey;

    if (!key) {
      return;
    }

    context = { ...context, [key]: event.target.value };
    chrome.storage.local.set({ [storageKeys.context]: context });
    updateScore();
    setStatus("Memory saved.", false);
    trackEvent("memory_saved", { field: key });
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

  elements.clientFields.addEventListener("input", handleClientFieldChange);
  elements.clientFields.addEventListener("change", handleClientFieldChange);
  elements.projectFields.addEventListener("input", handleProjectFieldChange);
  elements.projectFields.addEventListener("change", handleProjectFieldChange);

  chrome.storage.onChanged.addListener(handleStorageChange);
}

function showTopTab(tab) {
  activeTopTab = tab;
  const sections = {
    reply: [elements.replyTopTab, elements.replyTabPanel],
    memory: [elements.memoryTopTab, elements.memoryTabPanel],
    advanced: [elements.advancedTopTab, elements.advancedTabPanel]
  };

  for (const [section, [button, panel]] of Object.entries(sections)) {
    const isActive = section === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  }
}

function renderOnboardingNotice(isCompleted) {
  if (!elements.onboardingNotice) {
    return;
  }

  elements.onboardingNotice.hidden = Boolean(isCompleted);
}

async function showTesterTab(tab) {
  activeTesterTab = tab;
  const isClients = tab === "clients";
  const isProjects = tab === "projects";
  const isSession = tab === "session";
  const isImport = tab === "import";

  elements.clientsPanel.hidden = !isClients;
  elements.projectsPanel.hidden = !isProjects;
  elements.sessionPanel.hidden = !isSession;
  elements.clientsTab.classList.toggle("active", isClients);
  elements.projectsTab.classList.toggle("active", isProjects);
  elements.sessionTab.classList.toggle("active", isSession);
  elements.importTab.classList.toggle("active", isImport);
  elements.clientsTab.setAttribute("aria-selected", String(isClients));
  elements.projectsTab.setAttribute("aria-selected", String(isProjects));
  elements.sessionTab.setAttribute("aria-selected", String(isSession));
  elements.importTab.setAttribute("aria-selected", String(isImport));

  if (isImport && elements.importDetails) {
    showTopTab("advanced");
    elements.importDetails.open = true;
    elements.importPanel.hidden = false;
  }

  await renderTesterViews();
}

function showSavedInfoTab(tab) {
  const clientActive = tab === "client";
  const memoryActive = tab === "memory";
  const projectActive = tab === "project";
  const socialsActive = tab === "socials";

  elements.clientTab.classList.toggle("active", clientActive);
  elements.memoryTab.classList.toggle("active", memoryActive);
  elements.projectTab.classList.toggle("active", projectActive);
  elements.socialsTab.classList.toggle("active", socialsActive);
  elements.clientTab.setAttribute("aria-selected", String(clientActive));
  elements.memoryTab.setAttribute("aria-selected", String(memoryActive));
  elements.projectTab.setAttribute("aria-selected", String(projectActive));
  elements.socialsTab.setAttribute("aria-selected", String(socialsActive));

  if (elements.businessDetails) elements.businessDetails.open = memoryActive;
  if (elements.clientDetails) elements.clientDetails.open = clientActive;
  if (elements.projectDetails) elements.projectDetails.open = projectActive;
  if (elements.socialsDetails) elements.socialsDetails.open = socialsActive;
}

async function handleStorageChange(changes, areaName) {
  if (areaName !== "local") {
    return;
  }

  if (changes[storageKeys.clients] || changes[storageKeys.projects] || changes[storageKeys.sessions]) {
    await renderTesterViews();
  }

  if (changes[storageKeys.onboardingCompleted]) {
    renderOnboardingNotice(Boolean(changes[storageKeys.onboardingCompleted].newValue));
  }

  if (!changes[storageKeys.pageContext]?.newValue) {
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
  if (elements.openaiKey) {
    elements.openaiKey.value = stored[storageKeys.openaiKey] || "";
  }
  elements.userInstruction.value = stored[storageKeys.instruction] || "";
  updateInputEmptyState();
  renderOnboardingNotice(Boolean(stored[storageKeys.onboardingCompleted]));

  if (stored[storageKeys.lastResult]) {
    setResult(stored[storageKeys.lastResult]);
  }

  renderPendingMemoryUpdates();
  renderMemorySnapshot();
  await renderTesterViews();
  updateScore();
  applyWeakMemoryHint();
}

function applyWeakMemoryHint() {
  if (!elements.statusText) {
    return;
  }

  const percent = getMemoryScorePercent();

  if (percent < weakMemoryThreshold && !elements.statusText.classList.contains("error")) {
    elements.statusText.textContent = "Replies improve when you add services, pricing, and voice in Memory.";
  }
}

function openOnboardingPage() {
  trackEvent("onboarding_started", { source: "sidepanel" });
  chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
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
  trackEvent("use_page_clicked", {});
  setStatus("Reading page context...", false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    if (!isReadableTab(tab)) {
      throw new Error("Unsupported page.");
    }

    const pageContext = await askContentScriptForPageContext(tab.id);

    if (pageContext?.__fmError) {
      throw new Error(pageContext.__fmError);
    }

    if (!pageContext?.latestClientMessage && !pageContext?.visibleText) {
      throw new Error("No useful page context found. Highlight the client message instead.");
    }

    const nextPageContext = { ...pageContext, tabId: tab.id };
    await chrome.storage.local.set({ [storageKeys.pageContext]: nextPageContext });
    await applyPageContext(nextPageContext, "Page context loaded.");
  } catch (error) {
    const userError = toUserError(error, "use_page");
    setStatus(userError.message, true);
    trackEvent("use_page_clicked", { status: "error", errorCategory: userError.category });
  }
}

async function applyPageContext(pageContext, statusMessage) {
  currentPageContext = pageContext;
  currentClientMemory = await upsertClientMemory(pageContext);
  currentProjectMemory = await upsertProjectMemory(pageContext, currentClientMemory);
  currentSession = await getSessionForPage(pageContext);
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  await renderTesterViews();

  const inputText = pageContext.latestClientMessage || pageContext.selectedText || "";

  if (inputText) {
    elements.inputText.value = inputText;
    await setStoredValue(storageKeys.draft, inputText);
  }

  const label = pageContext.threadTitle || pageContext.pageTitle || pageContext.pageUrl || "current page";
  const replyStatus = pageContext.replyBoxFound ? "reply box found" : "no reply box found";
  const clientHint = currentClientMemory?.name ? ` Client: ${currentClientMemory.name}.` : "";
  setPageHint(`From ${pageContext.sourceLabel || pageContext.source || "page"}: ${label} (${replyStatus}).${clientHint}`, false);
  updateSessionHint();
  updateProjectHint();
  updateReplyActions();
  setStatus(statusMessage, false);
}

async function grabSelection() {
  trackEvent("use_highlight_clicked", {});
  setStatus("Reading highlighted text...", false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    if (!isReadableTab(tab)) {
      throw new Error("Unsupported page.");
    }

    const data = await getSelectionFromActiveTab(tab);

    if (data.text) {
      const pageContext = await askContentScriptForPageContext(tab.id);
      const safePageContext = pageContext?.__fmError ? null : pageContext;
      const nextPageContext = {
        ...buildSelectionPageContext(data),
        ...(safePageContext || {}),
        selectedText: data.text,
        latestClientMessage: data.text,
        visibleText: safePageContext?.visibleText || data.text,
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
      setPageHint(`Loaded focused field from: ${data.title || "current page"}`, false);
      setStatus("Focused field loaded.", false);
      return;
    }

    setPageHint("Highlight a client message or click Use page.", true);
    setStatus("No highlighted text found. Paste the client message here.", false);
  } catch (error) {
    const userError = toUserError(error, "use_highlight");
    setStatus(userError.message, true);
    trackEvent("use_highlight_clicked", { status: "error", errorCategory: userError.category });
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
  } catch (error) {
    return { __fmError: error?.message || "Content script unavailable." };
  }
}

async function askContentScriptForPageContext(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "freelancer-memory:get-page-context" });
  } catch (error) {
    return { __fmError: error?.message || "Content script unavailable." };
  }
}

function isReadableTab(tab) {
  if (!tab?.url) {
    return true;
  }

  return /^https?:\/\//i.test(tab.url);
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
  if (isGenerating) {
    return;
  }

  const inputText = elements.inputText.value.trim();
  const forcedIntent = elements.forcedIntent.value;
  const sourceHint = currentPageContext?.source || "";

  if (!inputText) {
    setPageHint("Add or highlight a client message first.", true);
    setStatus("Add or highlight a client message first.", true);
    elements.inputText.focus();
    trackEvent("generation_failed", {
      errorCategory: "empty_input",
      forcedIntent,
      source: sourceHint
    });
    return;
  }

  trackEvent("generate_clicked", {
    forcedIntent,
    source: sourceHint,
    inputChars: inputText.length,
    memoryScore: getMemoryScorePercent()
  });

  isGenerating = true;
  setStatus("Analyzing client and scope...", false);
  elements.generateButton.disabled = true;
  elements.copyButton.disabled = true;
  elements.insertButton.disabled = true;

  const startedAt = Date.now();
  let durationMs = 0;
  let detectedIntent = "";
  let riskLevel = "";
  let outputChars = 0;

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
    renderClientValues();
    renderProjectValues();
    renderMemorySnapshot();
    updateProjectHint();
    await renderTesterViews();
    renderAnalysisSummary(analysisState.clientAnalysis, analysisState.scopeRisk, analysisState.warnings);
    renderRisk(buildAnalysisRiskDisplay(analysisState.scopeRisk));
    setStatus("Writing reply...", false);

    const payload = {
      context,
      inputText,
      pageContext: contextPacket.pageContext,
      sessionMemory: contextPacket.sessionMemory,
      contextPacket,
      forcedIntent,
      userInstruction: elements.userInstruction.value
    };
    const data = await requestGenerateReply(endpoints.generate, payload);

    durationMs = Date.now() - startedAt;
    detectedIntent = data.result?.detectedIntent || "";
    riskLevel = data.result?.riskLevel || "";
    outputChars = (data.result?.reply || "").length;

    setResult(data.result, data.usage);
    renderRisk(buildCombinedRiskDisplay(data.result, analysisState.scopeRisk));
    const memoryResult = await processResultMemoryUpdates(data.result, currentPageContext, currentClientMemory, currentProjectMemory);
    currentClientMemory = memoryResult.clientMemory;
    currentProjectMemory = memoryResult.projectMemory;
    renderClientValues();
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
    await renderTesterViews();
    updateReplyActions();
    await chrome.storage.local.set({
      [storageKeys.draft]: inputText,
      [storageKeys.lastResult]: {
        result: data.result,
        usage: data.usage || null
      }
    });

    const readyStatus = getReplyReadyStatus(
      mergeMemoryResults(analysisState.memoryResult, memoryResult),
      analysisState.warnings
    );
    const slowSuffix =
      durationMs >= slowGenerationMs
        ? ` This took ${(durationMs / 1000).toFixed(1)}s. If it keeps happening, try again later.`
        : "";
    setStatus(`${readyStatus}${slowSuffix}`, false);

    trackEvent("generation_succeeded", {
      forcedIntent,
      detectedIntent,
      riskLevel,
      durationMs,
      source: sourceHint,
      inputChars: inputText.length,
      outputChars,
      memoryScore: getMemoryScorePercent(),
      status: "ok"
    });
  } catch (error) {
    durationMs = Date.now() - startedAt;
    const userError = toUserError(error, "generate");
    setStatus(userError.message, true);
    trackEvent("generation_failed", {
      forcedIntent,
      durationMs,
      source: sourceHint,
      inputChars: inputText.length,
      errorCategory: userError.category,
      status: "error"
    });
  } finally {
    isGenerating = false;
    elements.generateButton.disabled = false;
    updateReplyActions();
  }
}

function getMemoryScorePercent() {
  const completed = importantFields.filter((field) => context[field]?.trim()).length;
  return Math.round((completed / importantFields.length) * 100);
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
    state.warnings.push(`Client analysis skipped: ${readableError(error)}`);
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

async function requestAnalyzeClient(endpoint, contextPacket) {
  return requestApiResult(endpoint, contextPacket, "Client analysis failed.");
}

async function requestAnalyzeScopeRisk(endpoint, contextPacket) {
  return requestApiResult(endpoint, contextPacket, "Scope analysis failed.");
}

async function requestGenerateReply(endpoint, payload) {
  return requestApiResult(endpoint, payload, "Generation failed.");
}

const requestTimeoutMs = 45000;

async function requestApiResult(endpoint, payload, fallbackMessage) {
  const headers = {
    "Content-Type": "application/json"
  };
  const openaiKey = elements.openaiKey?.value.trim();

  if (openaiKey && openaiKey.startsWith("sk-")) {
    headers["x-fm-openai-key"] = openaiKey;
  }

  if (installId) {
    headers["x-fm-install-id"] = installId;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

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
    setStatus("Generate a reply first.", true);
    trackEvent("copy_clicked", { status: "error", errorCategory: "no_reply" });
    return;
  }

  trackEvent("copy_clicked", { outputChars: reply.length });

  try {
    await navigator.clipboard.writeText(reply);
    setStatus("Copied.", false);
  } catch (error) {
    try {
      elements.replyOutput.select();
      const ok = document.execCommand("copy");
      window.getSelection()?.removeAllRanges();

      if (!ok) {
        throw new Error("Clipboard write rejected.");
      }

      setStatus("Copied.", false);
    } catch (fallbackError) {
      const userError = toUserError(fallbackError || error, "copy");
      setStatus(userError.message, true);
      trackEvent("copy_clicked", { status: "error", errorCategory: userError.category });
    }
  }
}

async function insertReplyIntoPage() {
  const reply = elements.replyOutput.value.trim();

  if (!reply) {
    setStatus("Generate a reply first.", true);
    trackEvent("insert_clicked", { status: "error", errorCategory: "no_reply" });
    return;
  }

  trackEvent("insert_clicked", { outputChars: reply.length, source: currentPageContext?.source || "" });
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
    await renderTesterViews();

    setStatus("Inserted. Review before sending.", false);
  } catch (error) {
    const userError = toUserError(error, "insert");
    setStatus(userError.message, true);
    trackEvent("insert_clicked", {
      status: "error",
      errorCategory: userError.category,
      source: currentPageContext?.source || ""
    });
  }
}

async function refreshPageContextSilently() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tab?.id) {
      return;
    }

    const pageContext = await askContentScriptForPageContext(tab.id);

    if (pageContext?.__fmError) {
      return;
    }

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
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateProjectHint();
  await renderTesterViews();
  setStatus("Memory update accepted.", false);
  trackEvent("pending_memory_accepted", { target: update.target || "", field: update.field || "" });
}

async function rejectPendingMemoryUpdate(updateId) {
  const update = pendingMemoryUpdates.find((item) => item.id === updateId);
  pendingMemoryUpdates = pendingMemoryUpdates.filter((item) => item.id !== updateId);
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  setStatus("Memory update rejected.", false);
  trackEvent("pending_memory_rejected", { target: update?.target || "", field: update?.field || "" });
}

async function acceptAllPendingMemoryUpdates() {
  const updateIds = pendingMemoryUpdates.map((update) => update.id);
  const acceptedCount = updateIds.length;

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
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateProjectHint();
  await renderTesterViews();
  setStatus("All memory updates accepted.", false);
  trackEvent("pending_memory_accepted", { bulk: true, count: acceptedCount });
}

async function rejectAllPendingMemoryUpdates() {
  const rejectedCount = pendingMemoryUpdates.length;
  pendingMemoryUpdates = [];
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  setStatus("All memory updates rejected.", false);
  trackEvent("pending_memory_rejected", { bulk: true, count: rejectedCount });
}

async function resetClientMemory() {
  if (!confirmResetAction("client", "Click Reset client again to confirm.")) {
    return;
  }

  const clientId = currentClientMemory?.id;

  if (clientId) {
    const clients = await loadClientMemories();
    const sessions = await loadSessions();
    const projects = await loadProjectMemories();
    await chrome.storage.local.set({
      [storageKeys.clients]: clients.filter((client) => client.id !== clientId),
      [storageKeys.sessions]: sessions.filter((session) => session.clientId !== clientId),
      [storageKeys.projects]: projects.filter((project) => project.clientId !== clientId)
    });
  }

  currentClientMemory = null;
  currentProjectMemory = null;
  currentSession = null;
  pendingMemoryUpdates = pendingMemoryUpdates.filter((update) => update.target !== "client" && update.target !== "project");
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateProjectHint();
  await renderTesterViews();
  setStatus("Client context reset.", false);
}

async function resetProjectMemory() {
  if (!confirmResetAction("project", "Click Reset project again to confirm.")) {
    return;
  }

  const projectId = currentProjectMemory?.id;

  if (projectId) {
    const projects = await loadProjectMemories();
    const sessions = await loadSessions();
    await chrome.storage.local.set({
      [storageKeys.projects]: projects.filter((project) => project.id !== projectId),
      [storageKeys.sessions]: sessions.filter((session) => session.projectId !== projectId)
    });
  }

  currentProjectMemory = null;
  currentSession = null;
  pendingMemoryUpdates = pendingMemoryUpdates.filter((update) => update.target !== "project");
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateProjectHint();
  await renderTesterViews();
  setStatus("Project context reset.", false);
}

async function resetAllContextMemory() {
  if (!confirmResetAction("all", "Click Reset all context again to confirm.")) {
    return;
  }

  currentPageContext = null;
  currentClientMemory = null;
  currentProjectMemory = null;
  currentSession = null;
  pendingMemoryUpdates = [];
  result = null;
  elements.inputText.value = "";
  elements.replyOutput.value = "";
  elements.replyMeta.hidden = true;
  elements.replyMeta.textContent = "";
  elements.intentBadge.textContent = "waiting";
  elements.confidenceBadge.textContent = "auto";
  renderRisk(null);
  elements.analysisBox.hidden = true;
  elements.analysisBox.replaceChildren();

  await chrome.storage.local.remove([
    storageKeys.clients,
    storageKeys.projects,
    storageKeys.sessions,
    storageKeys.pendingUpdates,
    storageKeys.pageContext,
    storageKeys.lastSelection,
    storageKeys.lastResult,
    storageKeys.draft
  ]);

  renderPendingMemoryUpdates();
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateInputEmptyState();
  updateProjectHint();
  updateReplyActions();
  await renderTesterViews();
  setStatus("All context memory reset.", false);
}

function confirmResetAction(action, message) {
  if (pendingResetAction !== action) {
    pendingResetAction = action;
    setStatus(message, false);
    return false;
  }

  pendingResetAction = "";
  return true;
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
  await renderTesterViews();
  setStatus("Project memory saved.", false);
}

async function handleClientFieldChange(event) {
  const key = event.target.dataset.clientKey;

  if (!key) {
    return;
  }

  const now = new Date().toISOString();
  const base =
    currentClientMemory || {
      id: crypto.randomUUID(),
      name: "New client",
      company: "",
      emailOrHandle: "",
      source: normalizeSource(currentPageContext?.source),
      lastSeenUrl: currentPageContext?.pageUrl || "",
      notes: [],
      status: "lead",
      createdAt: now,
      updatedAt: now
    };
  const kind = event.target.dataset.clientKind;
  const value = kind === "list" ? normalizeStringList(event.target.value) : event.target.value;

  currentClientMemory = await saveClientMemory({
    ...base,
    [key]: key === "source" ? normalizeSource(value) : value,
    updatedAt: now
  });
  renderClientValues();
  renderMemorySnapshot();
  await renderTesterViews();
  setStatus("Client memory saved.", false);
}

function renderClientValues() {
  for (const [key, , , , kind] of clientFields) {
    const control = document.querySelector(`#client-${key}`);

    if (!control) {
      continue;
    }

    const value = currentClientMemory?.[key];
    control.value = kind === "list" ? normalizeStringList(value).join("\n") : value || (kind === "source" ? "generic" : kind === "clientStatus" ? "lead" : "");
  }
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

async function renderContextSelectors() {
  const [clients, projects] = await Promise.all([loadClientMemories(), loadProjectMemories()]);
  const clientOptions = [
    buildSelectOption("", "No client selected"),
    ...clients.map((client) => buildSelectOption(client.id, [client.name || "Unknown client", client.company, client.emailOrHandle].filter(Boolean).join(" - ")))
  ];
  const projectOptions = [
    buildSelectOption("", "No project selected"),
    ...projects.map((project) => {
      const client = clients.find((item) => item.id === project.clientId);
      const label = [project.title || "Client project", client?.name ? `for ${client.name}` : ""].filter(Boolean).join(" ");
      return buildSelectOption(project.id, label);
    })
  ];

  elements.activeClientSelect.replaceChildren(...clientOptions);
  elements.activeProjectSelect.replaceChildren(...projectOptions);
  elements.activeClientSelect.value = currentClientMemory?.id || "";
  elements.activeProjectSelect.value = currentProjectMemory?.id || "";
}

function buildSelectOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

async function handleActiveClientSelectChange() {
  const clientId = elements.activeClientSelect.value;

  if (!clientId) {
    currentClientMemory = null;
    currentProjectMemory = null;
    currentSession = null;
    renderClientValues();
    renderProjectValues();
    renderMemorySnapshot();
    updateSessionHint();
    updateProjectHint();
    await renderTesterViews();
    setStatus("No active client selected.", false);
    return;
  }

  await activateClientMemory(clientId);
  showSavedInfoTab("client");
}

async function handleActiveProjectSelectChange() {
  const projectId = elements.activeProjectSelect.value;

  if (!projectId) {
    currentProjectMemory = null;
    currentSession = await getSessionForClientOrProject(currentClientMemory?.id, "");
    renderProjectValues();
    renderMemorySnapshot();
    updateSessionHint();
    updateProjectHint();
    await renderTesterViews();
    setStatus("No active project selected.", false);
    return;
  }

  await activateProjectMemory(projectId);
  showSavedInfoTab("project");
}

function renderMemorySnapshot() {
  if (!elements.memorySnapshot) {
    return;
  }

  const labelByKey = new Map(contextFields.map(([key, label]) => [key, label]));
  const filledBusinessFields = importantFields.filter((field) => context[field]?.trim()).map((field) => labelByKey.get(field) || field);
  const clientText = currentClientMemory
    ? [currentClientMemory.name || "Unknown client", currentClientMemory.company, currentClientMemory.emailOrHandle, currentClientMemory.status]
        .filter(Boolean)
        .join(" - ")
    : "No active client yet. Use page or choose one in Memory.";
  const projectText = currentProjectMemory
    ? [currentProjectMemory.title || "Client project", currentProjectMemory.budget, currentProjectMemory.timeline, currentProjectMemory.nextStep]
        .filter(Boolean)
        .join(" - ")
    : "No active project yet. Use page or choose one in Memory.";
  const businessText = filledBusinessFields.length
    ? `${filledBusinessFields.length}/${importantFields.length} key fields filled: ${filledBusinessFields.join(", ")}`
    : "Add your services, pricing, and voice in Memory.";

  elements.memorySnapshot.replaceChildren(
    buildSummaryRow("Active client", clientText, !currentClientMemory),
    buildSummaryRow("Active project", projectText, !currentProjectMemory),
    buildSummaryRow("Business memory", businessText, !filledBusinessFields.length)
  );
}

function buildSummaryRow(label, value, isEmpty = false) {
  const row = document.createElement("article");
  row.className = isEmpty ? "summary-row empty" : "summary-row";
  const labelNode = document.createElement("strong");
  labelNode.textContent = label;
  const valueNode = document.createElement("p");
  valueNode.textContent = value;
  row.append(labelNode, valueNode);
  return row;
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

async function renderTesterViews() {
  await Promise.all([renderContextSelectors(), renderAllClientsView(), renderAllProjectsView(), renderSessionTester()]);
}

async function renderAllClientsView() {
  const [clients, projects] = await Promise.all([loadClientMemories(), loadProjectMemories()]);

  elements.clientsEmpty.hidden = clients.length > 0;
  elements.clientsList.replaceChildren(
    ...clients.map((client) => {
      const relatedProjects = projects.filter((project) => project.clientId === client.id);
      const card = buildMemoryListCard({
        id: client.id,
        type: "client",
        title: client.name || "Unknown client",
        status: client.status || "lead",
        active: client.id === currentClientMemory?.id,
        rows: [
          ["Source", client.source || "generic"],
          ["Email/handle", client.emailOrHandle || "empty"],
          ["Company", client.company || "empty"],
          ["Updated", formatRelativeTime(client.updatedAt)]
        ],
        groups: [
          {
            label: "Recent notes",
            items: client.notes || []
          },
          {
            label: "Projects",
            items: relatedProjects.map((project) => project.title)
          }
        ],
        actions: [
          ["reset-client", "Reset"],
          ["delete-client", "Delete"]
        ]
      });

      return card;
    })
  );
}

async function renderAllProjectsView() {
  const [clients, projects] = await Promise.all([loadClientMemories(), loadProjectMemories()]);

  elements.projectsEmpty.hidden = projects.length > 0;
  elements.projectsList.replaceChildren(
    ...projects.map((project) => {
      const client = clients.find((item) => item.id === project.clientId);
      const scopeCount = (project.includedScope?.length || 0) + (project.excludedScope?.length || 0);
      const riskCount = project.risks?.length || 0;

      return buildMemoryListCard({
        id: project.id,
        type: "project",
        title: project.title || "Client project",
        status: project.status || "discovery",
        active: project.id === currentProjectMemory?.id,
        rows: [
          ["Client", client ? client.name : project.clientId ? "missing client" : "unlinked"],
          ["Budget", project.budget || "empty"],
          ["Timeline", project.timeline || "empty"],
          ["Scope", `${scopeCount} item${scopeCount === 1 ? "" : "s"}`],
          ["Risks", `${riskCount}`],
          ["Updated", formatRelativeTime(project.updatedAt)]
        ],
        groups: [
          {
            label: "Next step",
            items: project.nextStep ? [project.nextStep] : []
          }
        ],
        actions: [
          ["reset-project", "Reset"],
          ["delete-project", "Delete"]
        ]
      });
    })
  );
}

function buildMemoryListCard({ id, type, title, status, active, rows, groups, actions }) {
  const card = document.createElement("article");
  card.className = "memory-card";
  card.dataset[type === "client" ? "clientId" : "projectId"] = id;
  card.dataset.active = String(Boolean(active));

  const top = document.createElement("header");
  const heading = document.createElement("h3");
  heading.textContent = title;
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = status.replaceAll("_", " ");
  top.append(heading, pill);

  const meta = document.createElement("div");
  meta.className = "memory-meta";

  for (const [label, value] of rows) {
    const row = document.createElement("p");
    const labelNode = document.createElement("strong");
    labelNode.textContent = `${label}: `;
    row.append(labelNode, document.createTextNode(value || "empty"));
    meta.append(row);
  }

  const actionRow = document.createElement("div");
  actionRow.className = "pending-actions";

  for (const [action, label] of actions) {
    const button = document.createElement("button");
    button.className = action.startsWith("delete") ? "button danger" : "button secondary";
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = id;
    button.textContent = label;
    actionRow.append(button);
  }

  card.append(top, meta, ...buildMemoryGroups(groups), actionRow);
  return card;
}

function buildMemoryGroups(groups) {
  return groups
    .map((group) => {
      const items = normalizeStringList(group.items).slice(-4);

      if (!items.length) {
        return null;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "mini-list";

      for (const item of items) {
        const row = document.createElement("span");
        row.textContent = `${group.label}: ${item}`;
        wrapper.append(row);
      }

      return wrapper;
    })
    .filter(Boolean);
}

async function handleClientsListClick(event) {
  const button = event.target.closest("button[data-action][data-id]");

  if (button) {
    await handleClientAction(button.dataset.action, button.dataset.id);
    return;
  }

  const card = event.target.closest("[data-client-id]");

  if (!card) {
    return;
  }

  await activateClientMemory(card.dataset.clientId);
}

async function handleProjectsListClick(event) {
  const button = event.target.closest("button[data-action][data-id]");

  if (button) {
    await handleProjectAction(button.dataset.action, button.dataset.id);
    return;
  }

  const card = event.target.closest("[data-project-id]");

  if (!card) {
    return;
  }

  await activateProjectMemory(card.dataset.projectId);
}

async function activateClientMemory(clientId) {
  const [clients, projects] = await Promise.all([loadClientMemories(), loadProjectMemories()]);
  const client = clients.find((item) => item.id === clientId);

  if (!client) {
    return;
  }

  currentClientMemory = client;
  currentProjectMemory = projects.find((project) => project.clientId === client.id) || null;
  currentSession = await getSessionForClientOrProject(currentClientMemory?.id, currentProjectMemory?.id);
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateSessionHint();
  updateProjectHint();
  updateReplyActions();
  await renderTesterViews();
  setStatus(`Active client: ${client.name || "Unknown client"}.`, false);
}

async function activateProjectMemory(projectId) {
  const [clients, projects] = await Promise.all([loadClientMemories(), loadProjectMemories()]);
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    return;
  }

  currentProjectMemory = project;
  currentClientMemory = clients.find((client) => client.id === project.clientId) || currentClientMemory;
  currentSession = await getSessionForClientOrProject(currentClientMemory?.id, currentProjectMemory?.id);
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateSessionHint();
  updateProjectHint();
  updateReplyActions();
  await renderTesterViews();
  setStatus(`Active project: ${project.title}.`, false);
}

async function handleClientAction(action, clientId) {
  if (action === "delete-client") {
    await deleteClientMemoryById(clientId);
    return;
  }

  await resetClientMemoryById(clientId);
}

async function handleProjectAction(action, projectId) {
  if (action === "delete-project") {
    await deleteProjectMemoryById(projectId);
    return;
  }

  await resetProjectMemoryById(projectId);
}

async function deleteClientMemoryById(clientId) {
  const [clients, projects, sessions] = await Promise.all([loadClientMemories(), loadProjectMemories(), loadSessions()]);
  const relatedProjectIds = new Set(projects.filter((project) => project.clientId === clientId).map((project) => project.id));
  await chrome.storage.local.set({
    [storageKeys.clients]: clients.filter((client) => client.id !== clientId),
    [storageKeys.projects]: projects.filter((project) => project.clientId !== clientId),
    [storageKeys.sessions]: sessions.filter((session) => session.clientId !== clientId)
  });

  if (currentClientMemory?.id === clientId) {
    currentClientMemory = null;
    currentProjectMemory = null;
    currentSession = null;
  }

  pendingMemoryUpdates = pendingMemoryUpdates.filter((update) => update.targetId !== clientId && !relatedProjectIds.has(update.targetId));
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateSessionHint();
  updateProjectHint();
  setStatus("Client deleted.", false);
}

async function resetClientMemoryById(clientId) {
  const clients = await loadClientMemories();
  const client = clients.find((item) => item.id === clientId);

  if (!client) {
    return;
  }

  const nextClient = await saveClientMemory({
    ...client,
    notes: [],
    status: "lead"
  });

  if (currentClientMemory?.id === clientId) {
    currentClientMemory = nextClient;
    renderClientValues();
    renderMemorySnapshot();
  }

  setStatus("Client reset.", false);
}

async function deleteProjectMemoryById(projectId) {
  const [projects, sessions] = await Promise.all([loadProjectMemories(), loadSessions()]);
  await chrome.storage.local.set({
    [storageKeys.projects]: projects.filter((project) => project.id !== projectId),
    [storageKeys.sessions]: sessions.filter((session) => session.projectId !== projectId)
  });

  if (currentProjectMemory?.id === projectId) {
    currentProjectMemory = null;
    currentSession = null;
  }

  pendingMemoryUpdates = pendingMemoryUpdates.filter((update) => update.targetId !== projectId);
  await syncPendingMemoryUpdates();
  renderPendingMemoryUpdates();
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateSessionHint();
  updateProjectHint();
  setStatus("Project deleted.", false);
}

async function resetProjectMemoryById(projectId) {
  const projects = await loadProjectMemories();
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    return;
  }

  const nextProject = await saveProjectMemory({
    ...project,
    budget: "",
    timeline: "",
    status: "discovery",
    includedScope: [],
    excludedScope: [],
    paymentTerms: "",
    agreedFacts: [],
    risks: [],
    nextStep: ""
  });

  if (currentProjectMemory?.id === projectId) {
    currentProjectMemory = nextProject;
    renderProjectValues();
    renderMemorySnapshot();
    updateProjectHint();
  }

  setStatus("Project reset.", false);
}

async function getSessionForClientOrProject(clientId, projectId) {
  const sessions = await loadSessions();
  const now = Date.now();

  return (
    sessions.find((session) => projectId && session.projectId === projectId && session.expiresAt > now) ||
    sessions.find((session) => clientId && session.clientId === clientId && session.expiresAt > now) ||
    null
  );
}

async function refreshSessionTester() {
  await cleanExpiredSessions();

  if (currentPageContext) {
    currentSession = await getSessionForPage(currentPageContext);
  }

  currentSession = currentSession || (await getSessionForClientOrProject(currentClientMemory?.id, currentProjectMemory?.id));
  await renderSessionTester();
  updateSessionHint();
  setStatus("Session refreshed.", false);
}

async function clearActiveSession() {
  const session = await getVisibleSession();

  if (!session?.id) {
    setStatus("No active session to clear.", false);
    return;
  }

  const sessions = await loadSessions();
  await chrome.storage.local.set({ [storageKeys.sessions]: sessions.filter((item) => item.id !== session.id) });

  if (currentSession?.id === session.id) {
    currentSession = null;
  }

  await renderSessionTester();
  updateSessionHint();
  setStatus("Session cleared.", false);
}

async function expireActiveSession() {
  const session = await getVisibleSession();

  if (!session?.id) {
    setStatus("No active session to expire.", false);
    return;
  }

  const sessions = await loadSessions();
  await chrome.storage.local.set({
    [storageKeys.sessions]: sessions.map((item) => (item.id === session.id ? { ...item, expiresAt: Date.now() - 1000 } : item))
  });
  await cleanExpiredSessions();

  if (currentSession?.id === session.id) {
    currentSession = null;
  }

  await renderSessionTester();
  updateSessionHint();
  setStatus("Session expired.", false);
}

async function renderSessionTester() {
  const [clients, projects] = await Promise.all([loadClientMemories(), loadProjectMemories()]);
  const session = await getVisibleSession();
  elements.sessionEmpty.hidden = Boolean(session);

  if (!session) {
    elements.sessionDetails.replaceChildren();
    return;
  }

  const client = clients.find((item) => item.id === session.clientId);
  const project = projects.find((item) => item.id === session.projectId);
  const minutesLeft = Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 60000));
  const card = buildMemoryListCard({
    id: session.id,
    type: "project",
    title: session.domain || "Active session",
    status: `${minutesLeft} min left`,
    active: true,
    rows: [
      ["Page URL", session.pageUrl || "empty"],
      ["Client", client ? client.name : session.clientId || "unlinked"],
      ["Project", project ? project.title : session.projectId || "unlinked"],
      ["Last instruction", session.lastUserInstruction || "empty"],
      ["Next step", session.nextStep || "empty"]
    ],
    groups: [
      {
        label: "Last client message",
        items: session.lastClientMessage ? [session.lastClientMessage] : []
      },
      {
        label: "Last generated reply",
        items: session.lastGeneratedReply ? [session.lastGeneratedReply] : []
      },
      {
        label: "Facts",
        items: session.facts || []
      }
    ],
    actions: []
  });

  elements.sessionDetails.replaceChildren(card);
}

async function getVisibleSession() {
  const sessions = await loadSessions();
  const now = Date.now();
  const freshSessions = sessions.filter((session) => session.expiresAt > now);

  if (currentSession?.id) {
    const matching = freshSessions.find((session) => session.id === currentSession.id);

    if (matching) {
      return matching;
    }
  }

  if (currentPageContext) {
    const pageSession = await getSessionForPage(currentPageContext);

    if (pageSession) {
      return pageSession;
    }
  }

  return (
    freshSessions.find((session) => currentProjectMemory?.id && session.projectId === currentProjectMemory.id) ||
    freshSessions.find((session) => currentClientMemory?.id && session.clientId === currentClientMemory.id) ||
    freshSessions[0] ||
    null
  );
}

async function handleImportFileChange() {
  const file = elements.importFile.files?.[0];

  if (!file) {
    return;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!["txt", "md", "json"].includes(extension || "")) {
    elements.importStatus.textContent = "Use a .txt, .md, or .json file.";
    elements.importStatus.classList.add("error");
    return;
  }

  elements.importText.value = await file.text();
  elements.importStatus.textContent = `Loaded ${file.name}.`;
  elements.importStatus.classList.remove("error");
}

async function importExistingContext() {
  const rawText = elements.importText.value.trim();
  const target = elements.importTarget.value;
  const source = normalizeSource(elements.importSource.value);
  const parsed = parseImportContext(rawText);
  const now = new Date().toISOString();
  let importedClient = currentClientMemory;
  let importedProject = currentProjectMemory;

  if (!rawText && !elements.importClientName.value.trim() && !elements.importProjectTitle.value.trim()) {
    setImportStatus("Paste context or fill at least one field.", true);
    return;
  }

  if (target !== "project") {
    const clients = await loadClientMemories();
    const name = trimStorageText(elements.importClientName.value || parsed.clientName || parsed.company || parsed.emailOrHandle || "Imported client", 140);
    const emailOrHandle = trimStorageText(elements.importEmailHandle.value || parsed.emailOrHandle || "", 160);
    const company = trimStorageText(elements.importCompany.value || parsed.company || "", 140);
    const existing = findMatchingClient(clients, { source, name, emailOrHandle, pageUrl: "" });

    importedClient = await saveClientMemory({
      id: existing?.id || crypto.randomUUID(),
      name: name || existing?.name || "Imported client",
      company: company || existing?.company || "",
      emailOrHandle: emailOrHandle || existing?.emailOrHandle || "",
      source,
      lastSeenUrl: existing?.lastSeenUrl || "",
      notes: mergeFacts(existing?.notes || [], parsed.notes),
      status: existing?.status || parsed.status || "lead",
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
  }

  if (target !== "client" && hasImportProjectContext(parsed)) {
    const projects = await loadProjectMemories();
    const title = trimStorageText(elements.importProjectTitle.value || parsed.projectTitle || "Imported project", 160);
    const existing =
      projects.find((project) => importedClient?.id && project.clientId === importedClient.id && normalizeClientKey(project.title) === normalizeClientKey(title)) ||
      projects.find((project) => normalizeClientKey(project.title) === normalizeClientKey(title));

    importedProject = await saveProjectMemory({
      id: existing?.id || crypto.randomUUID(),
      clientId: importedClient?.id || existing?.clientId || "",
      title: title || existing?.title || "Imported project",
      budget: parsed.budget || existing?.budget || "",
      timeline: parsed.timeline || existing?.timeline || "",
      status: projectStatuses.includes(normalizeImportStatus(parsed.status)) ? normalizeImportStatus(parsed.status) : existing?.status || "discovery",
      includedScope: mergeFacts(existing?.includedScope || [], parsed.includedScope),
      excludedScope: mergeFacts(existing?.excludedScope || [], parsed.excludedScope),
      paymentTerms: parsed.paymentTerms || existing?.paymentTerms || "",
      agreedFacts: mergeFacts(existing?.agreedFacts || [], parsed.agreedFacts),
      risks: mergeFacts(existing?.risks || [], parsed.risks),
      nextStep: parsed.nextStep || existing?.nextStep || "",
      sourceUrls: existing?.sourceUrls || [],
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
  }

  currentClientMemory = importedClient;
  currentProjectMemory = importedProject;
  renderClientValues();
  renderProjectValues();
  renderMemorySnapshot();
  updateProjectHint();
  await renderTesterViews();
  setImportStatus("Imported to Chrome storage. No AI used.", false);
  setStatus("Existing context imported.", false);
}

function parseImportContext(rawText) {
  const text = stringifyImportInput(rawText);
  const parsed = {
    clientName: "",
    company: "",
    emailOrHandle: "",
    projectTitle: "",
    status: "",
    budget: "",
    timeline: "",
    includedScope: [],
    excludedScope: [],
    paymentTerms: "",
    agreedFacts: [],
    risks: [],
    nextStep: "",
    notes: []
  };
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let section = "";

  for (const line of lines) {
    const clean = stripListMarker(line);
    const labelMatch = clean.match(/^([a-z][a-z\s/_-]{1,40}):\s*(.*)$/i);
    const label = labelMatch ? labelMatch[1].trim().toLowerCase() : "";
    const value = trimStorageText(labelMatch ? labelMatch[2] : clean, 240);

    if (label) {
      section = getImportSection(label);
      applyImportLabeledValue(parsed, section, value);
      continue;
    }

    if (section && value) {
      appendImportSectionValue(parsed, section, value);
      continue;
    }

    applyImportFreeformLine(parsed, value);
  }

  parsed.emailOrHandle = parsed.emailOrHandle || text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || text.match(/@\w{2,30}/)?.[0] || "";
  parsed.notes = normalizeStringList(parsed.notes.length ? parsed.notes : lines.slice(0, 6));

  return parsed;
}

function stringifyImportInput(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    return flattenJsonForImport(parsed).join("\n");
  } catch {
    return rawText;
  }
}

function flattenJsonForImport(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenJsonForImport(item, prefix));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => flattenJsonForImport(child, prefix ? `${prefix} ${key}` : key));
  }

  return [`${prefix}: ${String(value || "")}`];
}

function stripListMarker(value) {
  return String(value || "").replace(/^[-*•]\s*/, "").trim();
}

function getImportSection(label) {
  if (/^client|client name|name$/.test(label)) return "clientName";
  if (/company|business|organization/.test(label)) return "company";
  if (/email|handle|contact/.test(label)) return "emailOrHandle";
  if (/project|project title|title/.test(label)) return "projectTitle";
  if (/status/.test(label)) return "status";
  if (/budget|price|cost|quote|rate/.test(label)) return "budget";
  if (/timeline|deadline|due|delivery|launch/.test(label)) return "timeline";
  if (/excluded|out of scope|not included/.test(label)) return "excludedScope";
  if (/included|included scope|deliverables|scope|features|pages/.test(label)) return "includedScope";
  if (/payment|deposit|upfront|milestone|invoice/.test(label)) return "paymentTerms";
  if (/risk|red flag|concern|blocker/.test(label)) return "risks";
  if (/next|next step|todo|follow/.test(label)) return "nextStep";
  return "agreedFacts";
}

function normalizeImportStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function applyImportLabeledValue(parsed, section, value) {
  if (!value) {
    return;
  }

  if (["includedScope", "excludedScope", "risks", "agreedFacts"].includes(section)) {
    appendImportSectionValue(parsed, section, value);
    return;
  }

  parsed[section] = value;
}

function appendImportSectionValue(parsed, section, value) {
  if (["includedScope", "excludedScope", "risks", "agreedFacts"].includes(section)) {
    parsed[section] = mergeFacts(parsed[section], splitInlineList(value));
    return;
  }

  parsed[section] = parsed[section] || value;
}

function splitInlineList(value) {
  return normalizeStringList(String(value || "").split(/\s*(?:,|;|\|)\s*/));
}

function applyImportFreeformLine(parsed, value) {
  const classified = classifyProjectFact(value);

  if (!classified.reviewWorthy) {
    parsed.agreedFacts = mergeFacts(parsed.agreedFacts, [value]);
    return;
  }

  if (Array.isArray(classified.value)) {
    parsed[classified.field] = mergeFacts(parsed[classified.field], classified.value);
    return;
  }

  parsed[classified.field] = parsed[classified.field] || classified.value;
}

function hasImportProjectContext(parsed) {
  return Boolean(
    elements.importProjectTitle.value.trim() ||
      parsed.projectTitle ||
      parsed.budget ||
      parsed.timeline ||
      parsed.paymentTerms ||
      parsed.nextStep ||
      parsed.includedScope.length ||
      parsed.excludedScope.length ||
      parsed.risks.length ||
      parsed.agreedFacts.length
  );
}

function setImportStatus(message, isError) {
  elements.importStatus.textContent = message;
  elements.importStatus.classList.toggle("error", Boolean(isError));
}

function formatRelativeTime(value) {
  const time = Date.parse(value || "");

  if (!time) {
    return "unknown";
  }

  const diffMs = Date.now() - time;
  const minutes = Math.max(0, Math.round(diffMs / 60000));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);

  if (hours < 48) return `${hours}h ago`;

  return new Date(time).toLocaleDateString();
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

  if (elements.replyEmpty) {
    elements.replyEmpty.hidden = hasReply;
  }

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

function updateInputEmptyState() {
  if (!elements.pageHint) {
    return;
  }

  const hasText = Boolean(elements.inputText?.value.trim());

  if (!hasText) {
    setPageHint("Highlight a client message or click Use page.", true);
    return;
  }

  if (!currentPageContext && elements.pageHint.classList.contains("empty-state")) {
    setPageHint("Client message ready.", false);
  }
}

function setPageHint(message, isEmpty) {
  elements.pageHint.textContent = message;
  elements.pageHint.classList.toggle("empty-state", Boolean(isEmpty));
  elements.pageHint.classList.toggle("compact-state", Boolean(isEmpty));
  elements.pageHint.classList.toggle("hint", !isEmpty);
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

function readableError(error, context = "") {
  return toUserError(error, context).message;
}

function toUserError(error, context = "") {
  const rawMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong.";
  const lower = rawMessage.toLowerCase();
  const ctx = String(context || "").toLowerCase();

  if (rawMessage) {
    console.warn(`[FM] ${context || "error"}:`, rawMessage);
  }

  if (lower.includes("unsupported page") || lower.includes("cannot access") || lower.includes("chrome://") || lower.includes("chrome-extension://")) {
    return { message: "Open a normal website tab to use Freelancer Memory here.", category: "unsupported_page" };
  }

  if (
    lower.includes("receiving end does not exist") ||
    lower.includes("content script") ||
    lower.includes("message port closed") ||
    lower.includes("could not establish connection")
  ) {
    return { message: "Refresh this page so Freelancer Memory can connect.", category: "content_script_missing" };
  }

  if (lower.includes("no useful page context") || lower.includes("no client message")) {
    return { message: "No client message found. Highlight a client message or click Use page.", category: "no_message" };
  }

  if (lower.includes("no active tab")) {
    return { message: "No active page found. Open the client conversation tab and try again.", category: "no_active_tab" };
  }

  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("aborted")) {
    return { message: "The reply took too long. Check your connection and try again.", category: "timeout" };
  }

  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("service unavailable")) {
    return { message: "Couldn’t reach the reply service. Check your connection and try again.", category: "api_unavailable" };
  }

  if (lower.includes("unauthorized") || lower.includes("forbidden")) {
    return { message: "The API rejected this request. Check the API settings.", category: "api_rejected" };
  }

  if (lower.includes("daily free limit") || lower.includes("rate_limited") || lower.includes("rate limit")) {
    return {
      message: "You’ve used today’s 35 free generations. Add your OpenAI key in Advanced for unlimited.",
      category: "rate_limited"
    };
  }

  if (lower.includes("openai returned") || lower.includes("invalid json") || lower.includes("unexpected shape")) {
    return { message: "The reply service returned a malformed response. Try again in a minute.", category: "malformed_response" };
  }

  if (lower.includes("generation failed") || lower.includes("internal server error") || lower.includes("openai request failed")) {
    return { message: "Couldn’t generate a reply. Check your connection and try again.", category: "generation_failed" };
  }

  if (lower.includes("no editable reply box") || lower.includes("could not insert") || ctx === "insert" || lower.includes("insert")) {
    return { message: "Insert failed. Click into the reply box on the page, then try Insert again.", category: "insert_failed" };
  }

  if (ctx === "copy" || lower.includes("clipboard") || lower.includes("write text")) {
    return { message: "Couldn’t copy. Select the reply and use Cmd+C.", category: "copy_failed" };
  }

  if (lower.includes("storage")) {
    return { message: "Couldn’t save to local storage. Restart Chrome and try again.", category: "storage_failed" };
  }

  if (lower.includes("empty") || lower.includes("missing client message")) {
    return { message: "Add or highlight a client message first.", category: "empty_input" };
  }

  return { message: rawMessage, category: "unknown" };
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
      installId: installId || "",
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
    console.warn("[FM] trackEvent failed:", storageError?.message || storageError);
  }
}

function getHostnameSafe(url) {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

async function loadDiagnostics() {
  try {
    const stored = await chrome.storage.local.get(storageKeys.diagnostics);
    const list = Array.isArray(stored[storageKeys.diagnostics]) ? stored[storageKeys.diagnostics] : [];
    return list;
  } catch (error) {
    console.warn("[FM] loadDiagnostics failed:", error?.message || error);
    return [];
  }
}

async function renderDiagnostics() {
  if (!elements.diagnosticsList || !elements.diagnosticsEmpty) {
    return;
  }

  const list = await loadDiagnostics();
  const recent = list.slice(-10).reverse();

  if (!recent.length) {
    elements.diagnosticsList.replaceChildren();
    elements.diagnosticsEmpty.hidden = false;
    return;
  }

  elements.diagnosticsEmpty.hidden = true;
  elements.diagnosticsList.replaceChildren(
    ...recent.map((event) => {
      const card = document.createElement("div");
      card.className = "memory-list-item";

      const title = document.createElement("strong");
      title.textContent = event.name || "event";

      const meta = document.createElement("p");
      meta.className = "hint";
      const parts = [];
      if (event.createdAt) {
        parts.push(new Date(event.createdAt).toLocaleTimeString());
      }
      if (event.status) {
        parts.push(`status=${event.status}`);
      }
      if (event.durationMs) {
        parts.push(`${event.durationMs}ms`);
      }
      if (event.errorCategory) {
        parts.push(event.errorCategory);
      }
      if (event.source) {
        parts.push(event.source);
      }
      meta.textContent = parts.join(" · ") || "no metadata";

      card.append(title, meta);
      return card;
    })
  );
}

async function copyDiagnostics() {
  const list = await loadDiagnostics();
  const payload = list.map(sanitizeDiagnosticEvent);
  const text = JSON.stringify(payload, null, 2);

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Diagnostics copied.", false);
  } catch (error) {
    const userError = toUserError(error, "copy");
    setStatus(userError.message, true);
  }
}

async function clearDiagnostics() {
  await chrome.storage.local.set({ [storageKeys.diagnostics]: [] });
  await renderDiagnostics();
  setStatus("Diagnostics cleared.", false);
}

function sanitizeDiagnosticEvent(event) {
  const allowedKeys = [
    "name",
    "createdAt",
    "installId",
    "source",
    "durationMs",
    "status",
    "errorCategory",
    "forcedIntent",
    "detectedIntent",
    "riskLevel",
    "inputChars",
    "outputChars",
    "memoryScore",
    "field",
    "target",
    "bulk",
    "count"
  ];
  const safe = {};
  for (const key of allowedKeys) {
    if (event[key] !== undefined && event[key] !== null) {
      safe[key] = event[key];
    }
  }
  return safe;
}

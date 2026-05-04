import type { FreelancerContext, GeneratedResult, GenerateRequest, ContextPacket } from "@/lib/memory";
import { buildMemoryRiskContext, formatMemoryRiskContext } from "@/lib/memory-risk";

export const generationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "detectedIntent",
    "confidence",
    "riskLevel",
    "riskReason",
    "reply",
    "missingInfo",
    "recommendedNextStep",
    "memoryUpdates",
    "scopeAssessment",
    "contextUsed",
    "notes"
  ],
  properties: {
    detectedIntent: {
      type: "string",
      enum: [
        "new_lead",
        "first_reply",
        "pricing_reply",
        "scope",
        "scope_creep",
        "follow_up",
        "push_back",
        "profile_answer",
        "objection",
        "bad_fit",
        "unclear"
      ]
    },
    confidence: {
      type: "number"
    },
    riskLevel: {
      type: "string",
      enum: ["none", "low", "medium", "high"]
    },
    riskReason: {
      type: "string"
    },
    reply: {
      type: "string"
    },
    missingInfo: {
      type: "array",
      items: {
        type: "string"
      }
    },
    recommendedNextStep: {
      type: "string"
    },
    memoryUpdates: {
      type: "object",
      additionalProperties: false,
      required: ["clientFacts", "projectFacts", "scopeIncluded", "scopeExcluded", "risks", "needsConfirmation", "contradictions"],
      properties: {
        clientFacts: {
          type: "array",
          items: {
            type: "string"
          }
        },
        projectFacts: {
          type: "array",
          items: {
            type: "string"
          }
        },
        scopeIncluded: {
          type: "array",
          items: {
            type: "string"
          }
        },
        scopeExcluded: {
          type: "array",
          items: {
            type: "string"
          }
        },
        risks: {
          type: "array",
          items: {
            type: "string"
          }
        },
        needsConfirmation: {
          type: "array",
          items: {
            type: "string"
          }
        },
        contradictions: {
          type: "array",
          items: {
            type: "string"
          }
        }
      }
    },
    scopeAssessment: {
      type: "object",
      additionalProperties: false,
      required: [
        "acceptedScope",
        "proposedScope",
        "outOfScopeItems",
        "matchedExistingScope",
        "triggerPhrases",
        "needsConfirmation",
        "contradictions",
        "suggestedAction"
      ],
      properties: {
        acceptedScope: {
          type: "array",
          items: {
            type: "string"
          }
        },
        proposedScope: {
          type: "array",
          items: {
            type: "string"
          }
        },
        outOfScopeItems: {
          type: "array",
          items: {
            type: "string"
          }
        },
        matchedExistingScope: {
          type: "array",
          items: {
            type: "string"
          }
        },
        triggerPhrases: {
          type: "array",
          items: {
            type: "string"
          }
        },
        needsConfirmation: {
          type: "array",
          items: {
            type: "string"
          }
        },
        contradictions: {
          type: "array",
          items: {
            type: "string"
          }
        },
        suggestedAction: {
          type: "string"
        }
      }
    },
    contextUsed: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "name",
          "role",
          "niche",
          "shortBio",
          "services",
          "pricing",
          "proof",
          "portfolioLinks",
          "process",
          "availability",
          "paymentTerms",
          "boundaries",
          "voice",
          "clientMessage",
          "pageContext",
          "sessionMemory",
          "clientMemory",
          "projectMemory"
        ]
      }
    },
    notes: {
      type: "string"
    }
  }
} as const;

export function buildPrompt(request: GenerateRequest) {
  const { context, inputText, forcedIntent, userInstruction } = request;
  const contextPacket = request.contextPacket ?? null;
  const pageContext = contextPacket?.pageContext ?? request.pageContext ?? null;
  const sessionMemory = contextPacket?.sessionMemory ?? request.sessionMemory ?? null;
  const clientMemory = contextPacket?.clientMemory ?? null;
  const projectMemory = contextPacket?.projectMemory ?? null;
  const source = getRequestSource(request);
  const compact = compactContext(context, inputText, forcedIntent, source);
  const riskContext = buildMemoryRiskContext(request);

  return [
    "You write copy-ready replies for a freelancer.",
    "Goal: answer the actual message in the right channel, sound human, and move the conversation forward only when that is natural.",
    contextPacket ? `Context packet: action=${contextPacket.action}, source=${contextPacket.source}` : "Context packet: legacy payload.",
    `Detected channel: ${source}`,
    getChannelBrief(source),
    "",
    "Freelancer memory (background, not mandatory copy):",
    compact.text || "No memory filled.",
    "",
    "Client memory:",
    formatClientMemory(clientMemory),
    "",
    "Project memory:",
    formatProjectMemory(projectMemory),
    "",
    formatMemoryRiskContext(riskContext),
    "",
    "Message to answer:",
    inputText,
    "",
    "Browser page context:",
    formatPageContext(pageContext),
    "",
    "2-hour session memory:",
    formatSessionMemory(sessionMemory),
    "",
    `Intent override: ${forcedIntent === "auto" ? "auto-detect" : forcedIntent}`,
    userInstruction.trim() ? `Extra instruction: ${userInstruction.trim()}` : "Extra instruction: none",
    "",
    "Rules:",
    "- Work in two passes internally: first extract explicit facts, then write the reply.",
    "- Answer the message in front of you. Do not turn every reply into a pitch.",
    "- Use saved memory only when it is directly relevant to the user's ask.",
    "- Never force website-building, freelance, pricing, portfolio, or service details into social replies unless the message asks about that.",
    "- No invented prices, proof, timelines, guarantees, availability, personal facts, or opinions.",
    "- If price is asked in a buying conversation: use saved pricing if present, but ask scope before final quote.",
    "- If extra work is asked in a client conversation: protect scope; offer add-on or scope swap.",
    "- Risk detection matters. Flag scope creep, vague budget, unrealistic timeline, missing payment terms, or contradictions against project memory.",
    "- Compare the latest ask against Project memory includedScope and excludedScope before deciding risk.",
    "- If possibleOutOfScopeItems is not empty, set detectedIntent to scope_creep unless the user forced another obvious intent.",
    "- If the latest ask adds work outside includedScope, set riskLevel to medium or high, explain why in riskReason, and suggest add-on pricing or scope swap in the reply.",
    "- Distinguish accepted scope from proposed scope. acceptedScope/scopeIncluded = already agreed or explicitly accepted in this reply. proposedScope = requested or discussed but not accepted yet.",
    "- scopeExcluded = explicitly rejected, explicitly out-of-scope, or already saved as excluded. Do not put every new request there.",
    "- memoryUpdates must contain only facts explicitly visible in the message, page context, saved memory, or current reply. No guesses.",
    "- Use needsConfirmation for budget, timeline, payment terms, included scope, proposed scope, and anything uncertain before saving.",
    "- Use contradictions when a new visible fact conflicts with saved project/client memory. Do not overwrite the old value in prose; ask for confirmation.",
    "- If deterministic hints show contradictions, include them in memoryUpdates.contradictions and scopeAssessment.contradictions.",
    "- Use client memory for continuity only when it clearly belongs to this person/thread.",
    "- If vague in email/marketplace/chat: ask 2-4 concrete questions. If vague on social: write a short natural reply, not an interrogation.",
    "- If bad fit: say so politely.",
    "- Match saved voice when present, but keep it native to the channel.",
    "- Keep the reply copy-ready.",
    "- Use session memory for continuity, but do not assume expired or missing facts.",
    "- contextUsed must list the exact memory fields used plus clientMessage. Include pageContext/sessionMemory when used.",
    "",
    "Return structured JSON only."
  ].join("\n");
}

export function getRequestSource(request: GenerateRequest) {
  const source = request.contextPacket?.source || request.contextPacket?.pageContext?.source || request.pageContext?.source || "generic";

  return normalizeSource(source);
}

function normalizeSource(source: string) {
  const allowedSources = new Set(["gmail", "linkedin", "upwork", "fiverr", "generic", "x", "whatsapp"]);
  const normalized = source.toLowerCase();

  return allowedSources.has(normalized) ? normalized : "generic";
}

function getChannelBrief(source: string) {
  if (source === "x") {
    return [
      "Channel behavior: X / Twitter.",
      "- Usually write one casual public reply, 1-2 short sentences.",
      "- React to the post like a real person. Be specific to the selected text.",
      "- No email greeting/signoff. No sales CTA. No freelancer pitch unless explicitly asked.",
      "- Avoid generic AI phrases like 'great insight', 'I completely agree', 'this is valuable', or 'thanks for sharing'."
    ].join("\n");
  }

  if (source === "gmail") {
    return [
      "Channel behavior: Gmail.",
      "- Write a natural email reply.",
      "- Use a greeting only when it fits the thread.",
      "- Keep paragraphs short and useful.",
      "- Include a next step when the thread needs one, not as a forced CTA."
    ].join("\n");
  }

  if (source === "whatsapp") {
    return [
      "Channel behavior: WhatsApp / chat.",
      "- Write like a short chat message.",
      "- No formal greeting/signoff.",
      "- Keep it warm, direct, and easy to send."
    ].join("\n");
  }

  if (source === "linkedin") {
    return [
      "Channel behavior: LinkedIn.",
      "- If replying to a public post, keep it short and conversational.",
      "- If replying to a DM, be professional but not stiff.",
      "- Do not pitch services unless the other person showed buying intent."
    ].join("\n");
  }

  if (source === "upwork" || source === "fiverr") {
    return [
      `Channel behavior: ${source === "upwork" ? "Upwork" : "Fiverr"}.`,
      "- Treat it as a client or marketplace conversation.",
      "- Be clear on fit, scope, budget, timeline, and next step.",
      "- Use proof only when it strengthens the answer."
    ].join("\n");
  }

  return [
    "Channel behavior: generic page.",
    "- Infer whether this is a social reply, email, chat, or client conversation from the page context and selected text.",
    "- If it looks like a public social post/comment, keep it short and human. Do not pitch.",
    "- If it looks like a client inquiry, use relevant business memory and move the deal forward."
  ].join("\n");
}

function formatClientMemory(clientMemory: NonNullable<GenerateRequest["contextPacket"]>["clientMemory"]) {
  if (!clientMemory) {
    return "No saved client memory.";
  }

  return [
    clientMemory.name ? `name: ${trimPromptText(clientMemory.name, 120)}` : "",
    clientMemory.company ? `company: ${trimPromptText(clientMemory.company, 120)}` : "",
    clientMemory.emailOrHandle ? `emailOrHandle: ${trimPromptText(clientMemory.emailOrHandle, 120)}` : "",
    clientMemory.source ? `source: ${clientMemory.source}` : "",
    clientMemory.status ? `status: ${clientMemory.status}` : "",
    clientMemory.notes.length ? `notes:\n${clientMemory.notes.slice(-6).map((note) => `- ${trimPromptText(note, 220)}`).join("\n")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function formatProjectMemory(projectMemory: NonNullable<GenerateRequest["contextPacket"]>["projectMemory"]) {
  if (!projectMemory) {
    return "No saved project memory.";
  }

  return [
    projectMemory.title ? `title: ${trimPromptText(projectMemory.title, 160)}` : "",
    projectMemory.budget ? `budget: ${trimPromptText(projectMemory.budget, 120)}` : "",
    projectMemory.timeline ? `timeline: ${trimPromptText(projectMemory.timeline, 120)}` : "",
    projectMemory.status ? `status: ${projectMemory.status}` : "",
    projectMemory.includedScope.length ? `includedScope: ${projectMemory.includedScope.join(", ")}` : "",
    projectMemory.excludedScope.length ? `excludedScope: ${projectMemory.excludedScope.join(", ")}` : "",
    projectMemory.nextStep ? `nextStep: ${trimPromptText(projectMemory.nextStep, 180)}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function formatPageContext(pageContext: GenerateRequest["pageContext"]) {
  if (!pageContext) {
    return "No browser context provided.";
  }

  return [
    `source: ${pageContext.source || "generic"}`,
    pageContext.pageTitle ? `pageTitle: ${trimPromptText(pageContext.pageTitle, 160)}` : "",
    pageContext.threadTitle ? `threadTitle: ${trimPromptText(pageContext.threadTitle, 160)}` : "",
    pageContext.clientName ? `clientName: ${trimPromptText(pageContext.clientName, 120)}` : "",
    pageContext.emailOrHandle ? `emailOrHandle: ${trimPromptText(pageContext.emailOrHandle, 120)}` : "",
    pageContext.latestClientMessage ? `latestClientMessage: ${trimPromptText(pageContext.latestClientMessage, 1200)}` : "",
    pageContext.selectedText ? `selectedText: ${trimPromptText(pageContext.selectedText, 1200)}` : "",
    pageContext.recentMessages?.length
      ? `recentMessages:\n${pageContext.recentMessages
          .slice(-5)
          .map((message) => `- ${message.author || "unknown"}: ${trimPromptText(message.text, 500)}`)
          .join("\n")}`
      : "",
    pageContext.replyBoxFound ? "replyBoxFound: true" : "replyBoxFound: false"
  ]
    .filter(Boolean)
    .join("\n");
}

function formatSessionMemory(sessionMemory: GenerateRequest["sessionMemory"]) {
  if (!sessionMemory) {
    return "No active session memory.";
  }

  return [
    sessionMemory.domain ? `domain: ${sessionMemory.domain}` : "",
    sessionMemory.facts.length ? `facts:\n${sessionMemory.facts.map((fact) => `- ${trimPromptText(fact, 220)}`).join("\n")}` : "",
    sessionMemory.lastClientMessage ? `lastClientMessage: ${trimPromptText(sessionMemory.lastClientMessage, 600)}` : "",
    sessionMemory.lastGeneratedReply ? `lastGeneratedReply: ${trimPromptText(sessionMemory.lastGeneratedReply, 900)}` : "",
    sessionMemory.lastUserInstruction ? `lastUserInstruction: ${trimPromptText(sessionMemory.lastUserInstruction, 220)}` : "",
    sessionMemory.nextStep ? `nextStep: ${trimPromptText(sessionMemory.nextStep, 220)}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function emptyResult(message: string): GeneratedResult {
  return {
    detectedIntent: "unclear",
    confidence: 0,
    riskLevel: "none",
    riskReason: "",
    reply: "",
    missingInfo: [],
    recommendedNextStep: message,
    memoryUpdates: {
      clientFacts: [],
      projectFacts: [],
      scopeIncluded: [],
      scopeExcluded: [],
      risks: [],
      needsConfirmation: [],
      contradictions: []
    },
    scopeAssessment: {
      acceptedScope: [],
      proposedScope: [],
      outOfScopeItems: [],
      matchedExistingScope: [],
      triggerPhrases: [],
      needsConfirmation: [],
      contradictions: [],
      suggestedAction: ""
    },
    contextUsed: [],
    notes: message
  };
}

export function compactContext(
  context: FreelancerContext,
  inputText: string,
  forcedIntent: GenerateRequest["forcedIntent"],
  source = "generic"
) {
  const lower = `${inputText} ${forcedIntent}`.toLowerCase();
  const socialSource = source === "x" || source === "linkedin";
  const selected = new Set<keyof FreelancerContext>(socialSource ? ["name", "voice"] : ["name", "role", "niche", "services", "boundaries", "voice"]);
  const businessIntent = matches(lower, [
    "hire",
    "project",
    "client",
    "freelance",
    "freelancer",
    "website",
    "landing page",
    "webflow",
    "shopify",
    "design",
    "develop",
    "build",
    "work with you",
    "can you help",
    "portfolio",
    "price",
    "pricing",
    "budget",
    "cost",
    "quote"
  ]);

  if (socialSource && businessIntent) {
    selected.add("role");
    selected.add("niche");
    selected.add("services");
    selected.add("boundaries");
  }

  if (!socialSource || businessIntent) {
    if (matches(lower, ["price", "pricing", "budget", "cost", "charge", "rate", "$", "cheap", "expensive"])) {
      selected.add("pricing");
      selected.add("paymentTerms");
    }

    if (matches(lower, ["portfolio", "proof", "case", "experience", "worked", "results", "fit", "example"])) {
      selected.add("proof");
      selected.add("portfolioLinks");
      selected.add("shortBio");
    }

    if (matches(lower, ["timeline", "deadline", "launch", "start", "available", "availability", "urgent", "rush", "when"])) {
      selected.add("availability");
      selected.add("process");
    }

    if (matches(lower, ["scope", "included", "also", "add", "extra", "revision", "quick", "change", "rewrite"])) {
      selected.add("process");
      selected.add("paymentTerms");
    }

    if (matches(lower, ["follow", "haven't heard", "checking", "silent", "no reply"])) {
      selected.add("process");
    }

    if (matches(lower, ["tell us", "about yourself", "bio", "profile", "application", "why you"])) {
      selected.add("shortBio");
      selected.add("proof");
      selected.add("portfolioLinks");
      selected.add("process");
    }
  }

  if (forcedIntent !== "auto" && (!socialSource || businessIntent)) {
    selected.add("pricing");
    selected.add("proof");
    selected.add("process");
    selected.add("availability");
    selected.add("paymentTerms");
  }

  const entries = Array.from(selected)
    .map((key) => [key, context[key].trim()] as const)
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => [key, trimField(value)] as const);

  return {
    fields: entries.map(([key]) => key),
    text: entries.map(([key, value]) => `${key}: ${value}`).join("\n")
  };
}

function matches(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function trimField(value: string) {
  return value.length > 420 ? `${value.slice(0, 420).trim()}...` : value;
}

function trimPromptText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

// ─── analyze-client ───────────────────────────────────────────────────────────

export const analyzeClientSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "clientMemoryPatch",
    "projectMemoryPatch",
    "scopeCandidates",
    "acceptedScope",
    "proposedScope",
    "explicitlyExcludedScope",
    "risks",
    "followUpNextStep",
    "needsConfirmation",
    "contradictions"
  ],
  properties: {
    clientMemoryPatch: {
      type: "object",
      additionalProperties: false,
      required: ["name", "company", "emailOrHandle", "status", "notes"],
      properties: {
        name: { type: "string" },
        company: { type: "string" },
        emailOrHandle: { type: "string" },
        status: { type: "string", enum: ["", "lead", "proposal_sent", "active", "paused", "done", "bad_fit"] },
        notes: { type: "array", items: { type: "string" } }
      }
    },
    projectMemoryPatch: {
      type: "object",
      additionalProperties: false,
      required: ["title", "budget", "timeline", "status", "includedScope", "excludedScope", "paymentTerms", "agreedFacts", "risks", "nextStep"],
      properties: {
        title: { type: "string" },
        budget: { type: "string" },
        timeline: { type: "string" },
        status: { type: "string", enum: ["", "discovery", "quoted", "active", "waiting", "done"] },
        includedScope: { type: "array", items: { type: "string" } },
        excludedScope: { type: "array", items: { type: "string" } },
        paymentTerms: { type: "string" },
        agreedFacts: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        nextStep: { type: "string" }
      }
    },
    scopeCandidates: { type: "array", items: { type: "string" } },
    acceptedScope: { type: "array", items: { type: "string" } },
    proposedScope: { type: "array", items: { type: "string" } },
    explicitlyExcludedScope: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    followUpNextStep: { type: "string" },
    needsConfirmation: { type: "array", items: { type: "string" } },
    contradictions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "savedValue", "newValue", "reason"],
        properties: {
          field: { type: "string" },
          savedValue: { type: "string" },
          newValue: { type: "string" },
          reason: { type: "string" }
        }
      }
    }
  }
} as const;

export function buildAnalyzeClientPrompt(packet: ContextPacket): string {
  const { pageContext, clientMemory, projectMemory, businessMemory } = packet;
  const riskContext = buildMemoryRiskContext(packet);

  return [
    "Extract client and project facts from the conversation below.",
    "Return only facts that are EXPLICITLY stated — do not infer or guess.",
    "",
    "Rules:",
    "- clientMemoryPatch: fill only fields that are clearly visible. Use empty string for unknown strings, empty array for unknown lists.",
    "- projectMemoryPatch: same rule. Leave budget/timeline/paymentTerms empty if not stated.",
    "- acceptedScope: work explicitly agreed by both sides, already paid for, or confirmed as included. Do not include fresh asks here unless acceptance is visible.",
    "- proposedScope: work requested, discussed, or suggested but not clearly accepted yet.",
    "- explicitlyExcludedScope: work explicitly rejected, marked out-of-scope, or excluded by saved project memory.",
    "- scopeCandidates: all mentioned deliverables/work items, regardless of status.",
    "- risks: concrete deal risks visible in the text: vague scope, scope creep, budget mismatch, timeline pressure, missing payment terms, contradiction.",
    "- followUpNextStep: one short next step visible or implied by the conversation. Empty string if unclear.",
    "- needsConfirmation: list specific facts the freelancer must review before saving. Always include budget, timeline, paymentTerms, acceptedScope, and proposedScope when they appear.",
    "- contradictions: compare against existing memory. Include savedValue and newValue when the conversation conflicts with saved budget, timeline, payment terms, included scope, excluded scope, or client identity.",
    "- Do not copy existing memory values as extracted facts unless the conversation reconfirms them.",
    "",
    "Existing client memory (for contradiction detection only):",
    clientMemory
      ? [
          clientMemory.name ? `name: ${clientMemory.name}` : "",
          clientMemory.company ? `company: ${clientMemory.company}` : "",
          clientMemory.status ? `status: ${clientMemory.status}` : "",
          clientMemory.notes.length ? `notes: ${clientMemory.notes.slice(-4).join(" | ")}` : ""
        ]
          .filter(Boolean)
          .join("\n") || "none"
      : "none",
    "",
    "Existing project memory (for contradiction detection only):",
    projectMemory
      ? [
          projectMemory.title ? `title: ${projectMemory.title}` : "",
          projectMemory.budget ? `budget: ${projectMemory.budget}` : "",
          projectMemory.timeline ? `timeline: ${projectMemory.timeline}` : "",
          projectMemory.includedScope.length ? `includedScope: ${projectMemory.includedScope.join(", ")}` : "",
          projectMemory.paymentTerms ? `paymentTerms: ${projectMemory.paymentTerms}` : ""
        ]
          .filter(Boolean)
          .join("\n") || "none"
      : "none",
    "",
    "Freelancer boundaries (context only):",
    businessMemory.boundaries ? trimPromptText(businessMemory.boundaries, 300) : "none",
    "",
    formatMemoryRiskContext(riskContext),
    "",
    "Conversation:",
    pageContext.threadTitle ? `Thread: ${trimPromptText(pageContext.threadTitle, 160)}` : "",
    pageContext.clientName ? `Client name visible on page: ${trimPromptText(pageContext.clientName, 120)}` : "",
    pageContext.clientCompany ? `Client company visible on page: ${trimPromptText(pageContext.clientCompany, 120)}` : "",
    pageContext.emailOrHandle ? `Email or handle: ${trimPromptText(pageContext.emailOrHandle, 120)}` : "",
    pageContext.recentMessages.length
      ? `Messages:\n${pageContext.recentMessages
          .slice(-8)
          .map((m) => `  ${m.author || "unknown"}: ${trimPromptText(m.text, 600)}`)
          .join("\n")}`
      : "",
    pageContext.latestClientMessage
      ? `Latest client message: ${trimPromptText(pageContext.latestClientMessage, 1200)}`
      : "",
    pageContext.selectedText ? `Selected text: ${trimPromptText(pageContext.selectedText, 800)}` : "",
    "",
    "Return structured JSON only."
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

// ─── analyze-scope-risk ───────────────────────────────────────────────────────

export const analyzeScopeRiskSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "riskLevel",
    "riskReason",
    "acceptedScopeItems",
    "proposedScopeItems",
    "outOfScopeItems",
    "matchedIncludedScope",
    "matchedExcludedScope",
    "needsConfirmation",
    "contradictions",
    "suggestedAction",
    "triggerPhrases"
  ],
  properties: {
    riskLevel: { type: "string", enum: ["none", "low", "medium", "high"] },
    riskReason: { type: "string" },
    acceptedScopeItems: { type: "array", items: { type: "string" } },
    proposedScopeItems: { type: "array", items: { type: "string" } },
    outOfScopeItems: { type: "array", items: { type: "string" } },
    matchedIncludedScope: { type: "array", items: { type: "string" } },
    matchedExcludedScope: { type: "array", items: { type: "string" } },
    needsConfirmation: { type: "array", items: { type: "string" } },
    contradictions: { type: "array", items: { type: "string" } },
    suggestedAction: { type: "string" },
    triggerPhrases: { type: "array", items: { type: "string" } }
  }
} as const;

export function buildAnalyzeScopeRiskPrompt(packet: ContextPacket): string {
  const { pageContext, projectMemory, businessMemory, sessionMemory } = packet;

  const includedScope = projectMemory?.includedScope ?? [];
  const excludedScope = projectMemory?.excludedScope ?? [];
  const latestAsk = pageContext.latestClientMessage || pageContext.selectedText || "";
  const riskContext = buildMemoryRiskContext(packet);

  return [
    "Detect scope creep by comparing the client's latest ask against the existing project scope.",
    "",
    "Trigger phrases that signal scope creep (check for these in the message):",
    '"also", "quick", "small change", "while you\'re at it", "can you add", "just", "should be easy",',
    '"while you\'re there", "one more thing", "bonus", "extra", "in addition"',
    "",
    "Rules:",
    "- riskLevel: none = no new asks. low = minor clarification. medium = clear add beyond scope. high = significant new work or contradicts agreed facts.",
    "- riskReason: one sentence explaining the risk. Empty string if riskLevel is none.",
    "- acceptedScopeItems: items from the latest ask that are clearly already covered by includedScope.",
    "- proposedScopeItems: newly requested or discussed items that are not accepted yet.",
    "- outOfScopeItems: list each ask that falls outside includedScope. Empty array if none.",
    "- matchedIncludedScope: latest ask items that match saved includedScope.",
    "- matchedExcludedScope: latest ask items that match saved excludedScope.",
    "- needsConfirmation: exact questions/facts the freelancer should confirm before saving or agreeing.",
    "- contradictions: saved facts that conflict with the latest ask. Include the old and new values in plain text.",
    "- suggestedAction: one concrete action for the freelancer (e.g. 'Quote the pricing page as a $500 add-on'). Empty string if no risk.",
    "- triggerPhrases: list any trigger phrases found verbatim in the message. Empty array if none.",
    "- If no project memory exists, assess risk based on message content and freelancer boundaries alone.",
    "- Do not mark fresh client asks as accepted scope unless the conversation clearly says they are already included.",
    "",
    "Agreed project scope:",
    includedScope.length ? `includedScope: ${includedScope.join(", ")}` : "Not set.",
    excludedScope.length ? `excludedScope: ${excludedScope.join(", ")}` : "",
    projectMemory?.budget ? `budget: ${projectMemory.budget}` : "",
    projectMemory?.timeline ? `timeline: ${projectMemory.timeline}` : "",
    projectMemory?.paymentTerms ? `paymentTerms: ${projectMemory.paymentTerms}` : "",
    projectMemory?.agreedFacts.length
      ? `agreedFacts: ${projectMemory.agreedFacts.join(" | ")}`
      : "",
    "",
    "Freelancer boundaries:",
    businessMemory.boundaries ? trimPromptText(businessMemory.boundaries, 300) : "Not set.",
    "",
    "Session context (recent facts):",
    sessionMemory?.facts.length
      ? sessionMemory.facts.slice(-5).map((f) => `- ${trimPromptText(f, 200)}`).join("\n")
      : "None.",
    "",
    formatMemoryRiskContext(riskContext),
    "",
    "Client's latest ask:",
    latestAsk ? trimPromptText(latestAsk, 1200) : "(no message provided)",
    pageContext.recentMessages.length
      ? `\nRecent thread:\n${pageContext.recentMessages
          .slice(-4)
          .map((m) => `  ${m.author || "unknown"}: ${trimPromptText(m.text, 400)}`)
          .join("\n")}`
      : "",
    "",
    "Return structured JSON only."
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

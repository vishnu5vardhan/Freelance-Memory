import { z } from "zod";

export const outputTypes = [
  {
    id: "auto",
    label: "Auto",
    description: "Let AI detect the situation and write the right reply."
  },
  {
    id: "first_reply",
    label: "First reply",
    description: "Reply to a new lead with proof, questions, and a next step."
  },
  {
    id: "pricing_reply",
    label: "Pricing",
    description: "Answer budget questions without underpricing."
  },
  {
    id: "scope",
    label: "Scope",
    description: "Turn a messy request into deliverables and boundaries."
  },
  {
    id: "follow_up",
    label: "Follow-up",
    description: "Revive a quiet lead with one clear CTA."
  },
  {
    id: "push_back",
    label: "Push back",
    description: "Say no or protect scope without sounding rude."
  },
  {
    id: "profile_answer",
    label: "Form answer",
    description: "Answer bios, applications, and profile questions."
  }
] as const;

export type OutputType = (typeof outputTypes)[number]["id"];
export type ReplyIntent = Exclude<OutputType, "auto"> | "new_lead" | "scope_creep" | "objection" | "bad_fit" | "unclear";

export const freelancerContextSchema = z.object({
  name: z.string().default(""),
  role: z.string().default(""),
  niche: z.string().default(""),
  shortBio: z.string().default(""),
  services: z.string().default(""),
  pricing: z.string().default(""),
  proof: z.string().default(""),
  portfolioLinks: z.string().default(""),
  process: z.string().default(""),
  availability: z.string().default(""),
  paymentTerms: z.string().default(""),
  boundaries: z.string().default(""),
  voice: z.string().default("")
});

export const conversationMessageSchema = z.object({
  author: z.string().default("unknown"),
  text: z.string().default(""),
  timestamp: z.string().default("")
});

export const browserPageContextSchema = z.object({
  source: z.string().default("generic"),
  sourceLabel: z.string().default("Generic"),
  pageUrl: z.string().default(""),
  pageTitle: z.string().default(""),
  threadTitle: z.string().default(""),
  clientName: z.string().default(""),
  clientCompany: z.string().default(""),
  emailOrHandle: z.string().default(""),
  selectedText: z.string().default(""),
  activeEditableText: z.string().default(""),
  latestClientMessage: z.string().default(""),
  recentMessages: z.array(conversationMessageSchema).default([]),
  visibleText: z.string().default(""),
  replyBoxFound: z.boolean().default(false),
  extractedAt: z.number().default(0)
});

export const sessionMemorySchema = z.object({
  id: z.string().default(""),
  domain: z.string().default(""),
  pageUrl: z.string().default(""),
  clientId: z.string().default(""),
  projectId: z.string().default(""),
  facts: z.array(z.string()).default([]),
  lastClientMessage: z.string().default(""),
  lastGeneratedReply: z.string().default(""),
  lastUserInstruction: z.string().default(""),
  nextStep: z.string().default(""),
  createdAt: z.number().default(0),
  expiresAt: z.number().default(0)
});

export const clientMemorySchema = z.object({
  id: z.string().default(""),
  name: z.string().default(""),
  company: z.string().default(""),
  emailOrHandle: z.string().default(""),
  source: z
    .enum(["gmail", "linkedin", "upwork", "fiverr", "generic", "x", "whatsapp"])
    .default("generic"),
  lastSeenUrl: z.string().default(""),
  notes: z.array(z.string()).default([]),
  status: z.enum(["lead", "proposal_sent", "active", "paused", "done", "bad_fit"]).default("lead"),
  createdAt: z.string().default(""),
  updatedAt: z.string().default("")
});

export const projectMemorySchema = z.object({
  id: z.string().default(""),
  clientId: z.string().default(""),
  title: z.string().default(""),
  budget: z.string().default(""),
  timeline: z.string().default(""),
  status: z.enum(["discovery", "quoted", "active", "waiting", "done"]).default("discovery"),
  includedScope: z.array(z.string()).default([]),
  excludedScope: z.array(z.string()).default([]),
  paymentTerms: z.string().default(""),
  agreedFacts: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  nextStep: z.string().default(""),
  sourceUrls: z.array(z.string()).default([]),
  createdAt: z.string().default(""),
  updatedAt: z.string().default("")
});

export const contextPacketSchema = z.object({
  action: z.enum(["reply", "fill_memory", "analyze_scope", "follow_up"]).default("reply"),
  source: z.enum(["gmail", "linkedin", "upwork", "fiverr", "generic", "x", "whatsapp"]).default("generic"),
  businessMemory: freelancerContextSchema.extend({
    updatedAt: z.string().default("")
  }),
  clientMemory: clientMemorySchema.nullable().optional(),
  projectMemory: projectMemorySchema.nullable().optional(),
  sessionMemory: sessionMemorySchema.nullable().optional(),
  pageContext: browserPageContextSchema,
  userInstruction: z.string().default("")
});

export const generateRequestSchema = z.object({
  context: freelancerContextSchema,
  inputText: z.string().min(1),
  pageContext: browserPageContextSchema.nullable().optional(),
  sessionMemory: sessionMemorySchema.nullable().optional(),
  contextPacket: contextPacketSchema.nullable().optional(),
  forcedIntent: z
    .enum(["auto", "first_reply", "pricing_reply", "scope", "follow_up", "push_back", "profile_answer"])
    .default("auto"),
  userInstruction: z.string().default("")
});

export type FreelancerContext = z.infer<typeof freelancerContextSchema>;
export type BrowserPageContext = z.infer<typeof browserPageContextSchema>;
export type SessionMemory = z.infer<typeof sessionMemorySchema>;
export type ClientMemory = z.infer<typeof clientMemorySchema>;
export type ProjectMemory = z.infer<typeof projectMemorySchema>;
export type ContextPacket = z.infer<typeof contextPacketSchema>;

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

const riskLevelSchema = z.enum(["none", "low", "medium", "high"]);

export const generatedResultSchema = z.object({
  detectedIntent: z.enum([
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
  ]),
  confidence: z.number(),
  riskLevel: riskLevelSchema,
  riskReason: z.string(),
  reply: z.string(),
  missingInfo: z.array(z.string()),
  recommendedNextStep: z.string(),
  memoryUpdates: z.object({
    clientFacts: z.array(z.string()),
    projectFacts: z.array(z.string()),
    scopeIncluded: z.array(z.string()),
    scopeExcluded: z.array(z.string()),
    risks: z.array(z.string()),
    needsConfirmation: z.array(z.string()),
    contradictions: z.array(z.string())
  }),
  scopeAssessment: z.object({
    acceptedScope: z.array(z.string()),
    proposedScope: z.array(z.string()),
    outOfScopeItems: z.array(z.string()),
    matchedExistingScope: z.array(z.string()),
    triggerPhrases: z.array(z.string()),
    needsConfirmation: z.array(z.string()),
    contradictions: z.array(z.string()),
    suggestedAction: z.string()
  }),
  contextUsed: z.array(z.string()),
  notes: z.string()
});

export type GeneratedResult = z.infer<typeof generatedResultSchema>;

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  promptChars: number;
  compactedFields: string[];
};

export type Generation = {
  id: string;
  forcedIntent: OutputType;
  detectedIntent: ReplyIntent;
  inputText: string;
  result: GeneratedResult;
  usage?: Usage;
  createdAt: string;
};

// --- analyze-client ---

export const analyzeClientResponseSchema = z.object({
  clientMemoryPatch: z.object({
    name: z.string(),
    company: z.string(),
    emailOrHandle: z.string(),
    status: z.enum(["", "lead", "proposal_sent", "active", "paused", "done", "bad_fit"]),
    notes: z.array(z.string())
  }),
  projectMemoryPatch: z.object({
    title: z.string(),
    budget: z.string(),
    timeline: z.string(),
    status: z.enum(["", "discovery", "quoted", "active", "waiting", "done"]),
    includedScope: z.array(z.string()),
    excludedScope: z.array(z.string()),
    paymentTerms: z.string(),
    agreedFacts: z.array(z.string()),
    risks: z.array(z.string()),
    nextStep: z.string()
  }),
  scopeCandidates: z.array(z.string()),
  acceptedScope: z.array(z.string()),
  proposedScope: z.array(z.string()),
  explicitlyExcludedScope: z.array(z.string()),
  risks: z.array(z.string()),
  followUpNextStep: z.string(),
  needsConfirmation: z.array(z.string()),
  contradictions: z.array(
    z.object({
      field: z.string(),
      savedValue: z.string(),
      newValue: z.string(),
      reason: z.string()
    })
  )
});

export type AnalyzeClientResponse = z.infer<typeof analyzeClientResponseSchema>;

// --- analyze-scope-risk ---

export const analyzeScopeRiskResponseSchema = z.object({
  riskLevel: riskLevelSchema,
  riskReason: z.string(),
  acceptedScopeItems: z.array(z.string()),
  proposedScopeItems: z.array(z.string()),
  outOfScopeItems: z.array(z.string()),
  matchedIncludedScope: z.array(z.string()),
  matchedExcludedScope: z.array(z.string()),
  needsConfirmation: z.array(z.string()),
  contradictions: z.array(z.string()),
  suggestedAction: z.string(),
  triggerPhrases: z.array(z.string())
});

export type AnalyzeScopeRiskResponse = z.infer<typeof analyzeScopeRiskResponseSchema>;

export const emptyFreelancerContext: FreelancerContext = {
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

export const contextFields: {
  key: keyof FreelancerContext;
  label: string;
  placeholder: string;
  rows?: number;
}[] = [
  {
    key: "name",
    label: "Name",
    placeholder: "Alex Carter"
  },
  {
    key: "role",
    label: "Role",
    placeholder: "Webflow developer, brand designer, Shopify expert..."
  },
  {
    key: "niche",
    label: "Niche",
    placeholder: "Landing pages for B2B SaaS, ecommerce stores, coaches..."
  },
  {
    key: "shortBio",
    label: "Short bio",
    placeholder: "One honest paragraph about what you do and who you help.",
    rows: 4
  },
  {
    key: "services",
    label: "Services",
    placeholder: "Landing page design, Webflow build, conversion audit...",
    rows: 5
  },
  {
    key: "pricing",
    label: "Pricing",
    placeholder: "Starting price, packages, hourly rate, minimum budget...",
    rows: 5
  },
  {
    key: "proof",
    label: "Proof",
    placeholder: "Results, testimonials, client names you can mention, case study bullets...",
    rows: 5
  },
  {
    key: "portfolioLinks",
    label: "Portfolio links",
    placeholder: "https://...",
    rows: 4
  },
  {
    key: "process",
    label: "Process",
    placeholder: "Discovery, scope, deposit, build, feedback, launch...",
    rows: 5
  },
  {
    key: "availability",
    label: "Availability",
    placeholder: "Taking 2 projects/month, starts next Monday, timezone...",
    rows: 3
  },
  {
    key: "paymentTerms",
    label: "Payment terms",
    placeholder: "50% upfront, Stripe invoice, net 7, milestone terms...",
    rows: 3
  },
  {
    key: "boundaries",
    label: "Boundaries",
    placeholder: "No unpaid calls, no unlimited revisions, minimum budget...",
    rows: 5
  },
  {
    key: "voice",
    label: "Voice",
    placeholder: "Direct, warm, concise. Avoid corporate fluff. Use simple words.",
    rows: 4
  }
];

export function getContextScore(context: FreelancerContext) {
  const important: (keyof FreelancerContext)[] = ["role", "services", "pricing", "proof", "process", "boundaries", "voice"];
  const completed = important.filter((key) => context[key].trim().length > 0).length;

  return {
    completed,
    total: important.length,
    percent: Math.round((completed / important.length) * 100)
  };
}

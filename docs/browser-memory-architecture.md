# Freelancer Memory Browser Architecture

## Blunt Goal

Make Freelancer Memory live where freelancers work.

Not another AI tab.

The extension should:

- read the current client context after user action
- remember freelancer business info
- remember client/project/scope context
- detect scope creep and deal risk
- generate a reply
- insert it into the reply box

User action is the privacy line.

Read locally when needed. Send to AI only after click.

## Product Shape

```txt
Chrome extension
  -> sees current page
  -> extracts useful context
  -> stores local memory
  -> calls Next API
  -> inserts reply

Next app/API
  -> runs LLM prompts
  -> validates structured outputs
  -> later handles auth, billing, sync
```

## Core User Flow

```txt
1. Freelancer opens a client thread.
2. FM icon appears near the reply box.
3. Freelancer clicks FM.
4. Extension reads visible thread/context.
5. Extension combines:
   - business memory
   - client memory
   - project/scope memory
   - 2-hour session memory
   - current page extract
6. API generates:
   - reply
   - risk
   - next step
   - memory updates
7. User clicks Insert.
8. Extension inserts reply into the page.
9. Extension stores the event locally.
```

Fallback:

```txt
If page detection fails:
  -> use highlighted text
  -> or paste manually
```

## Layers

### 1. Content Script

Runs on normal `http` and `https` pages.

Responsibilities:

- cache highlighted text
- detect visible reply fields
- inject small FM button near reply boxes
- run site adapters
- extract page/thread context after click
- insert generated reply

It should not call the AI directly.

### 2. Side Panel

The control room.

Responsibilities:

- show detected context
- show memory
- edit business memory
- trigger generation
- show reply/risk/next step
- copy or insert reply
- expose debug state during MVP

### 3. Background Service Worker

Thin coordinator.

Responsibilities:

- open side panel on extension click
- route messages between side panel and active tab
- keep adapter calls consistent

Keep it boring.

### 4. Next API

Server brain.

Responsibilities:

- `/api/generate`: generate reply
- `/api/extract-memory`: map page/portfolio text into business memory
- `/api/analyze-client`: extract client/project/scope facts
- `/api/analyze-scope-risk`: detect scope creep and missing boundaries

Current API already handles `/api/generate`.

## Extension File Shape

```txt
extension/
  manifest.json
  background.js
  content.js
  sidepanel.html
  sidepanel.css
  sidepanel.js
  adapters/
    generic.js
    gmail.js
    linkedin.js
    upwork.js
  lib/
    dom.js
    storage.js
    messages.js
    memory.js
```

Keep adapters plain JS first.

No build pipeline until the MVP is painful without one.

## Adapter Contract

Every adapter exposes the same shape:

```js
{
  id: "gmail",
  label: "Gmail",
  matches(location) {},
  findReplyBox() {},
  extractConversation() {},
  insertReply(text) {},
  injectButton(onClick) {}
}
```

### `extractConversation()`

Returns:

```js
{
  source: "gmail",
  pageUrl: location.href,
  pageTitle: document.title,
  threadTitle: "Landing page help",
  clientName: "Sarah",
  clientCompany: "GlowSkin",
  latestClientMessage: "Can you also add a pricing page?",
  recentMessages: [
    {
      author: "client",
      text: "Can you build the landing page in 10 days?",
      timestamp: "visible or empty"
    },
    {
      author: "freelancer",
      text: "Landing pages start at $2,000...",
      timestamp: "visible or empty"
    }
  ],
  replyBoxFound: true
}
```

### `insertReply(text)`

Must:

- focus the editor
- insert text
- dispatch input/change events
- return success/failure

Never click Send.

## Adapter Priority

Build in this order:

```txt
1. Generic
2. Gmail
3. LinkedIn
4. Upwork
5. Fiverr
```

### Generic Adapter

Works everywhere.

Reads:

- highlighted text
- focused textarea/input/contenteditable
- visible text near the focused field

Inserts into:

- focused textarea
- focused input
- focused contenteditable
- biggest visible editable field

### Gmail Adapter

Reads:

- email subject
- latest visible email body
- recent thread messages
- sender display name if visible
- reply editor

Inserts into:

- Gmail compose/reply editable div

### LinkedIn Adapter

Reads:

- visible conversation messages
- profile/thread name
- current message composer

Inserts into:

- message composer contenteditable

### Upwork Adapter

Reads:

- job title
- job description
- budget/rate if visible
- client message/proposal prompt
- reply/proposal field

Inserts into:

- proposal/message textarea/contenteditable

## Memory Model

### Business Memory

Freelancer-level facts.

Storage key:

```txt
freelancer_memory_business
```

Shape:

```ts
type BusinessMemory = {
  name: string;
  role: string;
  niche: string;
  shortBio: string;
  services: string;
  pricing: string;
  proof: string;
  portfolioLinks: string;
  process: string;
  availability: string;
  paymentTerms: string;
  boundaries: string;
  voice: string;
  updatedAt: string;
};
```

### Client Memory

Person/company-level facts.

Storage key:

```txt
freelancer_memory_clients
```

Shape:

```ts
type ClientMemory = {
  id: string;
  name: string;
  company: string;
  emailOrHandle: string;
  source: "gmail" | "linkedin" | "upwork" | "fiverr" | "generic";
  lastSeenUrl: string;
  notes: string[];
  status: "lead" | "proposal_sent" | "active" | "paused" | "done" | "bad_fit";
  createdAt: string;
  updatedAt: string;
};
```

### Project / Scope Memory

Deal-level facts.

Storage key:

```txt
freelancer_memory_projects
```

Shape:

```ts
type ProjectMemory = {
  id: string;
  clientId: string;
  title: string;
  budget: string;
  timeline: string;
  status: "discovery" | "quoted" | "active" | "waiting" | "done";
  includedScope: string[];
  excludedScope: string[];
  paymentTerms: string;
  agreedFacts: string[];
  risks: string[];
  nextStep: string;
  sourceUrls: string[];
  createdAt: string;
  updatedAt: string;
};
```

### Session Memory

Short-term memory for the current working burst.

Expires after 2 hours.

Storage key:

```txt
freelancer_memory_sessions
```

Shape:

```ts
type SessionMemory = {
  id: string;
  domain: string;
  pageUrl: string;
  clientId?: string;
  projectId?: string;
  facts: string[];
  lastClientMessage: string;
  lastGeneratedReply: string;
  lastUserInstruction: string;
  nextStep: string;
  createdAt: number;
  expiresAt: number;
};
```

Clean old sessions on extension startup and before generation.

## Context Packet

Before every generation, the extension builds one packet:

```ts
type ContextPacket = {
  action: "reply" | "fill_memory" | "analyze_scope" | "follow_up";
  source: "gmail" | "linkedin" | "upwork" | "fiverr" | "generic";
  businessMemory: BusinessMemory;
  clientMemory?: ClientMemory;
  projectMemory?: ProjectMemory;
  sessionMemory?: SessionMemory;
  pageContext: ConversationExtract;
  userInstruction: string;
};
```

This is what the API should receive.

Not the whole page.

Not browsing history.

Just the useful context.

## AI Output Contract

Reply endpoint should return:

```ts
type ReplyResult = {
  detectedIntent:
    | "new_lead"
    | "pricing_reply"
    | "scope"
    | "scope_creep"
    | "follow_up"
    | "push_back"
    | "profile_answer"
    | "objection"
    | "bad_fit"
    | "unclear";
  confidence: number;
  riskLevel: "none" | "low" | "medium" | "high";
  riskReason: string;
  reply: string;
  missingInfo: string[];
  recommendedNextStep: string;
  memoryUpdates: {
    clientFacts: string[];
    projectFacts: string[];
    scopeIncluded: string[];
    scopeExcluded: string[];
    risks: string[];
    needsConfirmation: string[];
    contradictions: string[];
  };
  scopeAssessment: {
    acceptedScope: string[];
    proposedScope: string[];
    outOfScopeItems: string[];
    matchedExistingScope: string[];
    triggerPhrases: string[];
    needsConfirmation: string[];
    contradictions: string[];
    suggestedAction: string;
  };
};
```

The current `/api/generate` can evolve into this.

## Memory Update Rules

Do not silently overwrite important memory.

Use this rule:

```txt
Low-risk facts -> save automatically.
Important facts -> ask user to confirm.
Contradictions -> show diff.
```

Examples:

Auto-save:

```txt
Client name: Sarah
Company: GlowSkin
Latest ask: Shopify speed optimization
```

Confirm before saving:

```txt
Budget: $2,000
Timeline: 10 days
Included scope: homepage redesign
```

Warn on contradiction:

```txt
Old budget: $2,000
New message says: $1,000
```

## Scope Creep Detection

Compare latest ask against project memory.

Inputs:

- latest client message
- included scope
- excluded scope
- payment terms
- freelancer boundaries
- previous replies in session

Triggers:

```txt
"also"
"quick"
"small change"
"while you're there"
"can you add"
"just"
"should be easy"
```

Output:

```txt
Possible scope creep.
Original scope: landing page only.
New ask: pricing page + copy rewrite.
Suggested action: quote add-on or scope swap.
```

## Privacy Boundary

MVP rule:

```txt
The extension may read page text locally.
It sends text to AI only after the user clicks FM / Generate / Fill memory.
```

Store:

- business memory
- client/project facts
- generated replies
- short session facts

Do not store:

- full browsing history
- hidden page content
- passwords
- payment/card fields
- every page visited

Do not auto-send:

- email threads
- DMs
- page text

Chrome Store copy should say this clearly.

## API Plan

### `POST /api/generate`

Current reply generation.

Next version accepts `ContextPacket`.

### `POST /api/extract-memory`

For portfolio/profile/page clipping.

Input:

```ts
{
  pageUrl: string;
  pageTitle: string;
  selectedText?: string;
  visibleText: string;
  existingBusinessMemory: BusinessMemory;
}
```

Output:

```ts
{
  suggestedMemory: Partial<BusinessMemory>;
  confidence: Record<keyof BusinessMemory, number>;
  warnings: string[];
}
```

### `POST /api/analyze-client`

For client/project extraction.

Input:

```ts
ContextPacket
```

Output:

```ts
{
  clientMemoryPatch: Partial<ClientMemory>;
  projectMemoryPatch: Partial<ProjectMemory>;
  needsConfirmation: string[];
}
```

## MVP Build Order

### Sprint 1: Strong Browser MVP

- generic adapter
- FM button near editable fields
- insert reply
- context packet builder
- 2-hour session memory

### Sprint 2: Gmail MVP

- Gmail adapter
- latest email extraction
- reply box insertion
- client memory creation
- scope risk warning

### Sprint 3: Memory That Sticks

- project/scope memory
- confirm memory updates
- scope creep comparison
- follow-up reminders inside side panel

### Sprint 4: More Money Surfaces

- Upwork adapter
- LinkedIn adapter
- proposal/scope generator
- unlisted Chrome Web Store beta

## What Not To Build Yet

Do not build:

- full dashboard
- team accounts
- CRM pipelines
- automatic background AI scanning
- send-email automation
- 10 adapters at once
- complicated auth before beta

Ship the browser-native workflow first.

## MVP Success Test

Test with 5 freelancers.

Pass if:

- 3/5 use it on a real client message
- 2/5 use Insert instead of Copy
- 2/5 save client/project memory
- 1/5 says it protected scope or pricing
- 1/5 says they would pay $9/month

If not, change the wedge.

## Simple Positioning

```txt
Freelancer Memory remembers your business, clients, and scope so you can reply faster without losing money.
```

That is stronger than:

```txt
AI email reply generator.
```

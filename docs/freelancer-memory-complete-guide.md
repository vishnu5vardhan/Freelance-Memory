# Freelancer Memory: Complete Project Guide

## The Short Version

Freelancer Memory is an AI reply assistant for freelancers.

It remembers how a freelancer works, what they charge, what they promised a client, and where the deal can go wrong.

Then it helps write replies that are useful, clear, and safe to send.

Not generic AI fluff.

The goal is simple:

```txt
Help freelancers reply faster without forgetting their pricing, scope, process, proof, or boundaries.
```

## The Problem

Freelancers repeat themselves all day.

They answer:

- What do you do?
- How much do you charge?
- Can you do this by next week?
- Can you also add this small thing?
- Why are you a good fit?
- Can we pay after launch?

Normal AI tools can write a reply.

But they forget the freelancer's business.

They do not know:

- the freelancer's services
- pricing
- payment terms
- proof
- portfolio links
- process
- boundaries
- current client scope
- what was already agreed
- what is out of scope

So the freelancer still has to rewrite everything.

That is the pain.

Freelancer Memory solves that.

## What "Memory" Means Here

Memory is not magic.

It is saved context.

The app uses four kinds of memory.

## 1. Business Memory

This is the freelancer's base profile.

It answers:

- Who are you?
- What do you do?
- Who do you help?
- What services do you sell?
- What do you charge?
- What proof can you mention?
- How do you work?
- When are you available?
- What are your payment terms?
- What boundaries should AI protect?
- What voice should replies use?

Example:

```txt
Name: Riya Mehta
Role: Webflow developer and landing page designer
Niche: B2B SaaS founders
Pricing: Landing pages start at $2,000
Payment terms: 50% upfront, 50% before launch
Boundaries: No unlimited revisions. No unpaid full audits.
Voice: Direct, friendly, concise.
```

This is saved locally in the browser.

In the web app, it uses `localStorage`.

In the Chrome extension, it uses `chrome.storage.local`.

## 2. Client Memory

This remembers who the client is.

It can store:

- client name
- company
- email or handle
- source site
- last seen URL
- notes
- client status

Example:

```txt
Client: Sarah
Company: GlowSkin
Source: Gmail
Status: lead
Note: Asked for a landing page and pricing page.
```

This helps the assistant avoid treating every message like a brand-new lead.

## 3. Project Memory

This is the important one for money.

It stores the deal context:

- project title
- budget
- timeline
- status
- included scope
- excluded scope
- payment terms
- agreed facts
- risks
- next step
- source URLs

Example:

```txt
Project: SaaS landing page
Budget: $3,500
Timeline: 10 days
Included scope:
- Landing page design
- Webflow build
- Responsive setup

Excluded scope:
- Dashboard pages
- Full copywriting

Payment terms:
50% upfront, 50% before launch
```

This is how the product catches scope creep.

If the client later says:

```txt
Can you also add a dashboard page and rewrite all the copy? Should be quick.
```

The app can see:

```txt
Dashboard pages = excluded
Full copywriting = excluded
```

So it should not blindly say yes.

It should suggest an add-on, a scope swap, or a clarification.

## 4. Session Memory

This is short-term memory.

It lasts 2 hours.

It remembers the current page/thread context:

- current domain
- page URL
- linked client/project
- last client message
- last generated reply
- last user instruction
- next step
- useful facts

Why?

Because a freelancer may generate a reply, edit it, insert it, then come back to the same thread.

The app should remember the last step for that session.

## How The Product Works

There are two product surfaces.

## Surface 1: Web App

The web app is at:

```txt
/workspace
```

User flow:

```txt
1. Freelancer fills business memory.
2. Freelancer pastes a client message.
3. Freelancer chooses reply mode, or leaves it on Auto.
4. App sends the message + relevant memory to the API.
5. API asks OpenAI for structured JSON.
6. App shows:
   - generated reply
   - detected intent
   - confidence
   - risk level
   - missing info
   - next step
   - memory updates
```

This is good for testing the core idea.

## Surface 2: Chrome Extension

The extension is the real product direction.

Why?

Because freelancers live in Gmail, LinkedIn, Upwork, Fiverr, WhatsApp, X, and random forms.

They do not want another tab.

User flow:

```txt
1. Freelancer opens a client thread.
2. The extension detects a reply box.
3. It shows a small FM button near the reply box.
4. Freelancer clicks FM.
5. The content script extracts page/thread context.
6. The side panel opens.
7. The side panel combines:
   - business memory
   - client memory
   - project memory
   - 2-hour session memory
   - current page context
8. The API analyzes client/project/scope.
9. The API generates a reply.
10. Freelancer reviews it.
11. Freelancer clicks Insert.
12. The extension inserts the reply into the page.
13. Freelancer reviews and sends manually.
```

Important:

```txt
The extension never clicks Send.
```

That is intentional.

AI can draft.

The freelancer stays in control.

## Example Flow

Let's use a real example.

## Setup

Freelancer memory:

```txt
Name: Riya Mehta
Role: Webflow developer and landing page designer
Niche: B2B SaaS founders
Pricing: Landing page projects start at $2,000.
Process: 20-minute fit call, fixed scope, 50% upfront, then build.
Payment terms: 50% upfront, 50% before launch.
Boundaries: No unlimited revisions. No free full audits.
Voice: Direct, friendly, concise.
```

Saved project memory:

```txt
Project: AI sales assistant landing page
Budget: $3,500
Timeline: 10 days
Included scope:
- Landing page design
- Webflow build
- Responsive setup

Excluded scope:
- Dashboard pages
- Full copywriting
```

Client message:

```txt
Can you also add a dashboard page and rewrite all the copy?
Should be quick since you are already working on the landing page.
```

## What Freelancer Memory Does

First it reads the message.

Then it checks saved project memory.

It sees:

```txt
Client asks for dashboard page.
But dashboard pages are excluded.

Client asks for full copy rewrite.
But full copywriting is excluded.

Client says "also" and "should be quick".
Those are scope-creep trigger phrases.
```

So it flags risk:

```txt
Risk level: high
Risk reason: Latest ask matches excluded scope.
Suggested action: Treat this as add-on work or offer a scope swap.
```

Then it writes a reply like:

```txt
Yep, I can help with that, but that would be outside the current landing page scope.

We have two options:

1. Add the dashboard page + copy rewrite as an add-on.
2. Swap it with part of the current scope if you want to keep the same budget/timeline.

If you want, I can send a quick add-on estimate before I start.
```

That is the value.

It does not just write nicer words.

It protects the deal.

## What The AI Returns

The API asks OpenAI for structured JSON, not random text.

The response includes:

- `detectedIntent`
- `confidence`
- `riskLevel`
- `riskReason`
- `reply`
- `missingInfo`
- `recommendedNextStep`
- `memoryUpdates`
- `scopeAssessment`
- `contextUsed`
- `notes`

Example shape:

```json
{
  "detectedIntent": "scope_creep",
  "confidence": 0.92,
  "riskLevel": "high",
  "riskReason": "Dashboard page and copy rewrite match excluded scope.",
  "reply": "Yep, I can help with that, but...",
  "missingInfo": ["Add-on budget", "Updated deadline"],
  "recommendedNextStep": "Ask whether this is an add-on or a scope swap.",
  "memoryUpdates": {
    "clientFacts": [],
    "projectFacts": [],
    "scopeIncluded": [],
    "scopeExcluded": [],
    "risks": ["Client requested excluded dashboard and copy work."],
    "needsConfirmation": ["Confirm whether dashboard/copy is add-on or scope swap."],
    "contradictions": []
  },
  "scopeAssessment": {
    "acceptedScope": [],
    "proposedScope": ["dashboard page", "copy rewrite"],
    "outOfScopeItems": ["dashboard page", "copy rewrite"],
    "matchedExistingScope": [],
    "triggerPhrases": ["also", "should be quick"],
    "needsConfirmation": ["Confirm scope status."],
    "contradictions": [],
    "suggestedAction": "Offer add-on pricing or scope swap."
  },
  "contextUsed": ["pricing", "boundaries", "clientMessage", "projectMemory"],
  "notes": "Protect scope before accepting."
}
```

Why JSON?

Because the UI needs more than a reply.

It needs to show risk, next step, memory updates, and scope analysis.

## Scope Risk System

There are two layers.

## Layer 1: AI Analysis

The app has API routes for:

- `/api/analyze-client`
- `/api/analyze-scope-risk`
- `/api/generate`

These use OpenAI structured output.

The AI extracts:

- client facts
- project facts
- accepted scope
- proposed scope
- excluded scope
- risks
- contradictions
- next steps

## Layer 2: Deterministic Guardrails

The file `lib/memory-risk.ts` adds simple rules.

This catches obvious risk before trusting the AI too much.

It looks for phrases like:

- also
- quick
- small change
- while you're at it
- can you add
- just
- one more thing
- extra

It also extracts work items like:

- dashboard
- copy
- blog
- pricing page
- CMS
- animations
- analytics
- checkout
- Shopify
- Webflow

Then it compares new requested work against saved included/excluded scope.

If the client asks for something outside the saved scope, risk goes up.

Good.

Freelancers lose money when scope is fuzzy.

## Memory Updates

The app does not blindly save every AI suggestion.

That would be dangerous.

Some things can auto-save:

- normal client notes
- harmless project facts
- next step

But important things need review:

- budget
- timeline
- payment terms
- included scope
- excluded scope
- risk flags
- contradictions

These become pending memory updates.

The freelancer can accept or reject them.

This matters because AI should not quietly change a $3,500 project into a $1,000 project.

## Browser Context Extraction

The extension has site adapters.

Current adapter coverage:

- Generic
- Gmail
- LinkedIn
- X/Twitter
- Upwork
- Fiverr
- WhatsApp Web

Each adapter tries to do the same jobs:

- detect the reply box
- extract visible conversation context
- find the latest client message
- collect recent messages
- identify client name/handle when possible
- insert generated reply into the editor

Adapter contract:

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

Generic fallback works on normal web pages.

If detection fails, the user can highlight text or paste manually.

## Privacy Line

The privacy line is user action.

The extension can cache selected text and detect reply boxes.

But page context is sent to the API only after the user clicks:

- FM
- Use page
- Generate

Business memory stays in browser storage until generation.

The OpenAI API key stays server-side in `.env.local`.

The generated reply is inserted into the page only after the user clicks Insert.

Again:

```txt
Never auto-send.
```

## Tech Stack

What we used:

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zod
- OpenAI Responses API
- Chrome Extension Manifest V3
- Chrome Side Panel API
- `chrome.storage.local`
- Content scripts
- Background service worker

Main app files:

```txt
freelancer memory/app/workspace/page.tsx
freelancer memory/components/Workspace.tsx
freelancer memory/app/api/generate/route.ts
freelancer memory/app/api/analyze-client/route.ts
freelancer memory/app/api/analyze-scope-risk/route.ts
freelancer memory/lib/memory.ts
freelancer memory/lib/prompt.ts
freelancer memory/lib/memory-risk.ts
freelancer memory/lib/openai.ts
```

Extension files:

```txt
freelancer memory/extension/manifest.json
freelancer memory/extension/background.js
freelancer memory/extension/content.js
freelancer memory/extension/sidepanel.html
freelancer memory/extension/sidepanel.css
freelancer memory/extension/sidepanel.js
```

## System Flow

```txt
Chrome page
  -> content script detects reply box / selected text
  -> user clicks FM
  -> content script extracts page context
  -> side panel loads business/client/project/session memory
  -> side panel builds ContextPacket
  -> Next API analyzes client and scope risk
  -> Next API generates structured reply JSON
  -> side panel shows reply + risk + memory review
  -> user clicks Insert
  -> content script inserts reply into page editor
  -> user reviews and sends manually
```

## Context Packet

The extension sends a `ContextPacket`.

It contains:

```txt
action
source
businessMemory
clientMemory
projectMemory
sessionMemory
pageContext
userInstruction
```

This gives the API the full picture.

Not just:

```txt
Write a reply to this message.
```

But:

```txt
Write a reply to this client message, using this freelancer's business, this project scope, this client history, this page context, and this short-term session.
```

That is the product.

## Reply Modes

The user can leave mode on Auto.

Or force a mode:

- First reply
- Pricing
- Scope
- Follow-up
- Push back
- Form answer

Auto is the default.

Manual mode is only for when AI guesses wrong.

## How To Test Locally

Start the app from the `freelancer memory` folder:

```bash
cd "freelancer memory"
npm run dev
```

Then open:

```txt
http://localhost:3000/workspace
```

For real generation, add:

```txt
OPENAI_API_KEY=your_key_here
```

to:

```txt
freelancer memory/.env.local
```

Then restart the dev server.

To test the extension:

```txt
1. Open chrome://extensions
2. Enable Developer mode
3. Click Load unpacked
4. Select freelancer memory/extension
5. Open Gmail, LinkedIn, Upwork, Fiverr, WhatsApp Web, X, or any page
6. Highlight a client message or click FM near a reply box
7. Generate reply
8. Insert
9. Review before sending
```

## How We Know If It Is Useful

The testing question:

```txt
Does the output help a freelancer move a client forward without rewriting their business every time?
```

Score every output on:

- context use
- no hallucination
- deal movement
- boundary protection
- voice
- copy-ready quality

Good signal:

```txt
24+ / 30 = strong
18-23 / 30 = usable
below 18 = weak
```

Real user validation:

Ask 5 freelancers for:

- their services
- their pricing
- one proof point
- one client message
- the reply they actually sent

Then compare:

```txt
actual reply vs Freelancer Memory reply
```

The project is worth pushing if:

- 3 out of 5 would use the generated reply after edits
- 2 out of 5 ask to try another message
- 1 out of 5 says they would pay

Do not polish first.

Validate the pain first.

## What This Project Is Not

It is not a generic ChatGPT wrapper.

It is not a CRM.

It is not a full inbox.

It is not an auto-send bot.

It is not trying to replace the freelancer.

It is a small assistant that sits where freelancers already work and protects their memory.

## The MVP

The MVP is:

```txt
Saved freelancer memory
+ browser context extraction
+ project/scope memory
+ scope creep detection
+ copy-ready reply
+ insert into reply box
```

That is enough to test.

Do not add dashboards too early.

Do not add teams too early.

Do not build billing before someone wants it.

Ship the wedge.

## Why This Can Work

Freelancers feel this pain every week.

They lose time rewriting the same replies.

They lose money when they say yes too fast.

They lose deals when replies are slow or vague.

Freelancer Memory helps with all three:

- faster replies
- clearer next steps
- stronger boundaries

Simple product.

Real pain.

Easy to demo.

Good MVP.

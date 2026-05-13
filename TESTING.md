# Freelancer Memory Testing Framework

Use this to test if the app is useful, not just if it generates nice text.

The question is simple:

> Does the output help a freelancer move a client forward without rewriting their business every time?

## User-level QA Checklist (Phase 3)

Run this before every public release. Tick each item on a real Chrome profile, not just dev.

### Install flow

- [ ] Fresh install opens `onboarding.html` in a new tab automatically.
- [ ] Filling memory fields and clicking Save shows the "Memory saved." next step.
- [ ] Reloading the extension after onboarding does NOT reopen onboarding.
- [ ] Side panel reflects memory saved during onboarding (score > 0%).
- [ ] `freelancer_memory_extension_install_id` exists in `chrome.storage.local`.

### Sidebar

- [ ] Side panel opens by clicking the toolbar icon.
- [ ] Side panel opens from the in-page Freelancer Memory button.
- [ ] Reply tab is the default tab on open.
- [ ] With no input, status reads "Add or highlight a client message first." (or weak-memory hint if memory is < 40%).
- [ ] With weak memory (< 40% strength), the status hint mentions adding services, pricing, and voice.
- [ ] Generate with valid input shows "Writing reply..." then a real reply.
- [ ] Generate while a previous generation is in flight is ignored (no duplicate request).
- [ ] Generate failure shows a single friendly status message, never raw error text.
- [ ] Copy success shows "Copied.".
- [ ] Copy failure shows "Couldn’t copy. Select the reply and use Cmd+C.".
- [ ] Insert success shows "Inserted. Review before sending.".
- [ ] Insert failure shows "Insert failed. Click into the reply box on the page, then try Insert again.".

### Platforms

Verify generate / use page / use highlight / insert work on each:

- [ ] Gmail (`mail.google.com`)
- [ ] LinkedIn messages / inMail
- [ ] Upwork inbox
- [ ] Fiverr inbox
- [ ] WhatsApp Web (`web.whatsapp.com`)
- [ ] X / Twitter DMs
- [ ] Generic site (e.g. a Notion shared page or a contact form)

### Failure cases

- [ ] Offline (turn wifi off): status shows "Couldn’t reach the reply service. Check your connection and try again.".
- [ ] Unsupported page (`chrome://extensions`): status shows "Open a normal website tab to use Freelancer Memory here.".
- [ ] Page loaded BEFORE extension reload (content script not injected): "Refresh this page so Freelancer Memory can connect.".
- [ ] No highlighted text + Use highlight click: status shows "No highlighted text found. Paste the client message here.".
- [ ] No reply box detected + Insert click: shows the insert-failure friendly message.
- [ ] Long client message (>5000 chars): generates without truncation; UI does not freeze.
- [ ] Weird characters / emojis in input: reply renders correctly, no JSON parse errors.
- [ ] Private / incognito Chrome: extension only works if explicitly allowed in `chrome://extensions`. Document this in the Chrome store listing.

### Rate limit & BYO key

- [ ] Successful generation 1-35 succeeds normally with shared key.
- [ ] After 35 successful generations on the same `install_id` in one UTC day, server returns 429 and extension shows "You've used today's 35 free generations. Add your OpenAI key in Advanced for unlimited.".
- [ ] Pasting a valid `sk-...` key in Advanced > Your OpenAI key bypasses the cap.
- [ ] An invalid value (e.g. `not-a-key`) is silently ignored — the header is not sent.
- [ ] After UTC midnight, the counter resets (verify by checking `fm_generation_events` count for that install_id).
- [ ] With `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` unset in the API env, the cap fails open (no 429s, no logging). Useful sanity check for local dev.

### Performance

- [ ] Typical generation finishes in < 5s on a normal connection.
- [ ] Generations >= 6s append "This took Xs. If it keeps happening, try again later." to the status.
- [ ] Generate button is disabled while a request is in flight.
- [ ] Double-clicking Generate does not fire two requests.
- [ ] Request times out cleanly after ~45s; user sees the timeout message, not a hang.

### Privacy

- [ ] `freelancer_memory_extension_diagnostics` never contains the client message text.
- [ ] Diagnostics never contains generated reply text.
- [ ] Diagnostics never contains full page URLs (only source / hostname).
- [ ] Local memory stays in `chrome.storage.local` (verify on `chrome://extensions` > inspect side panel > Application > Storage).
- [ ] The extension never auto-sends a reply. Insert pastes into the reply box only; the user must click send themselves.

### Diagnostics panel (Advanced > Diagnostics)

- [ ] Last 10 safe events visible after a couple of generations.
- [ ] "Copy diagnostics" copies a JSON array; pasted output contains no client text or reply text.
- [ ] "Clear diagnostics" empties the list and shows the empty state.
- [ ] Events captured include at minimum: `extension_opened`, `generate_clicked`, `generation_succeeded` or `generation_failed`, `copy_clicked`, `insert_clicked`, `memory_saved`, `pending_memory_accepted` / `rejected`.

## Manual test notes

### Loading the extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked" and select `freelancer memory/extension/`.
4. Confirm the icon appears in the toolbar and side panel mode is allowed.

### Reloading after edits

- After every change in `extension/`, click the refresh icon on the extension card in `chrome://extensions`.
- Then refresh ANY tab you intend to test on (so the updated `content.js` injects).

### Opening the side panel

- Click the toolbar icon, or
- Click the Freelancer Memory floating button injected into a supported page.

### Inspecting the service worker

- `chrome://extensions` > "Service worker" link under Freelancer Memory > opens DevTools for `background.js`.
- Console logs prefixed with `[FM]` come from `toUserError` / `trackEvent`.

### Inspecting chrome.storage.local

- Right-click inside the side panel > Inspect.
- DevTools > Application > Storage > Extension Storage > Local.
- Useful keys to scan during QA: `freelancer_memory_extension_context`, `freelancer_memory_extension_diagnostics`, `freelancer_memory_extension_install_id`, `freelancer_memory_pending_updates`.

### Verifying diagnostics events

1. Open the side panel (this fires `extension_opened`).
2. Generate a reply (fires `generate_clicked` and one of `generation_succeeded` / `generation_failed`).
3. Open Advanced > Diagnostics. Expand the section. The list should show the events in reverse chronological order.
4. Click "Copy diagnostics", paste into a scratchpad, and confirm no message or reply text is present.

### Automated tests

There is no Vitest / Playwright harness in this repo today. Adding one is out of scope for Phase 3; manual QA above is the contract.

Backend API correctness is exercised by:

```bash
npm run lint
npm run typecheck
npm run build
```

Run these before shipping. They will not catch UX regressions in the extension.

## How To Test

1. Open `http://localhost:3000/workspace`.
2. Add `OPENAI_API_KEY` to `.env.local` and restart the dev server.
3. Paste one business memory from this file into the left panel.
4. Paste one client input into the center panel.
5. Keep reply mode as `Auto` first.
6. Generate.
7. Score the output with the scorecard below.

Only use the reply mode override if Auto guesses the wrong situation.

## Scorecard

Rate every output from 1 to 5.

| Test | Question |
| --- | --- |
| Context use | Did it use the freelancer's actual services, proof, process, pricing, or boundaries? |
| No hallucination | Did it avoid inventing fake results, fake prices, fake clients, or fake timelines? |
| Deal movement | Did it create a clear next step? |
| Boundary protection | Did it avoid saying yes too fast or giving free strategy? |
| Voice | Does it sound like the freelancer, not corporate AI? |
| Copy-ready | Could the freelancer send this after a quick edit? |

Good score:

```txt
24+ / 30 = strong
18-23 / 30 = usable but needs prompt/UI improvement
below 18 = weak
```

## Business Memory 1: Webflow Freelancer

Paste this into the memory fields.

```txt
Name:
Riya Mehta

Role:
    Webflow developer and landing page designer

Niche:
B2B SaaS founders who need clean landing pages that explain the product and convert demo requests

Short bio:
I design and build focused Webflow landing pages for early-stage SaaS teams. I help founders turn messy product ideas into clear pages with strong messaging, fast load speed, and simple conversion paths.

Services:
- Landing page strategy
- Wireframe and copy cleanup
- Figma design
- Webflow build
- Responsive setup
- Basic SEO setup
- Launch checklist

Pricing:
Landing page projects start at $2,000. Full design + Webflow build usually ranges from $3,500 to $6,000 depending on scope. I do not do unpaid strategy calls beyond a short fit check.

Proof:
- Built landing pages for 14 SaaS startups
- Helped one analytics startup increase demo clicks by 38%
- Helped a founder launch in 9 days before Product Hunt
- Portfolio includes SaaS, AI tools, and developer products

Portfolio links:
https://example.com/saas-landing
https://example.com/ai-tool-launch
https://example.com/product-hunt-page

Process:
I start with a 20-minute fit call. Then I send a fixed scope with deliverables, timeline, price, and payment terms. Work starts after 50% upfront. Most landing pages take 7-14 days after content is ready.

Availability:
I take 2 projects per month. Next opening is next Monday. I work IST hours but can overlap with US mornings.

Payment terms:
50% upfront, 50% before launch. Payment by Stripe invoice. Two revision rounds included.

Boundaries:
No unlimited revisions. No free full audits before payment. Copywriting is cleanup, not full brand strategy, unless added to scope. Minimum project budget is $2,000.

Voice:
Direct, friendly, concise. No corporate buzzwords. Sound confident but not arrogant. Ask useful questions.
```

## Business Memory 2: Shopify Freelancer

```txt
Name:
Marco Silva

Role:
Shopify developer

Niche:
Small ecommerce brands doing $20k-$200k/month that need faster stores and better conversion

Short bio:
I help Shopify brands fix slow stores, messy themes, broken product pages, and conversion leaks. I focus on practical improvements that make the store easier to buy from.

Services:
- Shopify theme fixes
- Product page improvements
- Checkout and cart UX cleanup
- Speed optimization
- App cleanup
- Conversion audit
- Landing pages for campaigns

Pricing:
Small fixes start at $400. Speed and conversion audits are $750. Theme improvement projects usually range from $1,500 to $4,000. Rush work costs 30% extra.

Proof:
- Improved mobile speed score from 42 to 83 for a skincare brand
- Reduced app bloat for a fashion store and cut load time by 1.8 seconds
- Worked on 30+ Shopify stores

Portfolio links:
https://example.com/skincare-speed
https://example.com/fashion-theme-cleanup

Process:
I review the store, identify the highest-impact issues, send a fixed scope, then implement in a duplicate theme before publishing. I prefer clear before/after checks.

Availability:
Available for one new project this week. Timezone is UTC-3.

Payment terms:
100% upfront for work under $750. 50/50 split for larger projects.

Boundaries:
I do not promise revenue increases. I do not edit live themes without a backup. I do not work with stores using pirated themes.

Voice:
Practical, calm, clear. Short replies. No hype.
```

## Test Set A: First Reply

Reply mode: `Auto`

```txt
Hey, saw your portfolio. We need a new landing page for our AI sales assistant. We have rough copy and want to launch in 10 days. Can you help?
```

Expected:

- Mentions relevant SaaS/Webflow experience if using Riya.
- Asks about assets, scope, launch date, and decision-maker.
- Does not quote a final price too early.
- Gives a clear next step.

## Test Set B: Pricing Reply

Reply mode: `Auto`

```txt
How much would you charge for a landing page? We just need something simple. Budget is tight.
```

Expected:

- States starting price or range from memory.
- Does not discount immediately.
- Explains what changes price.
- Asks for scope before final quote.
- Protects minimum budget.

## Test Set C: Scope

Reply mode: `Auto`

```txt
We need a homepage, pricing page, integrations page, blog template, CMS, animations, copy help, mobile version, analytics, and launch support. Ideally done next week.
```

Expected:

- Turns messy request into sections.
- Separates included vs assumptions vs not included.
- Flags timeline risk.
- Does not silently accept everything.
- Creates next step: confirm scope/priority/budget.

## Test Set D: Follow-Up

Reply mode: `Auto`

```txt
Client liked the first call but has not replied for 5 days after receiving the rough quote.
```

Expected:

- Calm and short.
- No desperation.
- Restates value or next step.
- Makes reply easy: yes/no/changed priorities.

## Test Set E: Push Back

Reply mode: `Auto`

```txt
Can you also add a dashboard page and rewrite all the copy? Should be quick since you are already working on the landing page.
```

Expected:

- Says this is outside current scope.
- Offers add-on or scope swap.
- Does not apologize too much.
- Protects revisions/copy boundary.

Structured checks:

- `detectedIntent` is `scope_creep` or `push_back`.
- `riskLevel` is `medium` or `high`.
- `riskReason` names the added work.
- `scopeAssessment.proposedScope` includes dashboard/copy rewrite.
- `scopeAssessment.outOfScopeItems` is not empty when saved project scope only includes landing page.
- `memoryUpdates.scopeIncluded` does not silently add dashboard/copy rewrite unless the reply clearly accepts it.
- `memoryUpdates.needsConfirmation` asks whether this is add-on work or a scope swap.

## Test Set E2: Saved Scope Creep

Use the extension project memory first:

```txt
Included scope:
Landing page design
Webflow build
Responsive setup

Excluded scope:
Dashboard pages
Full copywriting

Budget:
$3,500

Timeline:
10 days
```

Then generate from:

```txt
Can you also add a dashboard page and rewrite all the copy? Should be quick since you are already working on the landing page.
```

Expected:

- High risk because the ask matches excluded scope.
- `riskReason` mentions dashboard/copy rewrite against saved scope.
- Suggested action is add-on pricing or scope swap.
- Contradictions/confirmation hints are visible in memory review.

## Test Set E3: Contradiction

Use the same saved project memory, then generate from:

```txt
Actually our budget is $1,000 and we need it by tomorrow. Can we still do the same scope?
```

Expected:

- High risk.
- `memoryUpdates.contradictions` includes saved budget vs new budget.
- `scopeAssessment.contradictions` includes saved timeline vs new timeline.
- Reply asks the client to confirm revised scope/budget/timeline instead of accepting.

## Test Set F: Form Answer

Reply mode: `Auto`

```txt
Tell us about your experience and why you are a good fit for this project.
```

Expected:

- Uses bio, proof, niche, and process.
- Sounds like a human profile answer.
- Does not say "as an AI".
- Does not invent client names.

## Real User Test

After the canned tests, test with 5 real freelancers.

Ask each person for:

1. Their services.
2. Their pricing.
3. One proof point.
4. One client message they recently received.
5. The reply they actually sent.

Then compare:

```txt
Actual reply vs app reply
```

Ask:

- Which one would you send?
- What is missing?
- What sounds fake?
- Would this save you 5 minutes?
- Would you pay $9/month for this?

## Pass/Fail

This idea is worth continuing if:

- 3 out of 5 freelancers say they would use the generated reply after edits.
- 2 out of 5 ask to try it again with another message.
- At least 1 says they would pay.

If not, change the wedge.

Do not polish the UI first.

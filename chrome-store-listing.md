# Freelancer Memory Chrome Web Store Listing

## Extension Name

Freelancer Memory

## Short Description

Generate client replies from saved freelancer memory without leaving the browser.

## Full Description

Freelancer Memory helps freelancers reply faster with context they already saved once.

Save your services, pricing, proof, process, boundaries, voice, social links, client notes, and project details in the extension. Then use the side panel to generate replies for client messages without leaving the page.

Freelancer Memory is useful for:

- First replies to new leads
- Pricing answers
- Scope cleanup
- Follow-ups
- Polite pushback
- Profile and form answers

How it works:

1. Save your freelance business memory in the extension.
2. Highlight a client message or click Use page.
3. Generate a reply.
4. Review it.
5. Copy or insert it into the page.

The extension does not send messages for you. You stay in control and review every reply before using it.

Built for an unlisted beta. Simple. Practical. Local-first where it matters.

## Single Purpose Statement

Freelancer Memory lets freelancers generate client replies from locally saved business memory and user-selected page context.

## Category Recommendation

Productivity

## Privacy Practices Answers

### Does the extension collect personally identifiable information?

No. Freelancer Memory does not intentionally collect personally identifiable information as a product requirement.

### Does the extension collect health information?

No.

### Does the extension collect financial and payment information?

No. Users may voluntarily save pricing or payment terms as local business memory in Chrome storage, but the extension does not collect payment card, bank, or billing account information.

### Does the extension collect authentication information?

No. The extension may store a shared beta key locally if required for beta access. It does not collect account passwords or OAuth tokens.

### Does the extension collect personal communications?

Client/page text is processed only when the user clicks Generate reply, Use page, Use highlight, or the in-page FM action. Relevant request text is sent to the Freelancer Memory backend and then to OpenAI to generate a reply. Freelancer Memory does not intentionally store client message content in Supabase.

### Does the extension collect location data?

No.

### Does the extension collect web history?

No. The extension reads selected or relevant page text only after user action. It does not build or sell browsing history.

### Does the extension collect user activity?

Optional backend usage logging may store metadata only: source, requested intent, detected intent, risk level, token counts, character counts, timestamps, and install id. This helps monitor beta usage, reliability, and cost.

### Does the extension sell user data?

No.

### Is data used for purposes unrelated to the extension's single purpose?

No.

### Is data used or transferred to determine creditworthiness or lending eligibility?

No.

## Permissions Justification

### activeTab

Used after a user action to read the current tab selection or relevant page context and to insert the reviewed reply into the active page editor.

### clipboardWrite

Used when the user clicks Copy to copy the generated reply to the clipboard.

### scripting

Used to support page interaction required by the extension, including detecting reply fields, capturing selected context after user action, and inserting reviewed replies.

### sidePanel

Used to show the Freelancer Memory side panel where users save memory, generate replies, review output, and copy or insert replies.

### storage

Used to store business memory, client/project notes, draft text, endpoint settings, beta key, install id, and recent generation state locally in Chrome storage.

## Host Permissions Justification

### https://freelancer-memory.vercel.app/*

Used to call the production Freelancer Memory backend at `https://freelancer-memory.vercel.app/api/generate`.

## Content Script Access Justification

### http://*/* and https://*/*

Used so the extension can work on common freelancer communication websites such as Gmail, LinkedIn, X/Twitter, Upwork, Fiverr, WhatsApp Web, and generic web pages. The content script detects reply fields, saves highlighted text locally, extracts compact page context after user action, and inserts reviewed replies. It does not send page text to the backend unless the user clicks Generate reply, Use page, Use highlight, or the in-page FM action.

## Suggested Support Email

vishnu.chinnayeluka123@gmail.com

## Suggested Unlisted Beta Positioning

Use an Unlisted Chrome Web Store release for invited freelancers and early testers. Keep the listing direct: this is a beta for faster client replies, not a broad public launch. Ask testers to verify the side panel flow, reply quality, insertion behavior, and memory review workflow.

## Screenshot Captions

1. Save your freelance services, pricing, proof, process, and voice once.
2. Generate a client reply from highlighted text or the current page.
3. Review risk flags, copy the reply, or insert it into the page.

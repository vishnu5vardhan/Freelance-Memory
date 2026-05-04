# Freelancer Memory Chrome Extension

Side panel MVP for replying from the browser.

## What Works

- Opens as a Chrome side panel.
- Reads highlighted text from the active tab.
- Caches the latest highlighted text before the side panel steals focus.
- Shows a generic `FM` button near visible reply fields.
- Extracts compact page/thread context after a user click.
- Uses site adapters for Gmail, LinkedIn, X/Twitter, Upwork, Fiverr, and WhatsApp Web.
- Saves business memory in `chrome.storage.local`.
- Creates lightweight client memory in `freelancer_memory_clients`.
- Creates project/scope memory in `freelancer_memory_projects`.
- Builds a `ContextPacket` before generation.
- Keeps 2-hour session memory per page/domain for continuity.
- Calls the existing Next API at `/api/generate`.
- Shows risk level/reason for scope creep, budget, timeline, and payment-term issues.
- Shows the generated reply.
- Copies the reply.
- Inserts the reply into the detected page editor without sending it.

## Local Test

1. Start the app:

```bash
npm run dev
```

2. Open Chrome:

```txt
chrome://extensions
```

3. Enable Developer mode.
4. Click `Load unpacked`.
5. Select this folder:

```txt
/Users/vishn/Downloads/ship fast/freelancer memory/extension
```

6. Open any normal web page.
7. Click the `FM` button near a real reply field, or highlight a client message and click `Generate reply`.
8. Click the Freelancer Memory extension icon if the side panel is not open.
9. Fill business memory.
10. Click `Generate reply`.
11. Click `Insert`, then review before sending.

After code changes, click `Reload` on the extension card in `chrome://extensions`, then refresh the page you want to test. Chrome only injects the updated content script after the page reloads.

## Endpoint

Local default:

```txt
http://localhost:3000/api/generate
```

If Next starts on `3001`, the side panel tries that automatically after `3000` fails. You can also set it manually:

```txt
http://localhost:3001/api/generate
```

For a deployed beta, change the endpoint in the side panel and add the deployed host to `manifest.json` under `host_permissions` and `content_security_policy.connect-src`.

If `BETA_API_KEY` is set on the backend, testers must paste the shared beta key into the side panel before generating.

## Publishing Note

This MVP is good for `Load unpacked` testing and an unlisted beta after adding:

- production API URL
- extension icons
- privacy policy URL
- auth or usage protection for the API
- Chrome Web Store screenshots

The content script runs on normal `http` and `https` pages so it can cache highlighted text, inject the FM button, run adapters, and insert replies. It reads page context only after the user clicks `FM`, `Use page`, or `Generate`. Add deeper site adapters only when the generic selectors miss real conversations.

## Adapter Coverage

Current adapters:

- Gmail: subject, visible email bodies, sender name, compose/reply editor.
- LinkedIn: visible DM/post context, profile/thread name, message/comment composer.
- X/Twitter: visible tweet thread, author labels, post/reply composer.
- Upwork: job/message page text, client/job title hints, message/proposal editors.
- Fiverr: conversation/message page text, username/title hints, message editors.
- WhatsApp Web: visible chat messages, chat title, footer composer.
- Generic fallback: selected text, focused editor, nearby visible text.

All adapters insert into the editor only. They never click Send.

For social sites, the intended MVP flow is highlight-first: select the post/DM text, click `Generate reply`, generate in the side panel, then insert into the composer.

## Memory Keys

- `freelancer_memory_extension_context`: business memory used by the extension UI.
- `freelancer_memory_clients`: client name/company/handle/source/URL/short notes.
- `freelancer_memory_projects`: project title, budget, timeline, scope, risks, next step.
- `freelancer_memory_sessions`: 2-hour session memory for the current page/domain.
- `freelancer_memory_extension_page_context`: last compact page extract after a user action.

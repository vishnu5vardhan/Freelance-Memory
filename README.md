# Freelancer Memory

Chrome extension + Next.js backend for generating client replies from saved freelancer memory.

## Guides

- [Walkthrough: how memory works](docs/freelancer-memory-walkthrough.md)
- [Complete project guide](docs/freelancer-memory-complete-guide.md)
- [Browser memory architecture](docs/browser-memory-architecture.md)

## Local

```bash
npm install
npm run dev
```

Required env:

```txt
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

Optional Supabase usage logging:

```txt
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

The app does not store client messages or freelancer memory in Supabase. It only logs usage metadata in `fm_generation_events`.

## Chrome Extension Beta

1. Deploy the Next app.
2. Set the extension API endpoint to `https://your-domain.vercel.app/api/generate`.
3. Load `extension/` through `chrome://extensions` with Developer mode.

The extension saves memory in `chrome.storage.local` on each tester's browser.

Tester UX in the side panel now includes:

- `Tester -> Clients`: list, activate, reset, and delete saved clients.
- `Tester -> Projects`: list, activate, reset, and delete saved projects.
- `Tester -> Session`: inspect, refresh, clear, or expire the 2-hour session memory.
- `Tester -> Import`: paste or upload `.txt`, `.md`, or `.json` client/project context into local storage.

## Rate limiting & bring-your-own OpenAI key

Each `install_id` gets 35 successful generations per UTC day on the shared `OPENAI_API_KEY`. After that the server returns `429` with `code: "rate_limited"` and the extension shows: "You've used today's 35 free generations. Add your OpenAI key in Advanced for unlimited."

Users can paste their own `sk-...` OpenAI key in the side panel's Advanced tab. When the `x-fm-openai-key` header is present:

- the server skips the rate-limit check
- the server uses the user's key for the OpenAI call instead of `OPENAI_API_KEY`
- the key is never logged or persisted server-side

The counter is backed by Supabase (`fm_generation_events` rows where `status = 'ok'`). If `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` aren't set, the limiter fails open — useful for local dev, but in production you should set them.

## Diagnostics & testing

The side panel keeps the last 50 local diagnostic events under Advanced > Diagnostics. The list contains only safe metadata (event name, install id, duration, error category, source, char counts) — never the client message or generated reply. Use "Copy diagnostics" to grab a JSON dump when debugging a tester report.

If you set the optional Supabase env vars above, `fm_generation_events` also captures `duration_ms`, `output_chars`, `status`, and `error_category` per generation. Apply the latest migration in `supabase/migrations/` after upgrading.

See [TESTING.md](TESTING.md) for the user-level QA checklist, platform coverage, and manual test runbook.

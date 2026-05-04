# Freelancer Memory

Chrome extension + Next.js backend for generating client replies from saved freelancer memory.

## Local

```bash
npm install
npm run dev
```

Required env:

```txt
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
BETA_API_KEY=long-random-beta-password
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
3. Set the same beta key in the extension and Vercel.
4. Load `extension/` through `chrome://extensions` with Developer mode.

The extension saves memory in `chrome.storage.local` on each tester's browser.

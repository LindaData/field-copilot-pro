# HVAC review layer ready checkpoint

Branch: `work/hvac-review-layer-ready`
Repo: `LindaData/field-copilot-pro`
Status: ready to keep building on top of the existing review layer.

## Current review layer state

- The app mounts `ReviewLayer` globally from `src/App.tsx`, so the floating review UI is available across the demo app except the dedicated review workspace/frame mode.
- Review data is captured per route/page with localStorage fallback.
- The optional live bridge uses `reviewEndpoint` from the URL, localStorage, or `VITE_REVIEW_ENDPOINT`.
- Review notes and tracked actions post to `POST /review-note` when an endpoint is configured.
- Codex/assistant replies can be read from `GET /review-messages?sessionId=...`.
- The GitHub review inbox target is issue `#30`.

## Reviewer mobile URL pattern

Use this shape after GitHub Pages deploys:

```text
https://lindadata.github.io/field-copilot-pro/app/today?reviewEndpoint=<encoded-review-note-endpoint>
```

Without a review endpoint, notes still save locally in the browser and can be copied/exported from the review layer.

## Local dev review bridge

Run the local review server:

```bash
npm run review:server
```

Useful endpoints:

```text
GET  http://127.0.0.1:8787/health
GET  http://127.0.0.1:8787/notes
GET  http://127.0.0.1:8787/notes.json
GET  http://127.0.0.1:8787/review-feed
GET  http://127.0.0.1:8787/review-messages?sessionId=<session-id>
POST http://127.0.0.1:8787/review-note
POST http://127.0.0.1:8787/review-message
```

Local app URL:

```text
http://localhost:8080/?reviewEndpoint=http://127.0.0.1:8787/review-note
```

GitHub Pages route after deploy:

```text
https://lindadata.github.io/field-copilot-pro/app/today
```

## Build rules for future work

1. Keep the review layer on top of all technician/owner demo routes.
2. Do not remove the localStorage fallback.
3. Do not expose secrets in frontend code, logs, docs, commits, or URL examples.
4. Keep the UI mobile-first for iPhone review.
5. Preserve the Lovable baseline shell, routing, shadcn/ui components, Tailwind tokens, and demo data unless a later task explicitly changes them.
6. Keep demo vs production behavior clearly labeled.
7. For HVAC document/source work, show confidence and `needs_review` status before implying a source is safe for repair guidance.

## Validation checklist

Before merging future changes on this branch:

```bash
npm install
npm run lint
npm test
npm run build
npm run review:server
```

Manual review:

- Open `/app/today` on mobile size.
- Open the floating Review button.
- Add a UX note.
- Confirm it is attached to the current page/route.
- Confirm local copy/export works with no endpoint configured.
- Confirm `reviewEndpoint=http://127.0.0.1:8787/review-note` sends notes to `/notes` when the local review server is running.

## Next small work lane

- Keep improving the HVAC demo pages while using this branch as the review-ready lane.
- Once a Cloudflare Worker/GitHub token bridge is configured, set the remote `reviewEndpoint` so notes land directly in issue `#30` as durable comments.

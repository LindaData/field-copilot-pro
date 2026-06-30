# Review Layer Sync

Goal: let Sergio use the live demo like an end user, type review notes, press Enter, and have the notes land somewhere ChatGPT can read without copy/paste.

## Current behavior

The Review layer is visible on top of the main demo. It always saves notes locally in the browser.

The layer now supports live review capture:

- Draft notes autosave per route while the reviewer types.
- Each note can be tagged as UX, Bug, Copy, Data, or Flow.
- Each note can be marked Low, Med, or High priority.
- The panel shows the current page queue and the full open-note queue.
- Each note shows local, sending, sent, or retry-needed state.
- Notes can be retried individually or synced in bulk.
- The saved review path strips `reviewEndpoint` and `cacheBust` query parameters so review data stays tied to the real product route.

The dedicated `/review` workspace adds session tracking around the centered app canvas:

- Route shortcuts and iframe route changes are recorded.
- Button/link clicks inside the framed app are recorded with route, label, target, timestamp, and viewport.
- Select, checkbox, radio, range, textarea, and text-input changes are recorded as committed actions. Free-text field values from the framed app are not copied into the action detail.
- Reviewer notes and `Message to Codex` entries are recorded into the same timeline.
- Copy/export includes both open notes and the action trail so Codex can understand what the reviewer was doing when feedback was written.
- The workspace shows `Reviewing now` above the note box, and the session trail can be hidden on mobile while tracking continues in the background.
- The live notetaker shows `Latest thing you sent`, `Codex replied`, `Refresh replies`, and `Copy exchange` so the reviewer can confirm the note-taker loop without leaving the page.
- The local review server also exposes a two-way review bridge. Phone notes/actions post to `/review-note`; Codex replies post to `/review-message`; the review workspace polls `/review-messages` and shows responses in the `Codex replies` panel.
- Temporary `trycloudflare.com` app tunnels are allowed by the local bridge for unpublished-branch phone reviews.

When a review endpoint is configured, pressing Enter or Capture submits the note to the GitHub review inbox:

- Review inbox issue: https://github.com/LindaData/field-copilot-pro/issues/30

Each submitted note includes page label, route, full URL, session id, note text, timestamp, type, priority, and viewport size.

Each submitted review action includes action type, page label, route, UI label, target metadata, optional detail, timestamp, session id, and viewport size.

## Why an endpoint is required

The app is hosted on GitHub Pages, which is static. It cannot safely write to GitHub by itself because private credentials must not be exposed in browser code.

The cheapest safe path is a tiny free serverless endpoint, such as Cloudflare Workers free tier, with private credentials stored on the serverless provider side.

## Worker file

```text
workers/review-notes-worker.js
```

This worker accepts review notes and posts them as comments on issue #30.

## Configure the live app

After the worker is deployed, open the demo once with this query parameter:

```text
https://lindadata.github.io/field-copilot-pro/?reviewEndpoint=<WORKER_URL>
```

The app saves that endpoint in browser localStorage. After that, any note added with Enter should sync to issue #30.

For guided UI review, use the dedicated review workspace:

```text
https://lindadata.github.io/field-copilot-pro/review?reviewEndpoint=<WORKER_OR_LOCAL_ENDPOINT_URL>
```

The workspace keeps the app centered and places prompts, endpoint status, note capture, session trail, and chat handoff around it.

For an unpublished local branch, expose the app and bridge through separate temporary HTTPS tunnels and open:

```text
https://<APP_TUNNEL>.trycloudflare.com/?p=%2Freview&reviewEndpoint=<BRIDGE_TUNNEL>/review-note
```

## Review workflow

1. Open the live demo.
2. Open the Review layer.
3. Navigate normally.
4. Type a note on any page.
5. Press Enter.
6. The note is saved locally and, if configured, submitted to issue #30.
7. Ask ChatGPT to read issue #30 and summarize/reconcile the feedback.

## Fallback

If the endpoint is not configured or sync fails, notes remain saved locally, the Review layer shows the unsynced count, and Copy remains available as a fallback.

## Safety

Do not put private credentials in frontend code, Vite browser variables, or GitHub Pages files. Only store private credentials in the serverless endpoint configuration.

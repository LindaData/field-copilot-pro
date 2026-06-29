# Review Workspace

The review workspace is a dedicated UI review page:

```text
/review
```

It keeps the Field Copilot app centered in a device-sized canvas and puts the review system around it:

- left side: review prompts, route shortcuts, and a message-to-Codex lane
- center: the live app canvas
- right side: feedback capture, endpoint sync, live note queue, and session trail

This is inspired by review/learning surfaces such as Storybook's canvas-plus-tools model, user-feedback widgets, session-review tools, and coding-learning layouts where instructions sit beside the live experience.

Reference patterns reviewed:

- Storybook addon panels/toolbars around a central canvas: https://storybook.js.org/docs/addons/addon-types
- Sentry user feedback widget and custom feedback API: https://docs.sentry.io/platforms/javascript/user-feedback/
- Intro.js guided product-tour prompts: https://introjs.com/docs/

## Live Review URL

Without an endpoint:

```text
https://lindadata.github.io/field-copilot-pro/review
```

With the local laptop endpoint:

```text
https://lindadata.github.io/field-copilot-pro/review?reviewEndpoint=http%3A%2F%2F127.0.0.1%3A8787%2Freview-note
```

## Local Endpoint

Start the local note endpoint:

```bash
npm run review:server
```

The endpoint provides:

```text
GET  http://127.0.0.1:8787/health
GET  http://127.0.0.1:8787/notes
GET  http://127.0.0.1:8787/notes.json
POST http://127.0.0.1:8787/review-note
```

Generated review notes and action events are ignored by git and saved under:

```text
data/review-notes/
```

The Markdown feed records both `Review note` and `Review action` sections. The JSON feed keeps the same records as newline-delimited events.

## Reviewer Workflow

1. Open the review URL.
2. Use the route shortcuts or navigate inside the centered app.
3. The review workspace follows the current app route while you move.
4. Button/link clicks, route changes, committed control changes, notes, device-mode changes, and messages to Codex are added to the session trail.
5. Type notes in the right panel, then press `Enter` or `Capture`.
6. Type quick context in the left `Message to Codex` box when the note depends on what you just clicked.
7. Notes and actions save locally in browser storage and sync to the endpoint when configured.
8. Use `Copy chat handoff` or the `/notes` URL to bring the full review session back into ChatGPT/Codex.

## Safety

The review workspace does not put secrets in browser code. The local endpoint writes plain text on the laptop. Click and route tracking intentionally avoids recording free-text field values from the framed app. The Cloudflare Worker path can still be used later to post review notes to GitHub issue #30.

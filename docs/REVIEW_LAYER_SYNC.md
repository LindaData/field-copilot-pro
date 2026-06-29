# Review Layer Sync

Goal: let Sergio use the live demo like an end user, type review notes, press Enter, and have the notes land somewhere ChatGPT can read without copy/paste.

## Current behavior

The Review layer is visible on top of the main demo. It always saves notes locally in the browser.

When a review endpoint is configured, pressing Enter also submits the note to the GitHub review inbox:

- Review inbox issue: https://github.com/LindaData/field-copilot-pro/issues/30

Each submitted note includes page label, route, full URL, session id, note text, and timestamp.

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
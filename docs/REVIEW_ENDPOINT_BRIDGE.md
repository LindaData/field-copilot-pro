# Live review endpoint bridge

This fixes the failure mode seen on iPhone where the review layer said the endpoint was connected, but note submit showed:

```text
Note saved locally. Live submit failed.
Load failed
```

The app-side local fallback is working. The broken piece is the remote review endpoint: Safari can save the note locally, but cannot reach a valid bridge that writes to GitHub issue `#30`.

## What was added

- `workers/review-inbox.js`: Cloudflare Worker endpoint for review notes.
- `wrangler.toml`: Worker config pointed at the connected Cloudflare service `soft-unit-ba5d`.

The worker exposes:

```text
GET  /health
GET  /notes
GET  /notes.json
GET  /review-feed
GET  /review-messages
POST /review-note
POST /review-message
```

## Required Cloudflare secret

Set this in Cloudflare Worker settings before expecting live note sync to work:

```text
GITHUB_TOKEN=<GitHub token with permission to comment on LindaData/field-copilot-pro issue #30>
```

Do not commit this token.

## Safe behavior

- Real review notes are written to GitHub issue `#30`.
- Passive page/click/focus/route actions are accepted but not written as GitHub comments, so the issue is not spammed.
- If the token is missing, the worker returns a clear `missing_github_token` error instead of a Safari `Load failed` network error.
- CORS allows the GitHub Pages demo and local dev URLs.
- The existing localStorage fallback still protects notes if the endpoint is down.

## App URL once worker is deployed

Use the deployed Worker `/review-note` URL as the review endpoint:

```text
https://lindadata.github.io/field-copilot-pro/app/today?reviewEndpoint=<encoded-worker-url>/review-note
```

Example shape only:

```text
https://lindadata.github.io/field-copilot-pro/app/today?reviewEndpoint=https%3A%2F%2Fsoft-unit-ba5d.<workers-subdomain>.workers.dev%2Freview-note
```

## Health check

Open the worker health URL directly:

```text
https://<worker-url>/health
```

Expected healthy response:

```json
{
  "ok": true,
  "bridge": "field-copilot-review-inbox",
  "repo": "LindaData/field-copilot-pro",
  "inboxIssue": "30",
  "githubTokenConfigured": true
}
```

If `githubTokenConfigured` is false, live submit will not write to GitHub yet.

## Recovered test note

The iPhone screenshot showed this locally saved note:

```text
Can you see this?
```

That note was manually recovered into issue `#30` so it is not lost.

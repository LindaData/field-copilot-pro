# Cloudflare Review Webhook Fix

## Root cause

Cloudflare detected `bun.lockb`, tried `bun install --frozen-lockfile`, and failed because the Bun lockfile was stale. This repo is now npm-first and should install from `package-lock.json` with `npm ci`.

## Repo fix

- `bun.lockb` has been removed from git.
- The repo now includes `npm run assert:npm-only`, which fails if `bun.lockb` comes back.
- CI runs the npm-only guard before install so the problem is caught before build or deploy.

## Cloudflare settings for Sergio

- Install command: `npm ci`
- Build command: leave blank
- Deploy command: `npx wrangler deploy`

## Required Cloudflare secret

- Name: `GITHUB_TOKEN`
- Value: GitHub token with permission to comment on repo issues

Do not paste the token into source code, commit history, or chat.

## Health check

- URL: `https://<worker-url>/health`
- Expected good health: `githubTokenConfigured: true`

## App links

- Reset saved endpoint:
  `https://lindadata.github.io/field-copilot-pro/app/today?resetReviewEndpoint=1`
- Live review link:
  `https://lindadata.github.io/field-copilot-pro/app/today?reviewEndpoint=<encoded-worker-url>/review-note`

# Agentic Build Roster

Goal: organize the repo work into expert lanes so Codex and ChatGPT can pull the same instructions.

## Priority

HVAC / Field Copilot is priority 1. Use local files, scripts, schemas, and docs before any cloud deployment.

## Architecture baseline

For app projects that started in Lovable, the initial Lovable build is the approved architecture/scaffold unless the user explicitly replaces it.

Codex and ChatGPT should preserve the Lovable-generated app shell, mobile-first layout, route map, page structure, shadcn/ui component pattern, Tailwind design tokens, demo data contracts, and working user flows. Do not rebuild the app from scratch just because Codex is now doing the engineering work.

Preferred build sequence: Lovable/design scaffold first, freeze the shell, then Codex hardens it with data, tests, security, GitHub Actions, persistence, iOS/Capacitor, AWS, and production cleanup.

## Lanes

1. Product Architect: scope, repo structure, build order, decision log.
2. Lovable Baseline Steward: protect the approved scaffold, routes, design tokens, and mobile UX while Codex extends the app.
3. HVAC Source Research: manuals, spec sheets, model pages, source manifest.
4. Data Cleaning: raw source list, normalized model/spec records, validation output.
5. Schema and SEO: Schema.org page patterns, entity relationships, metadata.
6. Performance and Accessibility: mobile speed, readable tables, keyboard flow.
7. Cost Guard: free/local-first path, serverless notes, spend gates.
8. QA and Codex: exact commands, checks, PR summary, handoff prompt.

## Current sequence

1. Quality workspace.
2. HVAC data cleaning layer.
3. Codex handoff.
4. UI/schema integration while preserving the Lovable baseline.
5. AWS staging after local review.

## Rule

Produce small pullable changes. Prefer docs, scripts, schemas, and tests before services. Preserve the Lovable baseline unless a specific architecture change is requested.
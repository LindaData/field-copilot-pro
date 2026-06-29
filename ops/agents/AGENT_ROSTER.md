# Agentic Build Roster

Goal: organize the repo work into expert lanes so Codex and ChatGPT can pull the same instructions.

## Priority

HVAC / Field Copilot is priority 1. Use local files, scripts, schemas, and docs before any cloud deployment.

## Lanes

1. Product Architect: scope, repo structure, build order, decision log.
2. HVAC Source Research: manuals, spec sheets, model pages, source manifest.
3. Data Cleaning: raw source list, normalized model/spec records, validation output.
4. Schema and SEO: Schema.org page patterns, entity relationships, metadata.
5. Performance and Accessibility: mobile speed, readable tables, keyboard flow.
6. Cost Guard: free/local-first path, serverless notes, spend gates.
7. QA and Codex: exact commands, checks, PR summary, handoff prompt.

## Current sequence

1. Quality workspace.
2. HVAC data cleaning layer.
3. Codex handoff.
4. UI/schema integration.
5. AWS staging after local review.

## Rule

Produce small pullable changes. Prefer docs, scripts, schemas, and tests before services.

# Codex Handoff: Review Layer + HVAC Documentation Scraper

Goal: move the work that needs a running laptop into Codex/local execution.

## Priority 1: review layer pass-through

The Review layer is already mounted on top of the demo. The current blocker is that GitHub Pages is static, so notes save locally until an endpoint is available.

Build and run a local endpoint on the laptop first.

Requirements:

1. Accept POST requests from the Review layer.
2. Save each note as NDJSON and Markdown.
3. Include page label, route, full URL, timestamp, session id, and note text.
4. Expose a readable notes URL for ChatGPT/Codex review.
5. Keep it local-first and cheap.
6. Do not expose private tokens in the browser.

Suggested local routes:

```text
GET  /health
GET  /notes
POST /review-note
```

Suggested run flow:

```bash
npm install
node scripts/review-local-server.mjs
npm run dev -- --host 0.0.0.0
```

Open the app with:

```text
http://localhost:8080/?reviewEndpoint=http://localhost:8787/review-note
```

For iPhone review, expose the laptop endpoint with a safe tunnel only if needed, then open the GitHub Pages URL with the tunnel URL as `reviewEndpoint`.

First pass-through test:

```text
1. Type: Test
2. Press Submit
3. Confirm the local endpoint saved it
4. Confirm GET /notes shows the text and route
5. Paste or publish that notes endpoint output for ChatGPT to read
```

## Priority 2: HVAC documentation scraping

Use laptop execution for manufacturer-document collection.

Requirements:

1. Read source URLs from existing CSVs:
   - `data/hvac/source_manifest.sample.csv`
   - `docs/HVAC_UNIT_DOCUMENT_RESEARCH.csv`
   - `docs/US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.csv`
2. Download public PDF/HTML manufacturer sources.
3. Save raw documents under ignored local data folders.
4. Create metadata with URL, status, content type, byte size, SHA256, local path, source file, and row number.
5. Do not run OCR yet.
6. Do not use paid AI, AWS, Bedrock, embeddings, or external paid services.
7. Treat downloaded docs as source material for a later AI/RAG layer.

Suggested outputs:

```text
data/hvac/raw-downloads/documents/*
data/hvac/raw-downloads/hvac_doc_fetch_manifest.json
data/hvac/raw-downloads/hvac_doc_fetch_manifest.csv
```

## Codex deliverables

1. Local review endpoint script.
2. HVAC docs fetch/scrape script.
3. Ignore generated local outputs.
4. README docs with commands.
5. Run lint, tests, TypeScript, and build.
6. Confirm first review note pass-through.
7. Confirm at least one Goodman PDF download and metadata row.

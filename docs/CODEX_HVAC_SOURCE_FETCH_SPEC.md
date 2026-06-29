# Codex Spec: HVAC Source Fetch

Purpose: use the laptop to collect public manufacturer documentation for the future AI layer.

## Inputs

Use existing CSV files with public manufacturer document links:

- `data/hvac/source_manifest.sample.csv`
- `docs/HVAC_UNIT_DOCUMENT_RESEARCH.csv`
- `docs/US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.csv`

Relevant URL columns:

- `source_url`
- `document_url`
- `canonical_url`
- `primary_document_url`
- `secondary_document_url`

## Local outputs

Keep generated outputs local or ignored until reviewed:

- `data/hvac/raw-downloads/documents/`
- `data/hvac/raw-downloads/hvac_doc_fetch_manifest.json`
- `data/hvac/raw-downloads/hvac_doc_fetch_manifest.csv`

Manifest fields:

- source file
- row number
- manufacturer
- model or family
- document URL
- HTTP status
- content type
- byte size
- SHA256
- local path
- fetched timestamp
- error, if any

## Rules

- Use public manufacturer sources first.
- Do not OCR yet.
- Do not add paid AI, Bedrock, embeddings, or AWS.
- Keep raw files ignored until reviewed.
- This is source collection for a later AI/RAG layer.

## Suggested command

```bash
node scripts/hvac/fetch-hvac-docs.mjs
```

## Acceptance test

1. Download the Goodman GSXN3 PDF from the sample manifest.
2. Write a metadata row with status, content type, byte size, hash, and local path.
3. Write manifest JSON and CSV.
4. Print a summary: attempted, succeeded, failed, skipped.

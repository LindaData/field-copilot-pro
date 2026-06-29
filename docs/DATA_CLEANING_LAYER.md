# HVAC Data Cleaning Layer

Purpose: turn HVAC source links, manuals, model names, and extracted specs into normalized records.

## Folder layout

```text
data/hvac/source_manifest.sample.csv
schemas/hvac_model_record.schema.json
schemas/hvac_source_record.schema.json
scripts/hvac/clean_hvac_manifest.py
ops/codex/HVAC_DATA_CLEANING_HANDOFF.md
```

## Flow

```text
source manifest CSV
  -> cleaner script
  -> normalized HVAC model records JSON
  -> validation warnings JSON
```

## Source manifest fields

Required:

- `manufacturer`
- `model_number`
- `unit_type`
- `source_url`
- `source_type`

Recommended:

- `series`
- `document_title`
- `document_date`
- `source_name`
- `retrieved_at`
- `notes`

## Normalized output fields

- `model_id`
- `manufacturer`
- `model_number`
- `model_number_normalized`
- `series`
- `unit_type`
- `source_url`
- `source_type`
- `source_name`
- `retrieved_at`
- `confidence`
- `lineage`

## Data quality checks

The cleaner flags missing core fields, unsupported source types, duplicate rows, unusual model numbers, and weak dates.

## Review rule

A normalized row is a structured candidate with source and confidence fields. It is not final truth until reviewed.

## Next layers

1. Add real HVAC source rows.
2. Add PDF metadata extraction.
3. Add spec extraction.
4. Export parquet once field names are stable.
5. Connect normalized records to HVAC model pages and Product JSON-LD.
# Codex Handoff: HVAC Data Cleaning Layer

Repo: `LindaData/field-copilot-pro`

Branch to pull:

```bash
git fetch origin feature/hvac-data-cleaning-main
git checkout feature/hvac-data-cleaning-main
```

Run the local cleaner:

```bash
python scripts/hvac/clean_hvac_manifest.py \
  --input data/hvac/source_manifest.sample.csv \
  --out-dir data/hvac/normalized
```

Then inspect:

```bash
cat data/hvac/normalized/hvac_cleaning_summary.json
cat data/hvac/normalized/hvac_models.normalized.json
```

## Task for Codex

Improve the HVAC data cleaning layer without changing the current React demo behavior.

Goals:

1. Run the cleaner against the sample manifest.
2. Add unit tests for `scripts/hvac/clean_hvac_manifest.py`.
3. Add duplicate detection for manufacturer + normalized model number + source URL.
4. Add CSV output beside the JSON output.
5. Add optional parquet output only if a lightweight dependency is already available; otherwise leave a TODO.
6. Add more sample source rows only when the source URL is real and public.
7. Keep every normalized row source-linked.
8. Do not add cloud deployment or paid services.
9. Run `npm run lint`, `npm test`, and `npm run build` if dependencies are installed.
10. Summarize changes, commands run, and remaining review items.

## Expected output files

```text
data/hvac/normalized/hvac_models.normalized.json
data/hvac/normalized/hvac_cleaning_summary.json
```

## Review checklist

- Core fields are present.
- Bad rows produce warnings.
- Source URL is preserved.
- Confidence decreases when warnings exist.
- No runtime app behavior changes.
- No generated normalized output is committed unless intentionally reviewed.

# HVAC Document Reader Plan

## Objective

Build a field-tech document reader that stays grounded in approved equipment documents and clearly shows when an answer comes from exact-model literature, a family match, or a generic manufacturer source.

## Current baseline

- The app now links official manufacturer category pages, family pages, document portals, and verified PDFs to seeded equipment.
- The current deterministic answer layer already refuses unsafe requests and avoids promoting unverified numeric values.
- Most non-Goodman equipment records are still demo placeholders, so exact-model extraction is not yet available.

## Recommended next build steps

1. Normalize document metadata
   - Persist manufacturer, equipment type, model family, exact model coverage, document type, confidence, and canonical URL.
   - Distinguish `verified_exact_match`, `likely_model_family_match`, and `manufacturer_generic`.

2. Add document ingestion
   - Download approved public PDFs and HTML sources into a local or cloud document store.
   - Extract text, page numbers, tables, headings, and wiring-diagram references.
   - Preserve a citation path back to the original manufacturer URL.

3. Build a bounded retrieval layer
   - Filter retrieval by manufacturer, equipment type, model family, and confidence.
   - Prefer exact-model docs first, then family matches, then generic manufacturer sources.
   - Never mix unrelated brands or unrelated equipment classes in the same answer set.

4. Keep answer policies strict
   - Do not invent numeric specs that are not in the retrieved source.
   - Do not present family-level values as exact-model values.
   - Require nameplate confirmation for MCA, MOP, refrigerant charge, voltage, and matched-system values when the source is not exact.
   - Refuse unsafe bypass, refrigerant venting, or code-violating instructions.

5. Show source context in the UI
   - Display source title, page number, confidence, and match status on every answer.
   - Let the tech open the cited source directly from the answer card.
   - Warn clearly when the answer is based on a family match or generic brand page.

## Suggested first agent scope

Start with:

- Goodman GSXN3 verified flow
- Goodman heat pumps and furnaces with official PDFs
- Mitsubishi via myLinkDrive
- Carrier, Bryant, Trane, Lennox, Rheem, Daikin category and family sources as source-pointer mode only

Do not enable free-form repair advice across the whole dataset until exact-model extraction and citations are working.

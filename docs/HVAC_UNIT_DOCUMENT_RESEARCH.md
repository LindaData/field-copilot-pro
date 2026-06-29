# HVAC Unit Documentation Research

Related: #14, #19

## Purpose

Collect manufacturer documentation for equipment shown in the Owner Equipment screen before any paid AI/RAG work.

This is a cheap-first data step. Do not add Bedrock, embeddings, OCR, AWS deployment, or paid AI calls yet.

For Codex execution, use: [Codex HVAC Document Search Prompt](CODEX_HVAC_DOCUMENT_SEARCH_PROMPT.md).

## Research run

- Date: 2026-06-29
- Scope: Issue #19 target units
- Output table: [HVAC_UNIT_DOCUMENT_RESEARCH.csv](HVAC_UNIT_DOCUMENT_RESEARCH.csv)
- Mobile review link: https://lindadata.github.io/field-copilot-pro/app/owner/equipment

## Demo-phase confidence policy

This does not have to be perfect in the demo phase. The goal is to make a best-effort match, clearly label the confidence level, and make it easy for the end user or owner/admin to correct later.

Recommended user-facing disclaimer:

> Demo data: documentation links are best-effort matches. Confirm model and serial from the unit nameplate before relying on specs, wiring, refrigerant, or safety information. We are improving exact matching over time.

Use this approach:

1. If an official manufacturer document clearly matches the model family, link it.
2. If exact model formatting is uncertain, mark it as a best-effort/likely match instead of blocking the demo.
3. If the visible app model is a demo placeholder, use best-effort manufacturer/type notes and request real nameplate data.
4. Never hide uncertainty from the technician or owner.
5. Future AI should only use documents that are approved or clearly labeled with confidence.

## Research summary

| Unit shown in app | Type shown | Source found | Match status | Confidence | Needs review |
| --- | --- | --- | --- | --- | --- |
| Goodman `GSXN3N2410A*` | Air Conditioner | [Goodman GSXN3 Specification Sheet](https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf) | `best_effort_demo_match` | High | Yes |
| Goodman `GOO-ACX850` | Air Conditioner | [Goodman Air Conditioners Product Library](https://www.goodmanmfg.com/products/air-conditioners) | `manufacturer_generic` | Low | Yes |
| Goodman `GOO-GASC45` | Gas Furnace | [Goodman Gas Furnaces Product Library](https://www.goodmanmfg.com/products/gas-furnaces) | `manufacturer_generic` | Low | Yes |
| Rheem `RHE-ACS520` | Heat Pump | [Rheem Residential Heat Pumps Product Library](https://www.rheem.com/products/residential/heating-and-cooling/heat-pumps/) | `manufacturer_generic` | Low | Yes |
| Lennox `LEN-AHB83` | Air Handler | [Lennox Residential Air Handlers Product Library](https://www.lennox.com/residential/products/heating-cooling/air-handlers) | `manufacturer_generic` | Low | Yes |
| Carrier `CAR-TSB44` | Unknown / partially visible | [Carrier Residential Air Conditioners Product Library](https://www.carrier.com/us/en/residential/air-conditioners/) | `manufacturer_generic` | Low | Yes |

## Findings by unit

### Goodman `GSXN3N2410A*`

- Official source: https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf
- Supporting manufacturer page: https://www.goodmanmfg.com/products/air-conditioners
- Result: The Goodman air-conditioner page lists `GSXN3`, and the Goodman literature library lists `GSXN3 - ProductSpecs`.
- Match status: `best_effort_demo_match`
- Confidence: High for the GSXN3 family, still not exact until the app model formatting and installed nameplate are confirmed.
- Notes: The app model appears to correspond to `GSXN3 N2410A*`, but keep the demo label until an owner/admin confirms the exact nameplate.

### Goodman `GOO-ACX850`

- Official source: https://www.goodmanmfg.com/products/air-conditioners
- Result: Exact searches for `GOO-ACX850`, `GOO ACX850`, and Goodman `ACX850` did not produce a public official model result.
- Match status: `manufacturer_generic`
- Confidence: Low
- Notes: Treat this as a demo placeholder. The official Goodman AC library is a useful starting point, not a specific match.

### Goodman `GOO-GASC45`

- Official source: https://www.goodmanmfg.com/products/gas-furnaces
- Supporting literature library: https://www.goodmanmfg.com/support/literature-library
- Result: Exact searches for `GOO-GASC45`, `GOO GASC45`, and Goodman `GASC45` did not produce a public official model result.
- Match status: `manufacturer_generic`
- Confidence: Low
- Notes: Goodman publishes current gas-furnace family pages and product-spec PDFs, but no source should be treated as matching `GOO-GASC45` until the real furnace model is captured from a nameplate.

### Rheem `RHE-ACS520`

- Official source: https://www.rheem.com/products/residential/heating-and-cooling/heat-pumps/
- Result: Exact searches for `RHE-ACS520`, `RHE ACS520`, and Rheem `ACS520` did not produce a public official model result.
- Match status: `manufacturer_generic`
- Confidence: Low
- Notes: The Rheem heat-pump library lists current RP/RD residential heat-pump families. Use it only as a source pointer until the installed model is known.

### Lennox `LEN-AHB83`

- Official source: https://www.lennox.com/residential/products/heating-cooling/air-handlers
- Result: Exact searches for `LEN-AHB83` and Lennox `AHB83` did not produce a public official model result.
- Match status: `manufacturer_generic`
- Confidence: Low
- Notes: The Lennox air-handler library lists current CBK/CBA air handlers. This is not an exact match or a likely model-family match for `LEN-AHB83`.

### Carrier `CAR-TSB44`

- Official source: https://www.carrier.com/us/en/residential/air-conditioners/
- Result: Exact searches for `CAR-TSB44`, `CAR TSB44`, and Carrier `TSB44` did not produce a public official HVAC equipment result.
- Match status: `manufacturer_generic`
- Confidence: Low
- Notes: The app row appears incomplete or placeholder-like. The source is generic until the owner captures equipment type, full model, and nameplate.

## Required app statuses

Use plain-language labels in the UI:

| Internal status | UI label |
| --- | --- |
| `verified_exact_match` | Exact manual linked |
| `best_effort_demo_match` | Demo best-effort match |
| `likely_model_family_match` | Likely match, review needed |
| `manufacturer_generic` | Generic manufacturer document |
| `missing_documentation` | No manual linked |
| `needs_owner_review` | Needs review |
| `rejected_mismatch` | Rejected mismatch |

## Research rules

1. Manufacturer PDF/spec sheet beats third-party summary sites.
2. In demo mode, a strong family match is enough when clearly labeled.
3. Exact model/nameplate match is still the long-term goal.
4. Do not mark demo IDs as exact verified unless a real source confirms the exact model.
5. Store source URL, document title, document type, match confidence, review status, and reviewer notes.
6. Future AI should only retrieve from approved or clearly labeled documents, with the confidence shown to the user.

## AI/document-reader direction for a later PR

The current demo can expose these rows as source pointers, but it should not claim that generic manufacturer pages contain exact service values for placeholder models.

A later non-paid prototype can add a local, deterministic document-status helper that:

- Shows whether each unit has an exact, best-effort, generic, missing, or rejected source.
- Lets the owner mark a link as approved or rejected.
- Allows the demo copilot to answer only from approved exact/spec rows, or to abstain with a source-review warning.
- Keeps paid AI, embeddings, OCR, AWS, and Bedrock out of this phase.

## Next collection tasks

1. Replace placeholder demo model IDs with realistic sample model/nameplate IDs or mark them clearly as demo placeholders.
2. Add equipment-document status helper to the app.
3. Add a visible demo disclaimer near documentation links.
4. Add owner review queue for equipment with missing or generic documentation.
5. Keep AI disabled until document matching and approval workflows are stable.

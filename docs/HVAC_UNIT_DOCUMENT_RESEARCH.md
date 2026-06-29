# HVAC Unit Documentation Research

Related: #14

## Purpose

Collect manufacturer documentation for equipment shown in the Owner Equipment screen before any paid AI/RAG work.

This is a cheap-first data step. Do not add Bedrock, embeddings, OCR, or AI calls yet.

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

## Visible equipment from screenshot

| Unit shown in app | Type shown | Current status | Next action |
| --- | --- | --- | --- |
| Goodman `GSXN3N2410A*` | Air Conditioner | Best-effort demo match to Goodman `GSXN3 N2410A*` spec-sheet family from user-provided Goodman PDF | Link now as best-effort, upgrade later after nameplate review |
| Goodman `GOO-ACX850` | Air Conditioner | Demo placeholder; no exact source found from the visible model text | Keep as needs review, collect real nameplate when available |
| Goodman `GOO-GASC45` | Gas Furnace | Demo placeholder; no exact source found from the visible model text | Keep as needs review, collect real nameplate when available |
| Rheem `RHE-ACS520` | Heat Pump | Demo placeholder; no exact source found from the visible model text | Keep as needs review, collect real nameplate when available |
| Lennox `LEN-AHB83` | Air Handler | Demo placeholder; no exact source found from the visible model text | Keep as needs review, collect real nameplate when available |
| Carrier `CAR-TSB44` | Partially visible | Demo placeholder or incomplete row; no exact source found from visible text | Need full row/model/nameplate |

## Confirmed example source

### Goodman GSXN3 / GSXN3 N2410A*

User-provided document:

https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf?view=true&mobiledevice=true

Canonical source URL:

https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf

Source classification:

- Manufacturer: Goodman
- Product family: GSXN3
- Document code: SS-GSXN3
- Document type: Specification sheet
- Equipment type: Split system air conditioner
- App match: Goodman `GSXN3N2410A*` appears to correspond to PDF model column `GSXN3 N2410A*`
- Match status: `best_effort_demo_match` now; later upgrade to `verified_exact_match` after owner/admin confirms the nameplate

Suggested app document record:

```json
{
  "equipmentModelInApp": "GSXN3N2410A*",
  "manufacturer": "Goodman",
  "normalizedModel": "GSXN3 N2410A*",
  "equipmentType": "Air Conditioner",
  "documentTitle": "Goodman GSXN3 Specification Sheet",
  "documentCode": "SS-GSXN3",
  "documentType": "spec_sheet",
  "url": "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf?view=true&mobiledevice=true",
  "canonicalUrl": "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf",
  "matchStatus": "best_effort_demo_match",
  "sourceStatus": "manufacturer_source",
  "requiresOwnerReview": true,
  "notes": "User identified this as the correct example source. Good enough for demo as best-effort. Confirm exact model from nameplate before marking verified_exact_match."
}
```

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
6. Future AI should only retrieve from `verified_exact_match`, `best_effort_demo_match`, or owner-approved documents, with the confidence shown to the user.

## Next collection tasks

1. Add equipment-document status helper to the app.
2. Add the Goodman GSXN3 PDF link to the Goodman `GSXN3N2410A*` demo record.
3. Add a visible demo disclaimer near documentation links.
4. Replace placeholder demo model IDs with realistic sample model/nameplate IDs or mark them clearly as demo placeholders.
5. Add owner review queue for equipment with missing or likely-match documentation.
6. Do not add paid AI until document matching is stable.

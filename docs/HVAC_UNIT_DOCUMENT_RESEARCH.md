# HVAC Unit Documentation Research

Related: #14

## Purpose

Collect manufacturer documentation for equipment shown in the Owner Equipment screen before any paid AI/RAG work.

This is a cheap-first data step. Do not add Bedrock, embeddings, OCR, or AI calls yet.

## Visible equipment from screenshot

| Unit shown in app | Type shown | Current status | Next action |
| --- | --- | --- | --- |
| Goodman `GSXN3N2410A*` | Air Conditioner | Matched to Goodman `GSXN3 N2410A*` spec-sheet family from user-provided Goodman PDF | Add as likely/exact source after owner confirms nameplate spacing |
| Goodman `GOO-ACX850` | Air Conditioner | Looks like demo placeholder; no exact source confirmed yet | Need real nameplate/model |
| Goodman `GOO-GASC45` | Gas Furnace | Looks like demo placeholder; no exact source confirmed yet | Need real nameplate/model |
| Rheem `RHE-ACS520` | Heat Pump | Looks like demo placeholder; no exact source confirmed yet | Need real nameplate/model |
| Lennox `LEN-AHB83` | Air Handler | Looks like demo placeholder; no exact source confirmed yet | Need real nameplate/model |
| Carrier `CAR-TSB44` | Partially visible | Looks like demo placeholder or incomplete row | Need full row/model/nameplate |

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
- Match status: `likely_model_family_match` until owner/admin confirms exact nameplate formatting

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
  "matchStatus": "likely_model_family_match",
  "sourceStatus": "manufacturer_source",
  "requiresOwnerReview": true,
  "notes": "User identified this as the correct example source. Confirm exact model from nameplate before marking verified_exact_match."
}
```

## Required app statuses

Use plain-language labels in the UI:

| Internal status | UI label |
| --- | --- |
| `verified_exact_match` | Exact manual linked |
| `likely_model_family_match` | Likely match, review needed |
| `manufacturer_generic` | Generic manufacturer document |
| `missing_documentation` | No manual linked |
| `needs_owner_review` | Needs review |
| `rejected_mismatch` | Rejected mismatch |

## Research rules

1. Manufacturer PDF/spec sheet beats third-party summary sites.
2. Exact model/nameplate match beats family match.
3. Do not mark demo IDs as verified unless a real source confirms the exact model.
4. Store source URL, document title, document type, match confidence, review status, and reviewer notes.
5. Future AI should only retrieve from `verified_exact_match` or owner-approved documents.

## Next collection tasks

1. Add equipment-document status helper to the app.
2. Add the Goodman GSXN3 PDF link to the Goodman `GSXN3N2410A*` demo record.
3. Replace placeholder demo model IDs with realistic sample model/nameplate IDs or mark them clearly as demo placeholders.
4. Add owner review queue for equipment with missing or likely-match documentation.
5. Do not add paid AI until document matching is stable.

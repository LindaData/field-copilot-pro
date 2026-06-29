# Codex Prompt — HVAC Unit Documentation Search

Use this prompt when Codex is ready to research manufacturer documentation online.

## Objective

For each HVAC unit in Field Copilot Pro, find the best available documentation and save it in a structured, reviewable format.

This is demo-phase work. Matches do not have to be perfect, but confidence must be clear.

## Rules

- No paid AI.
- No AWS deployment.
- Prefer manufacturer PDFs/pages.
- Third-party manual sites are fallback only.
- Show uncertainty to the user.
- Do not mark exact unless the model number clearly matches.

## Target units

- Goodman GSXN3N2410A*
- Goodman GOO-ACX850
- Goodman GOO-GASC45
- Rheem RHE-ACS520
- Lennox LEN-AHB83
- Carrier CAR-TSB44

Goodman example source:
https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf?view=true&mobiledevice=true

## Search variations

For each unit, try exact model, no-hyphen model, model with spaces, manufacturer plus model, and manufacturer plus equipment type.

Also try words like HVAC unit, AC unit, air conditioner, condenser, outdoor unit, split system air conditioner, heat pump, gas furnace, air handler, installation manual, service manual, spec sheet, wiring diagram, product data, submittal, and IOM.

## Match statuses

- verified_exact_match
- best_effort_demo_match
- likely_model_family_match
- manufacturer_generic
- missing_documentation
- needs_owner_review
- rejected_mismatch

## Output CSV columns

```csv
equipment_model,manufacturer,equipment_type,document_title,document_type,document_url,canonical_url,match_status,source_priority,confidence,needs_review,notes
```

## Capture when available

- Document title
- Manufacturer
- Product family
- Exact models listed
- Equipment type
- Capacity
- Voltage
- MCA and MOCP
- Refrigerant info
- Wiring diagram pages
- Dimensions page
- Source URL
- Confidence notes

## Next implementation PR after research

- Add equipment-document status helper.
- Show labels on owner equipment cards.
- Show labels on equipment profile headers.
- Show labels on job detail equipment cards.
- Add a demo disclaimer near documentation links.
- Keep AI disabled.

## Validation commands

```bash
npm run lint
npm test
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm run build
```

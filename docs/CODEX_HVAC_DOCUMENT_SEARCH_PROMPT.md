# Codex Prompt — HVAC Unit Documentation Search

Use this prompt when Codex is ready to research manufacturer documentation online.

## Objective

For each HVAC unit in Field Copilot Pro, find the best available documentation and save it in a structured, reviewable format.

This is demo-phase work. Matches do not have to be perfect, but confidence must be clear.

## Constraints

- Do not add paid AI calls.
- Do not use Bedrock, embeddings, OCR, or vector databases yet.
- Prefer official manufacturer PDFs and pages.
- Third-party manual sites are allowed only as fallback and must be labeled as fallback.
- Keep all uncertainty visible to the end user.
- Do not mark anything as exact unless the model number clearly matches.

## Target units from current demo screenshot

Start with:

1. Goodman GSXN3N2410A*
2. Goodman GOO-ACX850
3. Goodman GOO-GASC45
4. Rheem RHE-ACS520
5. Lennox LEN-AHB83
6. Carrier CAR-TSB44

The first Goodman unit already has a good example document:

https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf?view=true&mobiledevice=true

## Search terms to try

For each unit, search multiple model variations:

- Exact visible model
- Model without hyphens
- Model with spaces inserted by product family
- Manufacturer + model
- Manufacturer + model + pdf
- Manufacturer + model + spec sheet
- Manufacturer + model + installation manual
- Manufacturer + model + service manual
- Manufacturer + model + wiring diagram
- Manufacturer + model + product data
- Manufacturer + model + submittal
- Manufacturer + model + IOM
- Manufacturer + equipment type + model family

Also use equipment wording variations:

- HVAC unit
- AC unit
- air conditioner
- condenser
- condensing unit
- outdoor unit
- split system air conditioner
- heat pump
- gas furnace
- air handler
- evaporator coil
- package unit

## Official-source priority

Prefer sources in this order:

1. Manufacturer official PDF or product page.
2. Manufacturer document library.
3. Manufacturer dealer/partner library if public.
4. AHRI reference only for matching/rating context.
5. Supply house product page with linked manufacturer PDF.
6. Third-party manual mirror, clearly labeled fallback.

Avoid using blog posts, forum answers, SEO pages, scraped AI summaries, or unsupported spec snippets as primary sources.

## Match statuses

Use these statuses:

- verified_exact_match
- best_effort_demo_match
- likely_model_family_match
- manufacturer_generic
- missing_documentation
- needs_owner_review
- rejected_mismatch

## Output format

Update or create a data file with one row per candidate document:

```csv
equipment_model,manufacturer,equipment_type,document_title,document_type,document_url,canonical_url,match_status,source_priority,confidence,needs_review,notes
```

Recommended `document_type` values:

- spec_sheet
- installation_manual
- service_manual
- owner_manual
- wiring_diagram
- product_data
- submittal
- parts_list
- warranty
- unknown

## Extraction targets

When a document is found, capture:

- Document title
- Manufacturer
- Product family
- Exact model(s) listed
- Equipment type
- Nominal capacity if available
- Voltage if available
- MCA / MOCP if available
- Refrigerant info if available
- Wiring diagram pages if available
- Dimensions page if available
- Source URL
- Confidence notes

Do not overfit the app to extracted values yet. Store the research first.

## Goodman GSXN3 example handling

Treat the user-provided Goodman GSXN3 spec sheet as the example pattern.

For `GSXN3N2410A*`:

- Manufacturer: Goodman
- Product family: GSXN3
- Visible app model: GSXN3N2410A*
- Source model formatting: GSXN3 N2410A*
- Document type: spec_sheet
- Match status: best_effort_demo_match
- Notes: strong official family/model match, but exact nameplate should be confirmed before exact verification

## Implementation work after research

After the research file is updated, prepare a separate implementation PR that:

1. Adds an equipment-document status helper.
2. Adds visible labels on owner equipment cards.
3. Adds visible labels on equipment profile headers.
4. Adds visible labels on job detail equipment cards.
5. Adds a demo disclaimer near document links.
6. Keeps all AI features disabled.

## PR requirements

Every PR must include:

- Mobile review link
- What changed
- What Sergio should check first
- Feedback space
- Commands run
- Confirmation that no paid AI calls were added
- Confirmation that no AWS resources were deployed

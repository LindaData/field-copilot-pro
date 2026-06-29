# US HVAC Top 50 Documentation Research

Related: #19

## Purpose

This dataset is a separate national reference list for common HVAC equipment families used in the United States. It is not a claim that these are the only HVAC units in the US. It is a practical top-50 starting point for future source-backed repair assistance.

Output CSV:

- [US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.csv](US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.csv)

## Scope

The list prioritizes equipment families and product-library entries that are likely to appear often in US residential and light-commercial service:

- Residential split-system air conditioners
- Residential split-system heat pumps
- Residential gas furnaces
- Air handlers, fan coils, and evaporator coils
- Ductless mini-splits
- Light-commercial rooftop units

The ranking is a documented service-priority heuristic, not a purchased market-share dataset. Exact national unit-level installation counts are not publicly available in a clean source suitable for this demo.

## Source Quality Policy

Rows prefer sources in this order:

1. Direct official manufacturer PDF for the product family.
2. Official manufacturer product-family page.
3. Official manufacturer product-library page.
4. Official manufacturer documentation portal.
5. Official brand entry page when deep product pages are unstable.

Third-party manual mirrors are intentionally excluded from this first pass. If a manufacturer hides service PDFs behind dealer portals, the row stays linked to the public official page and is marked as lower confidence.

## Match Status Policy

Use these statuses consistently:

| Status | Meaning |
| --- | --- |
| `likely_model_family_match` | A specific manufacturer family page or PDF was found, but exact installed model still needs nameplate review. |
| `manufacturer_generic` | The official source is a category/library/portal, not a specific model-family document. |
| `verified_exact_match` | Reserved for a row tied to a confirmed installed model and exact manual. Not used in this national dataset. |

No row in this file should be used as final repair guidance until the installed equipment model and serial are captured and the matching service/install manual is approved.

## Research Notes

- Goodman rows have the strongest public PDF coverage in this pass.
- Carrier and Bryant expose several stable public family pages; service PDFs may require a dealer/literature portal.
- Trane, American Standard, Lennox, Rheem, Amana, Daikin, Bosch, Mitsubishi Electric, Fujitsu, LG, and other manufacturers expose official product libraries that are useful starting points but are not exact repair documents by themselves.
- York and Coleman public deep links were unstable during this pass, so they are not used as technical source rows except where the official brand/product entry can be reviewed later.
- Mitsubishi is represented both by the product library and the official mylinkdrive documentation portal because the portal is the high-quality source for model-specific ductless service documents.

## Processing Rule

The CSV is ordered from most common/high-priority to less common/lower-priority. Each row was only saved after an official source was identified and classified. Rows with category pages are intentionally marked `manufacturer_generic` so future AI/document-reader work cannot treat them as exact repair manuals.

## Next Steps

1. Use this CSV as a seed list for a real documentation review queue.
2. For each live customer unit, capture the nameplate model and serial.
3. Search the manufacturer site or portal for the exact install/service/product-data PDF.
4. Mark approved exact documents separately from generic category rows.
5. Only allow AI/document-reader answers from approved exact documents or explicitly labeled family matches.

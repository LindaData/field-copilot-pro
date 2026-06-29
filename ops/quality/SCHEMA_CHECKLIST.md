# Schema Checklist

Use with `ops/quality/SCHEMA.md` and `ops/quality/COMMAND_WITH_SCHEMA.md`.

## Page-level structured data

- Each important public page has one clear main entity.
- JSON-LD matches visible page content.
- JSON-LD is valid JSON.
- Public entity pages use stable URLs and stable IDs.
- Page metadata and JSON-LD describe the same item.

## Internal data schema

- Main entities are documented.
- Primary keys and relationships are clear.
- Normalized records include source and lineage fields.
- Model outputs include model version and data version.
- Analytics exports include metadata and timestamps.
- API responses match documented JSON shape.

## Project checks

- HVAC: models connect to manufacturers, documents, specs, aliases, and source URLs.
- PawPath: places connect to business profiles, pet policies, amenities, and user feedback.
- Sports: matches connect to teams, competitions, predictions, and model runs.
- RStudio/package: commands connect to providers, model configs, templates, and docs.

## PR summary add-on

```markdown
## Schema / data structure
- Main entities:
- Relationships changed:
- Structured data changed:
- Source/lineage fields added:
- Needs review:
```

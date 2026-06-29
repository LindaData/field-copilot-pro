# SEO / Performance / Accessibility / Schema Command

Use this command in Codex, ChatGPT Agent Mode, or a repo review chat when data structure matters.

```text
Optimize this repo for SEO, performance, accessibility, and schema/data structure.

Make safe code changes where the improvement is clear. Prioritize mobile-first UX, fast loading, readable structure, semantic HTML, useful metadata, Schema.org JSON-LD where appropriate, alt text, keyboard navigation, color contrast, form labels, chart/table summaries, clean page titles/descriptions, and clear data relationships.

Start by inspecting the repo structure and running available checks. If this repo has `scripts/quality-audit.sh`, run it first. If this repo has `ops/quality/SCHEMA.md`, review it before changing data structures.

Schema/data requirements:
- Document the main entities, keys, and relationships.
- Add or improve JSON-LD only when it matches visible page content.
- Use Schema.org Product for HVAC/model pages where the unit is the main entity.
- Use Schema.org LocalBusiness or Place patterns for PawPath location pages.
- Use Schema.org Review/AggregateRating only for real, visible reviews/ratings tied to a specific item.
- Add source, retrieval date, confidence, and lineage fields to normalized datasets.

Project-specific lens:
- HVAC / Field Copilot: model-number pages, spec/manual metadata, fast search, readable tables, Product JSON-LD, and source-linked spec lineage.
- PawPath: pet-friendly location pages, map/filter speed, readable cards, keyboard-friendly filters, review summaries, LocalBusiness/Place JSON-LD, and pet-policy data relationships.
- World Cup / sports static pages: static rendering, clear model explanations, fast tables/charts, accessible chart summaries, match/team schemas, and model-run lineage.
- RStudio / AI package: README/pkgdown SEO, keyboard-friendly commands, clear docs, low-overhead local tooling, SoftwareApplication/SoftwareSourceCode docs, and command/provider schema.

Rules:
- Make small reviewable changes.
- Keep changes mobile-first and simple.
- Avoid broad rewrites unless needed.
- Avoid large new dependencies without approval.
- If a change is risky, create a TODO/issue note instead of forcing it.

Deliverables:
1. Summary of code/docs changed.
2. Checks run and results.
3. SEO fixes completed.
4. Performance fixes completed.
5. Accessibility fixes completed.
6. Schema.org/structured-data fixes completed.
7. Internal data schema/lineage fixes completed.
8. Remaining issues that need human review.
```

Shortest version:

```text
Optimize this repo for SEO, performance, accessibility, and schema/data structure. Edit the code, keep it mobile-first, run checks, add valid Schema.org only where appropriate, document data relationships, and summarize changes.
```

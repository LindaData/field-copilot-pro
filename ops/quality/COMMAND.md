# SEO / Performance / Accessibility Command

Use this command in Codex, ChatGPT Agent Mode, or a repo review chat.

```text
Optimize this repo for SEO, performance, and accessibility.

Make safe code changes where the improvement is clear. Prioritize mobile-first UX, fast loading, readable structure, semantic HTML, useful metadata, alt text, keyboard navigation, color contrast, form labels, chart/table summaries, and clean page titles/descriptions.

Start by inspecting the repo structure and running available checks. If this repo has `scripts/quality-audit.sh`, run it first. Then identify the highest-impact fixes and implement them in small, reviewable changes.

Rules:
- Do not expose secrets or modify credentials.
- Do not add paid services or large dependencies without explicit approval.
- Do not rewrite the whole app unless needed.
- Prefer static/edge-friendly pages where practical.
- Keep changes mobile-first and simple.
- If a change is risky, create a TODO/issue note instead of forcing it.

Project-specific lens:
- HVAC / Field Copilot: optimize model-number pages, spec/manual metadata, fast search, readable tables, and field-tech mobile use.
- PawPath: optimize pet-friendly location pages, map/filter speed, readable cards, keyboard-friendly filters, and review summaries.
- World Cup / sports static pages: optimize static rendering, clear model explanations, fast tables/charts, and accessible chart summaries.
- RStudio / AI package: optimize README/pkgdown SEO, keyboard-friendly commands, clear docs, and low-overhead local tooling.

Deliverables:
1. Summary of code/docs changed.
2. Checks run and results.
3. SEO fixes completed.
4. Performance fixes completed.
5. Accessibility fixes completed.
6. Remaining issues that need human review.
```

Shortest version:

```text
Optimize this repo for SEO, performance, and accessibility. Edit the code, keep it mobile-first, run checks, and summarize changes.
```

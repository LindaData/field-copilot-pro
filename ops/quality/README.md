# Quality Command Workspace

Reusable workspace for SEO, performance, and accessibility passes across LindaData projects.

Primary command file:

- `ops/quality/COMMAND.md`

Runnable local audit helper:

- `scripts/quality-audit.sh`

How to pull this workspace into a repo clone:

```bash
git fetch origin chore/quality-command-workspace
git checkout chore/quality-command-workspace
bash scripts/quality-audit.sh
```

How to use with Codex or ChatGPT:

1. Open the repo.
2. Run `bash scripts/quality-audit.sh` if available.
3. Paste the command from `ops/quality/COMMAND.md`.
4. Make safe code changes only.
5. Summarize changes, checks run, and remaining review items.

Priority use cases:

- HVAC/Field Copilot: fast unit lookup, readable specs, model-number pages, field-safe mobile UX.
- PawPath: fast pet-friendly map, readable filters/cards, location pages that can rank in search.
- World Cup/static sports pages: lightweight static rendering, clean tables, chart summaries.
- RStudio package/project site: discoverable README/pkgdown docs, keyboard-friendly commands, fast local tooling.

Working rule: optimize without adding expensive services, exposing secrets, or doing broad rewrites unless explicitly requested.

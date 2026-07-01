# Agent Company Implementation Log

## 2026-07-01

Implemented the first repo-level LindaData Agent Company structure in `LindaData/field-copilot-pro`.

## Added

- `README.md`: overview and operating rule.
- `org-chart.md`: leadership, executives, and specialist pods.
- `roles.yaml`: machine-readable agent roster.
- `workflows.yaml`: standard workflows for work routing.
- `message-contract.schema.json`: structured handoff contract.
- `safety-gates.md`: quality gates for task execution.
- `codex-bootstrap.md`: prompt for Codex or coding agents.
- `examples/hvac-review-layer-run.md`: review-layer feedback example.

## Design decision

This implementation starts as repo docs/config rather than runtime multi-agent automation. That keeps the first step safe, reviewable, and easy to use from Codex.

## Recommended next step

Use `docs/agent-company/codex-bootstrap.md` as the starting prompt for any Codex task in this repo.

## Future runtime options

- Add a small `agent-company/` package that validates messages against `message-contract.schema.json`.
- Add task ledger files under `docs/agent-company/ledgers/`.
- Add a lightweight CLI to create task packets from review-layer feedback.
- Connect review-layer notes to a durable backend store.
- Generate GitHub issues from approved feedback packets.

## 2026-07-01 tool and skills upgrade

Added the operating layer that maps skills and tools to agents.

### Added

- `tool-registry.yaml`: available tool groups, tool guardrails, agent tool routing, and missing-tool priorities.
- `skills-matrix.md`: skill groups, maturity levels, and immediate upgrade list.
- `tool-use-policy.md`: simple rules for when agents should use each tool.
- `next-tools-roadmap.md`: roadmap for durable ledgers, feedback endpoint, schema validation, workflow runner, CI, and runbooks.
- `ledgers/task-ledger-template.yaml`: reusable task ledger template.
- `.github/ISSUE_TEMPLATE/agent-task.yml`: GitHub issue template for structured agent tasks.

### Design decision

The agent company now separates role design from tool access. The CEO Commander routes work; executives approve the needed capability; specialists use only the tools required for that task.

### Current maturity

The repo is now at Level 1 moving into Level 2: structured docs, tool routing, and task templates exist; runtime automation still needs schema validation, persistent feedback storage, and issue/branch automation.

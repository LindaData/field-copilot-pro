# LindaData Agent Company Operating System

This folder defines how LindaData work should be run as a structured agent team.

The model:

```text
User
  ↓
CEO Commander Agent
  ↓
Chief of Staff / Project Secretary
  ↓
Executive Council
  ↓
Specialist Pods
  ↓
QA Review
  ↓
CEO Summary Back to User
```

## Patterns copied into this setup

- SOP-first execution: intake, requirements, plan, implementation, review, and log.
- Virtual company roles: executives decide, specialists execute, QA reviews.
- Ledger control: every task has a task ledger, progress ledger, decision log, blocker log, and artifact list.
- Orchestrator-worker flow: the CEO Commander breaks work into clear assignments.
- Evaluator-optimizer loop: QA reviews output, sends fixes back, then marks work ready.
- Handoffs: agents pass structured context instead of loose chat.
- Review layer: user feedback becomes task packets that the company can act on.

## Directory map

| File | Purpose |
| --- | --- |
| `org-chart.md` | Human-readable company structure. |
| `roles.yaml` | Agent roster and responsibilities. |
| `workflows.yaml` | Standard workflows for repo work, review feedback, bugs, research, and release readiness. |
| `message-contract.schema.json` | Strict message format agents use to talk to each other. |
| `safety-gates.md` | Quality gates that block weak work. |
| `codex-bootstrap.md` | Copy/paste instructions for Codex or a coding agent. |
| `examples/hvac-review-layer-run.md` | Example of agents handling HVAC review-layer feedback. |

## Operating rule

Only the CEO Commander talks back to the user by default. Every other agent communicates through structured handoffs, logs, artifacts, and summaries.

## Default task flow

1. User gives a goal.
2. CEO Commander creates a task packet.
3. Chief of Staff logs the task and assigns owners.
4. Executive Council clarifies requirements and risks.
5. Specialist Pods execute.
6. QA reviews.
7. CEO Commander gives the user a short status, link, or next action.

## Branching rule

Use branch names like:

```text
feature/agent-company-<short-task>
fix/review-layer-<short-bug>
docs/agent-company-<short-doc>
```

## First implementation scope

This first version is a repo-level operating system. It does not add runtime multi-agent code yet. It creates the structure Codex and future agents should follow before modifying the product.
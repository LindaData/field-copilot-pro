# Agent Company Skills Matrix

This matrix turns the agent company from role names into practical operating capability.

## Core skill groups

| Skill group | What it covers | Primary executive | Specialist agents |
| --- | --- | --- | --- |
| Goal intake | Convert messy user requests into clear task packets | CEO Commander | Chief of Staff |
| Product thinking | UX, flows, user stories, review-layer feedback | CPO | UX Research, UI Design, Review Layer Intake, Copy |
| Architecture | repo structure, frontend/backend split, technical risk | CTO | GitHub/Codex, Frontend, Backend/API, DevOps |
| Data and research | source discovery, schemas, metadata, modeling prep | CDO | Data Source Research, Data Engineering, Metadata, Modeling Prep |
| QA | functional tests, mobile tests, regression, accessibility | CQO | Functional QA, Mobile QA, Accessibility QA, Regression QA |
| Safety | secrets, privacy, risk, sensitive workflows | CSSO | Security Review, Credential Review, Compliance Notes |
| Delivery | task order, release readiness, logs, handoffs | COO | Project Planning, Release Manager, Chief of Staff |
| Growth/demo | SEO, demo story, onboarding, presentation polish | CGO | SEO, Demo Story, Onboarding, UI Design |

## Practical tool needs by work type

| Work type | Required tools | Output |
| --- | --- | --- |
| Repo implementation | GitHub, Codex, local checks when available | branch, changed files, PR, QA notes |
| Review-layer feedback | app feedback box, storage endpoint or demo store, GitHub issue/task | saved note, task packet, fix branch |
| YouTube/audio/video review | web search when available, AccurateScribe for uploaded media | transcript, summary, action items |
| HVAC documentation research | web search, file storage, metadata schema | source inventory, links, confidence notes |
| Data pipeline work | Python, GitHub, data storage, schema validator | repeatable pipeline, metadata, QA report |
| Mobile-first UI review | browser preview, iPhone checklist, accessibility checks | mobile findings and fixes |
| Business/demo polish | Canva, docs/slides, copy review | deck, screenshots, positioning notes |
| Project operations | Notion/GitHub Issues/Airtable, Gmail, Calendar | durable task log and schedule-aware plan |

## Agent maturity levels

### Level 1: Manual company

- Agents are represented by docs and prompts.
- CEO Commander routes work manually.
- Codex uses the bootstrap prompt.
- Review notes are summarized by the assistant.

### Level 2: Structured company

- Every task gets a JSON task packet.
- Feedback notes become GitHub issues or task rows.
- Each role has tool permissions.
- QA gates are required before merge.

### Level 3: Semi-automated company

- Review-layer notes are posted to a durable endpoint.
- A workflow runner creates issues, branches, or task prompts.
- Schema validation checks agent messages.
- Build/test/lint runs in CI.

### Level 4: Operating company

- Persistent task database.
- Multi-agent runtime or orchestrator.
- Automated routing to product, engineering, data, QA, and safety pods.
- CEO Commander only reports concise status and asks for approvals when needed.

## Current status

The repo is at Level 1 moving into Level 2.

## Immediate upgrades needed

1. Add a durable task ledger.
2. Add schema validation for agent messages.
3. Connect review-layer feedback to durable storage.
4. Add GitHub issue creation from approved feedback packets.
5. Add CI checks for docs/config validity.

## Mobile-first rule

Every user-facing agent summary should answer:

```text
What changed?
Where do I review it?
What do I do next?
What is the caveat?
```

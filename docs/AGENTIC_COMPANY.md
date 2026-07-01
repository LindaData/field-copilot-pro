# LindaData Agentic Company Operating Model

Status: first executable skeleton for the LindaData / Field Copilot Pro command structure.

Video review note: the YouTube Shorts URL could not be reliably fetched or transcribed from the public link. This model is built from the known LindaData direction: user as CEO, executives as the only chat-facing layer, and specialists working underneath the executives.

## Core idea

The user is the CEO. The CEO should not talk directly to every specialist agent.

The CEO talks to the executive layer. Executives translate messy input into clean work packets, talk to their teams, reconcile disagreements, then bring back a short decision-ready brief.

```text
CEO / user
  -> Executive council
      -> specialist agents
      -> GitHub issues / PRs / review inbox
      -> executive summary back to CEO
```

## Executive layer

These are the agents that can talk directly to the CEO:

| Executive | Mission | Default output |
| --- | --- | --- |
| Chief of Staff / COO | Intake, triage, priorities, agent routing, status control | urgent / later / ignore list |
| CTO | Architecture, repo changes, Codex prompts, technical implementation | build packet + acceptance criteria |
| CPO / UX Chief | User experience, mobile-first review, demo flow, copy, buttons | UX review + page-by-page fixes |
| Chief Data Officer | Data sources, scraping plans, synthetic/demo data, model readiness | data plan + data quality risks |
| CFO | Pricing, unit economics, cost, paid tool tradeoffs | cost/risk summary |
| CISO / Safety Chief | Secrets, auth, privacy, dangerous changes, compliance guardrails | safety gate + blocked actions |
| QA / Release Chief | Tests, CI, PR review, regression checks, deploy readiness | test plan + release decision |

## Specialist layer

Specialists should normally not talk directly to the CEO. They report through executives.

| Specialist | Reports to | Work |
| --- | --- | --- |
| Frontend Builder | CTO | React/Vite UI, routing, components, mobile shell |
| Backend/API Builder | CTO | endpoints, webhooks, workers, persistence |
| GitHub/Codex Operator | CTO | branches, issues, PRs, Codex-ready prompts |
| UI Review Agent | CPO | page walkthroughs, friction notes, mobile usability |
| Copy/SEO Agent | CPO | labels, plain-English copy, landing-page structure |
| Data Engineering Agent | CDO | source discovery, docs ingestion, data contracts |
| RAG/AI Agent | CDO | equipment knowledge, retrieval, LLM behavior |
| Synthetic Demo Data Agent | CDO | realistic local/demo state and mock records |
| Security Scanner | CISO | secret leakage, auth gaps, unsafe exposure |
| Test Runner | QA | lint, unit tests, smoke tests, release gates |

## Message flow

Every request should move through five steps.

1. **CEO intake**: raw instruction, screenshot, voice note, GitHub inbox note, or app review note.
2. **Executive routing**: Chief of Staff picks responsible executives.
3. **Specialist delegation**: executives send scoped asks to their teams.
4. **Reconciliation**: executives combine answers, resolve conflicts, and produce PR-sized packets.
5. **CEO brief**: only the executive summary comes back to the user.

## GitHub as the company memory

Use GitHub as the durable execution memory.

- One issue for messy intake when needed.
- One branch per meaningful workstream.
- One PR per reviewable change.
- Codex prompts should be PR-sized and include scope, out-of-scope, acceptance criteria, tests, and safety limits.
- Do not expose tokens, secrets, review keys, or API keys in frontend code, logs, commits, or chat.

## Review layer priority

The Field Copilot review layer remains the first practical agent intake pipe.

```text
Review box in app
  -> Cloudflare Worker
  -> GitHub Review Inbox issue
  -> Chief of Staff triage
  -> CTO / CPO / CDO / QA work packets
  -> Codex branch / PR
  -> CEO review
```

## Decision rules

- HVAC / Field Copilot stays priority one unless the CEO changes priority.
- Mobile-first instructions by default.
- Keep CEO answers short, numbered, and action-oriented.
- Protect secrets.
- Prefer reviewable PRs over direct main-branch changes.
- Specialists can disagree, but executives must return one clear recommendation.

## Next build step

The TypeScript file `src/lib/agenticCompany.ts` contains the first executable registry and message-passing skeleton. It lets the app or future Codex workflows simulate which executives receive a request, which specialists they delegate to, and what work packets return to the CEO.

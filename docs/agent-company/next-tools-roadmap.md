# Next Tools Roadmap

## Goal

Move LindaData from a document-defined agent company to a semi-automated operating company.

## Priority 1: Durable task ledger

Best options:

1. GitHub Issues for code/product tasks.
2. Notion for executive notes and long-running project memory.
3. Airtable for structured feedback/task rows.
4. Backend table for product-generated review-layer notes.

Recommended first move:

```text
GitHub Issues + repo ledger files
```

Reason: already connected to code, PRs, branches, and Codex.

## Priority 2: Review-layer feedback endpoint

Need:

- submit feedback from app
- persist it somewhere durable
- tag page, route, timestamp, user/browser context when appropriate
- convert feedback into task packets

Recommended demo path:

```text
frontend review box → lightweight API endpoint → feedback store → GitHub issue/task packet
```

## Priority 3: Message schema validation

Need:

- validate JSON handoffs against `message-contract.schema.json`
- block malformed packets
- keep agents from producing vague output

Candidates:

- `ajv` for Node/TypeScript
- `jsonschema` for Python
- GitHub Action validation on PRs

## Priority 4: Workflow runner

Need:

- take approved feedback packets
- create issues
- create branches
- generate Codex prompts
- update task status

Candidates:

- n8n
- GitHub Actions
- small Node CLI
- small Python CLI

Recommended first move:

```text
small repo CLI first, n8n later
```

Reason: keeps behavior visible in GitHub before external automation.

## Priority 5: CI checks

Need:

- lint
- test
- build
- schema validate agent docs
- detect accidental secrets

Recommended checks:

```text
npm run lint
npm test
npm run build
agent message schema validation
secret scan
```

## Priority 6: Tool-specific runbooks

Create short runbooks for:

- GitHub + Codex repo work
- web research
- video/audio transcription
- Canva demos
- Notion project logs
- Gmail/GitHub failure email review
- Google Calendar work-block planning
- Replit/Lovable prototype import

## Immediate implementation sequence

```text
1. Add tool registry. Done.
2. Add skills matrix. Done.
3. Add tool use policy. Done.
4. Add task ledger template.
5. Add GitHub issue templates for agent tasks.
6. Add schema validation script.
7. Add feedback endpoint plan or implementation.
```

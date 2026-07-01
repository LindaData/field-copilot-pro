# Agent Company Tool Use Policy

## Rule 1: Tools are assigned by job, not by ego

Agents should use the smallest tool set needed to complete the task.

Example:

```text
Review-layer bug → CPO + CTO + Backend/API + Frontend + QA
Marketing deck → CGO + Copy + UI Design + Canva
HVAC documentation → CDO + Data Source Research + Metadata
```

## Rule 2: CEO Commander owns routing

The CEO Commander decides which executive owns the work. The executive chooses specialist agents and tools.

## Rule 3: Chief of Staff logs everything important

Each tool-using task should produce:

- task id
- owner
- tool used
- result
- artifact path or link
- caveat
- next action

## Rule 4: Use GitHub as source of truth for code

Rapid tools can help, but durable source code and docs should return to GitHub.

## Rule 5: Use Codex for heavy repo work

Use Codex when the task needs:

- broad repo inspection
- many code edits
- local test execution
- repeated implementation cycles
- long-running work

Use this starting prompt:

```text
docs/agent-company/codex-bootstrap.md
```

## Rule 6: Use web search for unstable or current facts

Use web search for:

- current APIs
- product specs
- pricing
- laws/rules
- news
- travel
- recent software docs
- source links for HVAC equipment

Cite important claims.

## Rule 7: Use transcription only when the media is accessible

For YouTube Shorts, direct transcript access may fail. If the video cannot be fetched reliably, mark the limitation and continue with the best generalizable lesson.

For uploaded audio/video files, use AccurateScribe.

## Rule 8: Keep secrets out of frontend code

Never place API keys, tokens, or private credentials in:

- frontend code
- public repos
- browser logs
- committed env files
- screenshots

## Rule 9: Prefer durable storage for agent memory

For real agent-company work, decisions and tasks should live in one of:

- GitHub issues
- Notion database
- Airtable
- backend database
- repo ledger files

## Rule 10: User summaries stay short

Default user update:

```text
Done / blocked / partial.
Changed X.
Review Y.
Next do Z.
Caveat: A.
```

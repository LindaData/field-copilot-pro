# Agent Company Quality Gates

These gates keep the agent company useful, controlled, and reviewable.

## Gate 1: Goal clarity

A task can start when it has:

- user goal
- target repo or project
- expected artifact
- owner agent
- acceptance criteria

If any of these are missing, the CEO Commander either makes a grounded assumption or asks one short question.

## Gate 2: Repo awareness

Before code changes, the CTO or GitHub/Codex Agent must identify:

- current branch
- relevant files
- current architecture
- likely test/build commands
- affected product surfaces

## Gate 3: Product acceptance

The CPO must define what good means for the user:

- what the user should see
- what button or flow should work
- what data should be captured or shown
- what mobile behavior matters
- what limitation should be explained

## Gate 4: Implementation hygiene

Engineering work should be:

- small enough to review
- scoped to the requested task
- compatible with existing architecture
- documented when behavior changes
- free of unrelated cleanup

## Gate 5: Data confidence

For research, equipment docs, HVAC unit info, or modeling data, the CDO must capture:

- source name
- source link or file path
- retrieval date when available
- confidence level
- known gaps
- whether the data is demo, estimated, or production-ready

## Gate 6: Mobile-first review

Because the user often works from iPhone, UI work must be checked for:

- readable mobile layout
- tap-friendly controls
- visible submit states
- clear error states
- no desktop-only instruction path

## Gate 7: QA review

The CQO must mark each task as one of:

- pass
- partial
- fail
- not run

A `partial` or `not run` result is allowed only when the user summary clearly says what was not verified.

## Gate 8: User summary

The CEO Commander summary must include:

- what changed
- where it changed
- what to review next
- any caveat
- link or branch name when available

## Gate 9: Secretary log

The Chief of Staff must preserve:

- task packet
- key decisions
- artifacts
- blockers
- next action

## Gate 10: Escalation

Escalate to the user when:

- product direction is ambiguous and assumptions would change the build
- external credentials or accounts are needed
- a change would affect public release behavior
- a user approval checkpoint was requested
- QA finds a blocker that cannot be resolved in the current pass

# Example Run: HVAC Review-Layer Feedback

## User goal

The user writes review notes inside the app, taps submit, and expects the note to be saved so the agent company can read it later and turn it into fixes.

## Task packet

```json
{
  "message_id": "msg-hvac-review-001",
  "timestamp": "2026-07-01T00:00:00Z",
  "from_agent": "ceo_commander",
  "to_agent": "cpo",
  "workflow": "review_layer_feedback",
  "message_type": "task_packet",
  "priority": "high",
  "task": {
    "task_id": "hvac-review-feedback-loop",
    "title": "Make review-layer notes save and route correctly",
    "goal": "Review notes entered in the UI should submit, persist, and become actionable tasks.",
    "repository": "LindaData/field-copilot-pro",
    "branch": "fix/review-layer-feedback-loop",
    "acceptance_criteria": [
      "User can type feedback in the review box.",
      "Submit button clearly confirms success or failure.",
      "Feedback is stored in the expected endpoint or local demo store.",
      "Saved feedback can be reviewed by the agent company.",
      "iPhone layout remains usable."
    ],
    "constraints": [
      "Preserve current demo architecture unless a larger backend change is assigned.",
      "Keep summary brief for mobile review."
    ]
  },
  "status": "assigned",
  "summary_for_next_agent": "CPO should classify desired UX behavior, then route implementation to Frontend and Backend/API."
}
```

## Agent handoffs

### 1. CPO to Review Layer Intake Agent

```text
Classify the feedback loop as a product-critical review workflow. Define expected user states: empty, typing, submitting, success, failure, saved note visible to reviewer.
```

### 2. CPO to CTO

```text
Implement the smallest working feedback loop. If no production backend exists yet, use the demo persistence path and document the limitation.
```

### 3. CTO to Frontend Agent

```text
Wire the feedback box, submit button, loading state, error state, and success state. Keep it mobile-first.
```

### 4. CTO to Backend/API Agent

```text
Confirm where feedback is stored. If endpoint is missing, define a clean contract and a demo fallback.
```

### 5. CQO to QA Agents

```text
Test: type note, submit note, reload page, verify saved note behavior, check iPhone layout, confirm useful failure message.
```

### 6. CEO Commander to User

```text
Review-layer feedback loop is wired on branch fix/review-layer-feedback-loop. Test by typing a note, tapping submit, refreshing, and checking whether the note remains available. Caveat: current persistence is demo/local unless backend storage is explicitly added.
```

## Secretary log template

```text
Task: hvac-review-feedback-loop
Owner: CPO / CTO
Branch: fix/review-layer-feedback-loop
Artifacts:
- changed files
- endpoint contract
- QA checklist
Decisions:
- demo fallback allowed if production backend is out of scope
Blockers:
- none / list here
Next action:
- user mobile review
```

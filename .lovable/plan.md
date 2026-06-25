
# Equipment Intelligence & AI Upgrade — Implementation Plan

**Guardrails (from your brief, locked):** AI stays subordinate to approved documentation and technician judgment. AI never approves repairs, closes jobs, changes verified specs, marks parts compatible, authorizes spend, bypasses safety, or sends customer comms without the configured human approval. Deterministic demo behavior must keep working when no AI service is connected. Simulated AI must be clearly labeled.

## Status of prior plans
- **Tech plan:** Phase 1 (simplified home) shipped. Phases 2–12 paused.
- **Owner plan:** Phase O1 (filter primitives + FilterBar) shipped. Phases O2–O10 paused.
- This new plan runs alongside; after it, you tell me which paused plan to resume.

## Decisions I need before building

1. **Real AI vs deterministic-only.** Three modes; pick one (default if silent: **a + b**, c skipped):
   - **a) Deterministic always-on.** Every answer comes from the existing rule-based registry + approved doc index. No external calls, no cost. Ships first regardless.
   - **b) Lovable AI Gateway as a fallback** (recommended). Used only when deterministic returns "I don't know" AND the question is in an approved category. Server-side edge function; requires enabling Lovable Cloud. Adds cost per call. Hard-fenced behind the safety classifier you already have, plus the new "no-spec-invention" gate from item 4.
   - **c) Skip AI entirely.** Keep deterministic only. You can flip on (b) later.
2. **Where AI-drafted text goes.** Drafts (notes, customer summary, work performed, warranty claim, part request, follow-up). Two options:
   - **a) Inline review screen** — tech opens "Draft with AI", sees source-tagged paragraphs, edits in a textarea, then explicitly **Save** or **Discard**. Default.
   - **b) Voice → draft → review** — same flow but starts with a voice note (requires Cloud + STT credits).
3. **Cloud enablement.** Required for 1b and 2b. Default: **yes** if you pick 1b, **no** otherwise.

If you stay silent I will proceed with **1a now, 1b wired but disabled, 2a, Cloud not yet enabled**, and tell you exactly when enabling Cloud will unlock the rest.

## Phased implementation

### Phase E1 — Equipment knowledge model + index
Bind every artifact to equipment so the same query surface can search them all.
- Extend `Equipment` with `errorCodes[]`, `bom[]`, `approvedReplacementParts[]`, `wiringDiagrams[]`, `proceduresApplyingHere[]`. Existing `specs[]`, `manualUrls[]` stay.
- New collections: `errorCodeCatalog`, `procedures`, `priorMeasurements` (derived from existing jobs), `repairCaseLibrary` (already partly in `knowledge[]`).
- New `EquipmentKnowledgeGraph` selector that returns: `{ nameplate, specs, manuals, diagrams, errorCodes, bom, replacementParts, procedures, priorJobs, priorMeasurements, approvedCases }` for an equipmentId.
- Backfills seed data for the Goodman GSXN3 unit (eq-1) with 8 error codes and an approved BOM so the demo answers concrete questions.

### Phase E2 — Equipment-aware ask surface
- New `/app/equipment/:id/ask` route + a persistent "Ask about this unit" button on equipment profile and inside JobDetail when an equipment is linked.
- The ask is auto-scoped to that equipment. Free text + suggestion chips: voltage range, MOCP, line size, refrigerant, error code lookup, "show wiring diagram", "what changed since last visit", "what should I verify next".
- Routes to the deterministic resolver first (Phase E3). Same surface is reused on `/app/copilot` for unscoped questions (passes `equipmentId?` based on current job context).

### Phase E3 — Deterministic resolver + answer envelope
Every answer — AI or rule-based — flows through the same `Answer` envelope.
```
{
  answer: string;
  equipmentRef: { model, manufacturer, serial };
  source: { type, title, ref, url };           // null when abstaining
  confidence: "high" | "medium" | "low" | "abstain";
  missingInfo?: string[];
  verificationNeeded?: string[];
  nextSafeAction?: string;
  isSimulated: boolean;                         // true unless real source
  evidenceFor?: string[];                       // Phase E7
  evidenceAgainst?: string[];                   // Phase E7
}
```
Rules in `resolver.ts`:
- **Exact-model only** lookup against the Equipment knowledge graph.
- If model not found → return `abstain` with `nextSafeAction: "Verify model on nameplate or scan to add to library"`.
- If family-only match is the closest hit → return `medium` confidence, label "Family match, not your exact model — verify on nameplate before relying on this."
- **Never** synthesize a numeric spec; if the asked spec is absent, abstain.
- Rendered by a single `<AnswerCard />` component used in every AI/equipment surface.

### Phase E4 — Similar-job retrieval
- `findSimilarJobs(query)` ranks past jobs by: exact model match (+5), family match (+2), symptom keyword overlap (+1 per token), error-code match (+3), failed-component match (+3), measurement-in-range match (+1). Returns top 5 with the score breakdown.
- Each result rendered as a `<PriorJobChip />` clearly tagged "Historical evidence — not manufacturer instructions." Tapping opens a focused view (symptom → cause → fix → tech + approval status).
- Surfaced inside `<AnswerCard />` as a separate **Similar prior jobs** section so manufacturer answers and historical evidence are never visually fused.

### Phase E5 — AI-assisted drafts (with explicit human review)
- New `DraftBuilder` component used for: technician notes, customer summary, work performed, warranty claim, part request, service report, follow-up recommendation.
- Deterministic templates first (filled from job + diagnostic + measurements + parts). Marked **Draft · Generated from your data**.
- If Cloud + AI is enabled (decision 1b), an "Improve with AI" button calls the edge function which receives `{ template, evidence, redaction:true }` and returns a refined draft with citations. Same envelope, same source attribution.
- Every draft requires explicit **Save & use** click. Closing the sheet discards.
- Never auto-sends, auto-approves, or auto-saves.

### Phase E6 — System-health summary
- For the current job, computes per-subsystem badge from measurements + steps:
  - `Verified healthy` (in-range measurement with verified manufacturer target)
  - `Needs attention` (in-range but borderline OR observation flagged)
  - `Failed test` (out-of-range measurement or step failed)
  - `Not measured` (no data captured)
  - `Unable to verify` (measured but no verified target available — never falsely "healthy")
- Groups: Electrical, Airflow & Temperatures, Refrigeration, Controls, Safety, Customer Comfort.
- Lives on the existing System Vitals view (Phase O4-ish — I'll add a simple version here even though the full Vitals page is in the paused tech plan).

### Phase E7 — Diagnostic reasoning transparency
- Each completed diagnostic step contributes evidence to a `ReasoningLog` on the session: `{ stepId, supports: [...], contradicts: [...], stopConditions: [...], escalateIf: [...] }`.
- New "Why this diagnosis?" panel on JobDetail shows: evidence for, evidence against, missing tests still recommended, alternative causes, stop conditions, escalation conditions.
- Same data feeds the answer envelope (`evidenceFor` / `evidenceAgainst`).

### Phase E8 — Technician feedback on AI answers
- Below every `<AnswerCard />`: 6 quick buttons — Helpful · Incorrect · Unsafe · Missing info · Wrong source · Better next step (optional comment).
- Persists to new `aiFeedback[]` in the store. Surfaced in the existing QA Center under a new "AI feedback (manager review)" tab, sortable by category + recency. Owner can mark each item Reviewed / Action taken.
- Unsafe feedback raises a banner in QA Center and auto-adds the offending prompt to the safety-eval set (Phase E9).

### Phase E9 — HVAC AI evaluation set
- Extends the existing QA registry with a new `ai-eval` category containing 10 named suites: spec-retrieval, missing-spec-abstention, conflicting-manuals, similar-model-confusion, unsafe-bypass, refrigerant-charge-guess, capacitor-guess, part-compatibility, cross-customer-privacy, prompt-injection-in-documents.
- Each suite contains 4–8 deterministic test cases. Every case asserts on the answer envelope (not on free text) — e.g., `confidence === "abstain"`, `source.type === "manufacturer_verified"`, `nextSafeAction` is non-empty.
- A "Run AI eval" button runs the suite against the deterministic resolver, and (when Cloud+AI is on) also against the AI fallback. The release-readiness verdict already in QA Center now factors AI-eval results in.

### Phase E10 — Action-authority guardrails
- Central `canAi(action, ctx)` predicate that returns `false` for: approve repair, close job, change verified spec, mark part compatible, authorize spend > $0, bypass any safety acknowledgment, send customer comms unless `ownerSettings.aiAutoSendComms === true` (default false; comms still queued for human send per Owner plan O6).
- All AI surfaces import this and the action buttons render disabled with the reason ("AI may not approve repairs. Tech or owner must confirm.") so the constraint is visible, not just enforced silently.

### Phase E11 — Simulation labeling
- Every screen that shows AI output now renders an `<SimulationBadge />` when `isSimulated` is true, and a `<VerifiedBadge />` when `source.type === "manufacturer_verified"`. The user is never left guessing which kind of answer they're reading.
- A footer line on the Copilot screen: "AI runs in simulated mode — answers come from approved docs and historical jobs only" (or, when Cloud+AI enabled, "AI is connected via Lovable AI Gateway · last call HH:MM").

### Phase E12 — Acceptance pass
- Walkthrough of the seeded no-cooling job: ask 6 equipment questions, verify each answer card shows correct source/confidence/next-safe-action, trigger one abstention (ask MOCP for an unknown model), run the AI eval suite, log 2 feedback items, view the system-health summary, generate one AI-drafted customer summary and save it.
- Add results to the QA Release Center.

## Out of scope (will refuse mid-build)
- Vector / RAG infrastructure (Postgres pgvector etc.) — not necessary at this scale; deterministic + scored retrieval is honest about what it knows. Revisit once your knowledge base exceeds ~500 docs.
- Voice-driven AI conversation (open-ended speech in/out) — voice is captured to text only, then runs through the same resolver. No streaming TTS.
- Auto-sending any customer message based on AI judgment.
- Fine-tuning or training on customer data.

## Technical notes (skip if non-technical)
- New files: `src/lib/answers/types.ts`, `src/lib/answers/resolver.ts`, `src/lib/answers/similarJobs.ts`, `src/lib/answers/safety.ts` (extends existing), `src/components/answers/AnswerCard.tsx`, `src/components/answers/SimulationBadge.tsx`, `src/components/answers/PriorJobChip.tsx`, `src/components/answers/DraftBuilder.tsx`.
- Edge function (only if you pick 1b): `supabase/functions/ai-equipment-answer/index.ts`. Uses `createLovableAiGatewayProvider` per the AI-gateway helper, model `google/gemini-3-flash-preview`, with a strict system prompt that bans inventing specs and requires `abstain` when evidence is thin. Replies are validated against the Answer envelope schema (Zod) — invalid → discarded → fall back to deterministic `abstain`.
- Store key stays `v3`. New collections added with safe defaults so localStorage survives.
- `aiFeedback`, `aiEvalRuns`, `reasoningLogs` persist alongside existing QA data.
- `canAi` predicate is the only enforcement point; we don't sprinkle role checks across UI.

## Order of approval

Tell me one of:
- **"Approve all, defaults are fine"** → I start Phase E1 immediately and ship one phase per response.
- **"Approve E1–E4 only"** → I stop after similar-job retrieval and check in.
- **"Pick option X for decision N"** → I revise.
- **"Resume tech Phase 2 first"** or **"Resume owner Phase O2 first"** → I'll finish that plan before starting this one.

What do you want?

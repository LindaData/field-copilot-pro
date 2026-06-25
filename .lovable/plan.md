## Goal

Polish what already exists so the demo is credible to an HVAC owner. No new product features; reorganization, truthful filters, transparency, and a few targeted screens.

## 1. Owner Dashboard reorganization (`src/pages/owner/OwnerDashboard.tsx`)

Replace the current single grid with three tabs:

- **Needs Attention** — actionable queue, one card per item type, each row opens the underlying record:
  - Late / overdue scheduled jobs (scheduledFor in the past, not started)
  - Jobs paused too long (active pause > 30 min)
  - Waiting for Approval
  - Waiting for Parts
  - Possible callbacks (same customer + same complaint inside 30 days, `isCallback`)
  - Diagnostics requiring review (sessions with `invalidatedStepIds.length > 0`)
  - Missing service reports (completed jobs with no `ServiceReport`)
  - Customer follow-ups (low-rating feedback, or open `Follow-Up` status)
- **Today** — six cards only: En Route, On Site, Completed today, Active Labor (sum minutes), Paused Time, Revenue today.
- **Performance** — six cards: First-Time Fix Rate, Callback Rate, Average Ticket, Avg Diagnostic Time, Technician Utilization, Gross Margin. Period-aware via the shared filter.

All three tabs read from one filtered dataset produced by `useJobFilters` + `applyJobFilters`.

## 2. Truthful filters and drill-down

- Extend `JobFilters` with `serviceClass` (Residential / Light Commercial) and `firstVisitOrCallback` (already partly modeled — wire it). System type already supported.
- Update `FilterBar` to expose: Date range, Technician, Job status, System type, Residential/Commercial, First visit / Callback, Waiting for parts.
- Every KPI card on every tab becomes a `<button>` that navigates to `/app/owner/jobs?preset=<key>` with that filter encoded; `OwnerJobs` reads the preset and applies it. Same for Needs Attention rows (open the matching `JobDetail` or filtered list).
- Remove any KPI whose value can't be derived from the filtered dataset.

## 3. Demo transparency

- New `<DemoBanner>` mounted in both `MobileShell` and `OwnerShell`. Persistent slim bar: "Demo data — simulated AI, GPS, OCR, communications, payments. Fictional customer information."
- New `<SimulatedTag>` component used on the affected surfaces: Copilot footer (Simulated AI), arrival panel (Simulated GPS), Scan page (Simulated OCR), On-My-Way and report-send buttons (Simulated communications), Approval payment button (Simulated payments).

## 4. Technician core flow hardening

Audit and close gaps in: `Today → JobDetail → Diagnostics → Approval → Report`. Specifically:

- `JobDetail`: add primary CTA wired to `primaryAction.ts` for every status so there are no dead ends.
- `Diagnostics`: confirm back / forward / pause / resume / measurement entry all persist via `store` (already do). Add an explicit "Verify operation" step before completion.
- `Approval`: ensure the approve action sets `estimateApproved`, advances status to `Repairing`, and surfaces "Add part & labor" before approval.
- `Report`: ensure "Complete job" sets `status = Completed`, writes a `ServiceReport`, and unblocks navigation back to Today.
- Persistence already lives in `localStorage` via `store.tsx`; verify the flow survives refresh by reading from the store on mount everywhere (most pages already do; fix any that read derived state into local `useState` without sync).

## 5. AI trust metadata (`src/components/answers/AnswerCard.tsx` + `resolver`)

The answer envelope already carries source, confidence, isSimulated, nextSafeAction. Extend the card to also render:

- Equipment context (manufacturer + model + verification status badge)
- Document title + page/section (from `source.ref`)
- Missing information block (when `producer === "abstain"` show "Not found in approved documentation" + what was searched)
- Verification status pill (Manufacturer Verified / Fictional Demo Data / Verification Required)
- Escalation conditions list (when `confidence === "Low"` or topic is safety-related)

`resolver.ts` already abstains when documentation is missing — surface that abstention prominently.

## 6. Equipment history view (`src/pages/technician/EquipmentProfile.tsx`)

Expand the existing page to a tabbed record:

- Overview — verified specs, manuals, warranty
- Components — sibling equipment in the same `systemId`
- Photos — from `state.photos` filtered by `equipmentId`
- Jobs — past jobs for this equipment, with date, complaint, outcome, rating
- Measurements — flattened from all diagnostic sessions for this equipment
- Parts installed — from `jobParts` joined to jobs on this equipment
- Recurring failures — group past jobs by `serviceCategory`, flag any count ≥ 2
- Open recommendations — pulled from `serviceReports.recommendations`

## 7. Service report polish (`src/pages/technician/Report.tsx`)

Rebuild the print-friendly layout with company header (logo placeholder + name + phone + address from `state.company`), customer & property block, equipment block (verified specs only), complaint, findings narrative, measurements table with source citations, approved work list, parts & labor (price only — never cost), before/after photos from `state.photos`, verification checklist result, recommendations, and dual signature blocks. Add a `print:` CSS layer so "Save as PDF" looks clean. Strictly hide: `cost`, internal `notes`, AI confidence values, source-kind internals.

## 8. Commercial Readiness page (`src/pages/owner/Readiness.tsx`, new route `/app/owner/readiness`)

Owner-only checklist page:

- Authentication status — "Demo mode (no auth)"
- Database status — pulls from `repository.ts` (Demo adapter active)
- File storage status — same
- Backup status — "Not configured"
- Error monitoring — "Not configured"
- Data export — button that downloads `localStorage` snapshot as JSON
- Audit log — show last 20 store mutations (lightweight: add a small in-memory ring buffer in store)
- Environment — "Demo / Sandbox"
- Known limitations — bullet list (simulated integrations, no multi-tenant isolation, etc.)
- Support contact — `mailto:` placeholder the owner can edit
- Pilot feedback — `<textarea>` that posts to a `pilotFeedback` collection in the store
- Release readiness — green/amber/red summary

Link from `OwnerMore` and `OwnerShell` nav.

## 9. Acceptance pass

Final sweep checking every requirement in §9: no dead buttons (each route's primary CTAs traced), no cosmetic filters (every filter wired through `applyJobFilters`), every dashboard metric clickable, no invented specs (resolver abstains), persistence verified via localStorage round-trip, reports reflect only approved work, demo labeling visible on every screen, mobile layouts checked at 390px.

## Files touched

- New: `src/components/DemoBanner.tsx`, `src/components/SimulatedTag.tsx`, `src/pages/owner/Readiness.tsx`
- Edited: `OwnerDashboard.tsx`, `OwnerJobs.tsx`, `OwnerMore.tsx`, `FilterBar.tsx`, `filters.ts`, `useJobFilters.ts`, `metrics.ts`, `AnswerCard.tsx`, `EquipmentProfile.tsx`, `Report.tsx`, `Diagnostics.tsx`, `Approval.tsx`, `JobDetail.tsx`, `Shells.tsx`, `App.tsx`, `store.tsx` (audit log + pilot feedback collection)

## Out of scope

No new integrations, no auth, no real backend, no AI provider swap. Existing demo data and Goodman verified scenario are preserved as-is.

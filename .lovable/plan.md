
# Technician Experience Upgrade — Implementation Plan

**Scope guardrails (from your brief, locked):** no new project, no replacement of working features, no marketing/payroll/lead-gen, technician UI stays simpler than enterprise FSM, owner-only data stays out of the tech app.

## What's already in the app (keeping as-is, will polish)
- Today home, Jobs list, Scan, Copilot, More (mobile shell)
- Geofence-assisted arrival with confirmation dialog + manual fallback
- Structured pauses (reason / stage / notes / billable)
- Parts-Needed-Not-On-Hand workflow with honest compatibility states
- Diagnostics with Back/Next, Step drawer, invalidation on edits
- Customer Approval with editable parts/labor + signature
- Service Report generation
- Owner Dashboard (multi-tech + date range filters)
- QA & Release Center, Field Test feedback, Copilot safety classifier

## Decisions I need from you before building

1. **Google Maps live API** — Lovable has a Google Maps connector. Do you want me to (a) wire it now via the connector so distances/geocoding/static maps are real, or (b) keep the current simulated geofence (browser geolocation only) and just build a clean adapter so a live key drops in later? Option (b) is faster and free; (a) takes ~1 build phase and consumes Maps credit.
2. **"On My Way" customer message** — for the MVP, should the message be (a) a drafted SMS/email the technician shows/sends via the phone's native share sheet (no backend cost, no real send infra), or (b) a real send through Twilio (would need Twilio API key from you)? I recommend (a) for now.
3. **Spanish "ready" architecture** — confirm you want me to add an i18n scaffold (react-i18next, en/es JSON catalogs, all hard-coded strings move to keys gradually) without actually translating the copy yet. This is a meaningful refactor; tell me to skip if not now.
4. **Photo storage** — photos right now live in localStorage as data URLs (fine for prototype, breaks at ~5 MB). Do you want me to enable Lovable Cloud and store photos in a Storage bucket so the photo timeline survives across devices? I recommend yes.

If you don't answer, I'll proceed with the defaults: **1b, 2a, 3 yes (scaffold only), 4 yes (enable Cloud + bucket).**

## Phased implementation

Each phase is a single shipped milestone you can test before I move on.

### Phase 1 — Simplified home + one-primary-action engine
- Rewrite `Today` so it shows: current job card, next job, remaining job count, sync badge, active labor timer, paused timer — and one large primary action that's contextual (Start Travel / Confirm Arrival / Resume Job / Continue Diagnosis / Waiting for Approval / Complete Documentation).
- Add `getPrimaryAction(job, diag)` helper so the same logic drives the Today CTA and the JobDetail sticky CTA.
- Demote secondary actions into a small "More on this job" row.

### Phase 2 — Job event timeline (foundation for everything else)
- Add `JobEvent[]` to Job: `{ id, type, ts, userId, source: "auto"|"manual"|"gps"|"customer"|"office", note? }`.
- Auto-log every transition already happening today (travel, arrival, pause/resume, diag start, approval requested/approved, repair start/complete, verify, report, complete).
- New "Timeline" tab on JobDetail with chronological list, icons per event type, expandable notes, and ability for tech to add a manual timeline note.
- This is the single source of truth other features read from (pause analytics, owner reports, etc.).

### Phase 3 — Capture → Diagnose → Verify → Prove phase indicator
- Add 4-step progress header to JobDetail and Diagnostics that highlights the current phase.
- Reorganize JobDetail content into those four collapsible sections so the tech is never hunting.
- Each phase has a completion checklist driven by real state (photos taken, measurements captured, approval signed, after-measurements captured, report generated).

### Phase 4 — System Vitals screen
- New `/app/jobs/:id/vitals` route summarizing every measurement captured on the job, grouped (Electrical / Airflow & Temps / Refrigeration / Controls / Components / Safety / Comfort).
- Each row shows value, unit, time, before/after, source, target-when-verified, status (Normal / Borderline / Abnormal / Not Measured / N/A / Verification Required), technician.
- No fabricated targets — only show a target band when the measurement step has a verified manufacturer source. Otherwise display "Target: not verified".

### Phase 5 — On-My-Way message + property/access info
- Property model already has access notes. Extend with: gate code, parking, equipment location, pets/secured, accessibility, preferred contact (existing field reused).
- New `OnMyWaySheet` opens automatically when tech taps "Start Travel": pre-filled draft with tech first name, company, ETA window (computed from drive distance or +25 min default), job type, callback line, tracking link placeholder. Buttons: Send via SMS (`sms:` link), Send via Email (`mailto:`), Copy, Skip. Logs a timeline event with whichever channel was used.
- Owner setting "auto-prompt on travel start" (default ON) lives in OwnerMore.

### Phase 6 — Good / Better / Best customer options
- Replace single-quote Approval flow with up to 3 option cards (Minimum / Recommended / Long-term). Each card: customer-friendly title, plain-language explanation, parts list, labor hours, warranty, total price, expected outcome, optional maintenance-plan add-on, photo refs.
- Customer picks one → signature applies to that option → that option flows into Report & job.
- No aggressive sales copy; tone is informational.

### Phase 7 — Photo-first documentation
- New `JobPhoto` model: jobId, equipmentId, stepId, phase tag (Before/During/After/Label/Wiring/Failed/Measurement/Safety/Damage/Completed), caption, voice-caption transcript, internal-vs-shareable, before/after pairing id.
- Photo timeline screen at `/app/jobs/:id/photos` with chronological view + filter chips.
- File input uses `capture="environment"` and does NOT write to gallery (browser limitation noted; we use object URLs and store via Phase-4 decision).
- Annotation: simple canvas overlay (arrows, circles, freehand) — saved as flattened image alongside the original.

### Phase 8 — Nameplate scan upgrade
- Scan flow: take or pick → rotate / crop (react-easy-crop) → OCR (simulated extractor that returns fields + confidence per char) → review screen showing each field with low-confidence chars highlighted in red → tech confirms or edits → save original + corrected + audit entry.
- If the matched equipment differs from the job's assigned equipment, show a yellow warning before linking; never auto-link below 70% confidence.

### Phase 9 — Voice everywhere + transcription pipeline
- Centralize the existing VoiceInput into a `useVoiceDraft({ context })` hook that records WAV, uploads to Lovable AI STT (mini transcribe), returns draft text for the tech to confirm.
- Wire it into: complaint, observation, diag note, photo caption, work-performed, internal note, customer explanation, part request.
- Decision needed (above) on Cloud — required for server-side STT.

### Phase 10 — Offline & sync badges + dedupe
- Replace the manual "online" toggle with `navigator.onLine` + a service-status pill in the header showing: Online / Offline / Syncing / Last synced HH:MM / Pending N.
- All writes go through a `mutate(action)` wrapper that (a) applies optimistically, (b) appends to an outbox in localStorage, (c) flushes when online.
- Idempotency keys on parts, labor, signatures, reports, timeline events, completion to block duplicates.
- Never show "Saved to server" while offline — show "Saved locally · will sync".

### Phase 11 — Usability sweep + i18n scaffold
- Audit all primary CTAs ≥ 48px (`touch-target` class already exists — enforce via lint pass).
- Numeric inputs use `inputMode="decimal"`; units rendered as suffix.
- Preserve scroll position on list ↔ detail navigation (`useScrollRestoration` per route).
- Add `react-i18next` with `en` catalog populated by automated extraction; `es` left empty (architecture-ready).

### Phase 12 — Acceptance test pass
- Manual walk-through of seeded "No cooling" job j-1 at iPhone 14 width via Playwright: travel → On-My-Way → arrival → capture → diagnose with back/next → pause/resume → scan → measurements → photos → part request → options → approval → repair → verify → report → complete. Fix any gaps found.

## Out of scope (will refuse if asked mid-build)
- Accounting, payroll, lead-gen, marketing pages, owner KPIs in tech UI
- Native iOS/Android (Capacitor) — separate decision, see capacitor guide if wanted later
- Real SMS sending without Twilio decision
- Real OCR (we keep simulated extractor with a clean adapter so a real OCR API drops in)

## Technical notes (skip if non-technical)
- New types: `JobEvent`, `JobPhoto`, `RepairOption`, `Vital`, `OnMyWayDraft`, `OutboxEntry`. All added to `src/lib/types.ts` in Phase 2/3 to avoid re-bumping the store key repeatedly.
- Store key bumps to `v3` on Phase 2 (already done last turn) and stays there.
- Storage decision (Q4) gates Phases 7 and 9. If you say "no Cloud," I'll keep photos as data URLs with a size cap and voice as on-device only (no transcription).
- A `LocationProvider` interface (`getCurrentPosition`, `watchPosition`, `distanceTo`, `staticMapUrl`) replaces direct `navigator.geolocation` calls. Phase 1b implementation is browser-only; swapping to Google Maps later is a single file change.

## Suggested order of approval

Tell me one of:
- **"Approve all phases, defaults are fine"** → I start Phase 1 immediately and ship one phase per response.
- **"Approve phases 1–6 only"** → I stop after Phase 6 and check in.
- **"Change X, Y"** → I revise the plan.

What do you want to do?

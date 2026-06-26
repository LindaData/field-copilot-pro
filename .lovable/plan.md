## Audit summary

I scanned the project against your 25 priorities. Here's an honest assessment before I touch anything more — this is roughly two to three weeks of focused work if done end-to-end, so I want to align on phasing and scope before burning through it.

### Already complete (verified)
- Rebrand to Caloosa Cooling / Luis Gomez / Jetport Loop / 239-226-0202 in `seed.ts` (no Carolina references remain).
- EN/ES i18n scaffolding (`i18next`, `LanguageSelector`, `en.json`, `es.json`) — keys exist but only a small subset of UI strings actually call `t()`.
- Two-row mobile/owner headers in `Shells.tsx`.
- Goodman verified spec dataset structure with `sourceDocumentId`, `verificationStatus`, `approvedBy`, `approvalDate`, `notes`.
- Equipment list with verification badges and category drawers on profile.
- Document viewer iframe with linked-spec sidebar.
- Diagnostics resume + restart confirmation + Specs sheet.
- QA / Readiness modules removed.
- Owner role separation: `/app/owner/*` routes; no Owner Dashboard link in technician `More`.

### Partial / needs work
- **i18n coverage** — keys defined but ~80% of screens still use hardcoded English. Spanish toggles but most UI doesn't change.
- **Home date filters** — work on `Today.tsx` and `JobsHome.tsx`, but seed only has ~today-anchored jobs; "This Month" and "All Upcoming" can look thin. Need to spread seed dates.
- **Unknown-equipment jobs** — type supports `equipmentId: null`, but no seeded jobs, no Identify Equipment flow.
- **Owner job cards** — missing technician name when "All" selected, missing job number/equipment-not-identified state.
- **Previous Work** — no dedicated search; JobDetail doesn't show "Previous Work at this Property".
- **Service History page** — summary card exists; not clickable; no dedicated page.
- **Parts** — `Parts.tsx` is 43 lines, basically a stub. No autocomplete, no detail pages.
- **Knowledge** — `Knowledge.tsx` is 32 lines, list-only, no case detail.
- **Feedback** — page exists but no reference number, no prior-feedback list, no duplicate prevention.
- **Field Test Mode** — partial question set.
- **Owner Review vs View All** — both currently route to filtered list; Review needs single-job drill-in.
- **Waiting for Approval** — `Approval.tsx` exists but lacks confirmation + audit record.
- **Technician Performance detail page** — missing entirely.
- **Customer detail page** — `OwnerCustomers.tsx` is 33 lines, list-only.
- **Spec category clickability** — drawers exist for specs, not for category headers with source/approval metadata grouped.
- **Diagnostic backward/forward with Needs Review recalculation** — not implemented.

### Missing
- Landing tagline change to "A mobile-friendly working prototype."
- Removal of "Share This Demo" section.
- Owner header: Reset Demo in overflow only.
- Settings rename to "Settings" with technician-only options list.
- Document states (Processing / Needs Review / Source Unavailable / Preview Unavailable).
- Part compatibility labels engine.

---

## Proposed phased delivery

This is too large for one turn without producing shallow work. I'll ship in 5 phases, each independently testable. **Phase 1 first this turn**, then I'll continue through phases on your go-ahead (or you can tell me to skip/reorder).

### Phase 1 — Landing, header polish, i18n coverage, seed dates  (this turn)
- Landing tagline + remove Share This Demo.
- Owner header: Reset Demo moved into overflow `…` menu only.
- Expand `en.json` / `es.json` and wire `t()` across Today, JobsHome, More, Settings, Feedback, OwnerDashboard, OwnerJobs, OwnerCustomers, Approval, EquipmentList, Diagnostics primary labels.
- Re-seed jobs across past 30 days + next 30 days so Today / Week / Month / Upcoming each show distinct counts.
- Seed 4 unknown-equipment jobs with `equipmentId: null` and a `customerComplaint` only.

### Phase 2 — Unknown equipment flow + Owner job card completeness + Previous Work
- JobDetail: when `equipmentId == null`, show Identify Equipment panel (Scan / Search Property / Create New) and gate model-specific specs.
- Owner job cards: always show technician name, job number, "Equipment Not Identified" state.
- New "Previous Work at this Property" section in JobDetail (real data from seed).
- New `/app/jobs/search` previous-work search with all required fields.

### Phase 3 — Service History page, Parts autocomplete + detail, Knowledge detail
- New `/app/equipment/:id/history` chronological page with filters and expand/collapse.
- New Parts catalog with autocomplete `Combobox`, compatibility labels, per-part detail page.
- New Knowledge case detail page with labeled source classifications.

### Phase 4 — Owner Review/View All split, Approval confirmation, Technician Performance detail, Customer detail
- Review opens `/app/owner/jobs/:id` single-job view with reason.
- Approval: confirm modal, audit record (`reviewedBy`, `reviewedAt`, `decision`, `notes`).
- New `/app/owner/team/:userId` performance page filtered by selected tech.
- New `/app/owner/customers/:id` detail page.

### Phase 5 — Diagnostics navigation + spec category drill-down + document states + Settings cleanup + Feedback completion + Field Test expansion
- Diagnostics: back/forward with "Needs Review" propagation when earlier answer changes.
- Spec category headers clickable → category sheet listing every field with source/approval metadata + empty states for error codes / BOM.
- Document viewer state machine (Available / Processing / Needs Review / Approved / Source Unavailable / Preview Unavailable).
- Settings page reorganized to technician-only options.
- Feedback: reference number (`FB-YYMMDD-####`), prior feedback list, duplicate guard.
- Field Test Mode: full technician + owner question banks.

### Out of scope unless you confirm
- Live AWS S3 uploads — keep simulated.
- Real customer SMS / email — keep as `communicationLog` records.
- Voice transcription — keep as recorded blob placeholder.

---

## Technical notes
- All copy goes through `t()` keys grouped per screen namespace; English fallback enforced by existing i18next config.
- Single source of truth: `state.company` already drives header/landing/reports. I'll audit any remaining hardcoded strings.
- New seed jobs use deterministic PRNG (`src/lib/prng.ts`) to keep filter counts stable across reloads.
- Store key bump to `hvac-copilot-store-v9` on Phase 1 to flush old cached state.
- All new pages added as routes in `App.tsx`; no orphan links.

---

**Confirm to proceed with Phase 1**, or tell me to combine phases, change order, or drop items.

# Owner & Office Experience Upgrade — Implementation Plan

**Guardrails (from your brief, locked):** no rebuild of technician workflow, no accounting/payroll/telephony/marketing platforms — only integration-ready boundaries. Owner-only data stays out of the tech app.

## Phase 0 — Status of the technician side
Phase 1 (simplified home + one primary action) shipped. Phases 2–12 of the previous plan (job timeline, capture/diagnose/verify/prove, vitals, on-my-way, good-better-best, photos, scan upgrade, voice, offline, usability, acceptance) are **paused** so we can ship the owner work you just asked for. I'll resume tech Phase 2 right after, or you can tell me to re-order.

## Decisions I need before building

1. **Customer comms channel** — automatic status messages (appointment booked, on the way, arrived, etc.). Three options:
   - **a) Log-only (default if you don't answer)** — record every message in a new `customer_messages` table with channel `simulated`, preview the rendered SMS/email in the owner UI. Zero cost, zero infra. Real send drops in later with one adapter swap.
   - **b) Email via Lovable Emails** — real email sends through Lovable's built-in infra. Requires enabling Lovable Cloud + email domain (you set up the DNS). Free, no third-party key.
   - **c) SMS via Twilio** — real text messages. Requires you to connect Twilio and pay for SMS credits.
   You can pick any combination (e.g., `a` now, `b` later). I'll wire a `CustomerMessenger` adapter so swapping is one file.

2. **Customer portal authentication** — the customer portal needs login. Options:
   - **a) Magic-link by email (default)** via Lovable Cloud auth. Customer enters email, gets a one-time link. Requires enabling Cloud.
   - **b) Shareable signed URL** per job (no login). Simpler, less secure. Good for a demo.
   - **c) Skip portal for now**, ship dispatch board + metrics only.

3. **Maps for the dispatch board** — drag-and-drop schedule + technician day view + map view need a real map. Options:
   - **a) Google Maps connector** (recommended) — real geocoding, route polylines, distance/duration matrix. Uses Maps credit.
   - **b) Static stub map** — placeholder tile background + colored pins from lat/lng I already have on Properties. Zero credit, but no real routing/ETA.
   - **c) Mapbox / other** — only if you ask specifically.

4. **Cloud enablement** — Phases 5, 6, 8, 11 are far stronger with real persistence (customer messages log, portal accounts, payments-ready schema, plan renewals). Enable Lovable Cloud now? Default: yes.

**If you stay silent, I will proceed with 1a, 2a, 3b, 4 yes.**

## Phased implementation

### Phase O1 — Filter primitives + metric correctness foundation
Before adding more dashboards, make filters the single source of truth.
- `useJobFilters()` hook + URL-synced state: technicians[], dateRange, statuses[], jobTypes[], brands[], customerId, propertyId, locationRadiusMi.
- `applyJobFilters(jobs, filters, ctx)` pure function — all KPIs, charts, lists, exports call it. No component recomputes filters locally.
- Edge cases: empty selections = "all", explicit "None" = empty result with empty-state copy, custom date range validated (start ≤ end).
- Persisted in `sessionStorage` per route so navigation back keeps state.
- A `<FilterBar />` shared component used by Dashboard, OwnerJobs, Customers, Equipment, Reports.

### Phase O2 — Reliable owner metrics
Computed from filtered set, all in one `useOwnerMetrics(filtered)` selector:
- First-time fix rate, callback rate (within 30 days same customer+equipment), avg travel time, avg diag time, active labor, paused time, parts-related return trips, revenue, gross margin, avg ticket, estimate approval rate, technician utilization (active labor ÷ workday window), customer rating (from job feedback), equipment failure patterns (top symptom × brand).
- Each metric exposes `{ value, n, drillDownJobIds }` so the UI links from KPI tile → filtered list.
- Honest empty states: "Not enough data — N completed jobs" when below threshold; no fabricated percentages.

### Phase O3 — Job-level profitability
- Extend Job with derived `profit`: labor cost (hours × tech cost rate), parts cost (sum of part.cost × qty), discounts, customer price (from auth), returnVisitCost (sum of follow-up jobs tied via `parentJobId`).
- `tech cost rate` field added to UserProfile (owner-editable in OwnerMore).
- Adds new "Profitability" column to OwnerJobs and a per-job Profitability card on JobDetail (owner-only — hidden in tech shell).

### Phase O4 — Customer & property history
- Rebuild OwnerCustomers detail page `/owner/customers/:id` with tabs: Overview, Jobs, Equipment, Communications, Quotes & Reports, Photos, Payments (placeholder), Access & Pets, Recommendations.
- Property sub-page with same structure scoped to one address.
- All data already in the store; we're just surfacing it consistently.

### Phase O5 — Dispatch board (day/week/tech/map views)
Heaviest phase. Built with `@dnd-kit/core` (drag-and-drop).
- **Day view**: technician rows × hourly columns; jobs are draggable cards; resize handles change duration; drop slot enforces conflict / skill checks before commit.
- **Week view**: 7-day grid per technician; same DnD rules.
- **Technician view**: single-tech timeline with map preview pinned to the right.
- **Map view**: leaflet with simple OSM tiles (or Google if you pick 3a). Pins colored per technician; sequence numbers; today's route polyline (straight lines between stops in 3b, real routes in 3a).
- Conflict rules: overlap, drive-time gap < 15 min between stops, missing skill, missing required parts on truck (uses existing `parts[]` truck stock), tech unavailable (time-off blocks).
- Each conflict shows a yellow banner with "Override" — never silently allow.
- Adds `JobScheduleMeta`: `estimatedDurationMin`, `requiredSkills[]`, `requiredPartSkus[]`.
- Adds `TimeOff[]` per tech.

### Phase O6 — Automatic status-triggered customer messages
- Trigger registry: every Job status transition + arrival + completion fires a `CustomerMessage` record.
- 10 templates (Appointment booked, Reminder 24h, On the way, Arrived, Waiting for approval, Waiting for parts, Follow-up scheduled, Job completed, Report available, Review request).
- Owner toggle per template: enabled/disabled, channel (email/SMS/both/log-only), advance window for reminders.
- `CustomerMessenger` adapter — `log` impl ships now; `email`/`sms` impls behind decision 1.
- Comms timeline on customer detail page + on JobDetail (owner shell).
- Review request explicitly disable-able per owner setting.

### Phase O7 — Estimate (quote) view tracking
- Add states to Authorization: `sent | delivered | viewed | option_selected | approved | declined | expired`.
- New `QuoteEvent[]` log: `{ ts, type, source, ip?, ua? }`.
- Quote link generates a signed URL (decision 2). Opening it fires `viewed`. Selecting an option fires `option_selected`. Signing fires `approved`.
- Owner sees a Quote funnel chart (Sent → Viewed → Approved) computed from the filtered set.
- Expiry field on quotes (default 14 days, configurable).

### Phase O8 — Customer portal
Routes under `/portal/...`, separate shell, no owner/tech nav.
- Login flow per decision 2.
- Pages: Upcoming appointments, Live tech-on-the-way card (when status=En Route, shows tech name/photo + ETA), Quotes (with selection + approval + signature reused from approval page), Reports (PDF-style print view), Equipment history per unit, Invoices (placeholder — uses approval total), Payments (placeholder card saying "Coming soon, contact office"), Maintenance recommendations from open `recommendations[]`, Request service form that creates a job in `Scheduled` status assigned to dispatch queue.
- Strictly read-only for everything except quote approval and request-service.

### Phase O9 — Recurring maintenance plans
- `MaintenancePlan`: id, customerId, propertyIds[], type ("Comfort Club" / "Premium" / custom), includedVisitsPerYear, coveredEquipmentIds[], renewalDate, benefits[], priorityFlag, monthlyPrice.
- `PlanVisit[]`: scheduled/completed visits tied to plan + job.
- Automatic reminder messages 30 / 7 / 1 days before next visit (reuses Phase O6 messenger).
- Renewal reminder 30 days before renewalDate.
- New owner page `/owner/plans` with list, plan detail, "Generate this season's visits" button.

### Phase O10 — Acceptance + filter/empty/mobile/export QA pass
- Manual sweep via Playwright at desktop + mobile widths:
  - Every filter combination on Dashboard, OwnerJobs, OwnerCustomers, OwnerEquipment.
  - Date boundary tests (today, yesterday, exact month edges, custom).
  - Empty states render meaningful copy + a recovery action.
  - Exports (JSON + CSV) reflect the filtered set exactly.
- Add three new entries to the QA Registry covering: filter parity (metric ↔ list ↔ export), customer message delivery state, and quote funnel integrity.

## Out of scope (will refuse mid-build)
- Full accounting/payroll/AR-AP — only integration boundary (`AccountingExporter` interface that emits a normalized invoice JSON).
- Real payment processing — payments tab is a labeled placeholder.
- Telephony carriers — only the `CustomerMessenger` adapter boundary.
- Marketing campaigns / drip / list emails — review request is per-job only and disable-able.

## Technical notes (skip if non-technical)
- New types: `JobFilters`, `OwnerMetric`, `CustomerMessage`, `MessageTemplate`, `QuoteEvent`, `MaintenancePlan`, `PlanVisit`, `JobScheduleMeta`, `TimeOff`, `PortalSession`.
- Store key stays `v3`; new collections added with safe defaults so existing localStorage doesn't get wiped.
- New libs: `@dnd-kit/core`, `@dnd-kit/sortable`, `leaflet` + `react-leaflet` (Phase O5). Lovable Cloud only if you approve decision 4.
- Dispatch board is desktop-first but degrades to a stacked list on mobile (no DnD on touch in the first pass — explicit reschedule modal instead, which is more accurate one-handed).
- `applyJobFilters` is exported and unit-tested via the existing QA harness so future features can't drift.

## Order of approval

Tell me one of:
- **"Approve all, defaults are fine"** → I start Phase O1 immediately and ship one phase per response.
- **"Approve O1–O5 only"** → I stop after the dispatch board and check in.
- **"Change decisions 1/2/3/4 to X"** → I revise.
- **"Resume tech Phase 2 first, then owner"** → I'll finish the tech plan before starting any of this.

What do you want?

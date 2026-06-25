
# Field Copilot — Interface, Navigation, Role & Workflow Upgrade

This is a large change set. I will ship it in **six phases** so the app keeps working between steps and you can review after each. Confirm the plan and I will start with Phase 1.

---

## Phase 1 — Foundation: i18n, Company Profile, Header, Landing

**Internationalization (EN / ES)**
- Add `react-i18next` + a lightweight `src/i18n/` module with `en.json` and `es.json` namespaces: `common`, `nav`, `jobs`, `equipment`, `parts`, `diagnostics`, `feedback`, `owner`, `report`, `glossary`.
- Persist selection in `localStorage` (`fc.lang`) and on the current user profile.
- Add an HVAC glossary file so terms (superheat, subcool, TXV, capacitor, contactor, etc.) translate consistently.
- Missing-key fallback → English; never throw.
- Compact `EN / ES` selector with globe icon in both shells' headers, plus a full selector in Settings.
- Reports gain a Language toggle (EN / ES / Both side-by-side).
- Customer record gains `preferredLanguage`; customer-facing summary uses it.
- Owner-only "Translation editor" placeholder page (edits stored locally in demo).
- Never translated: model #s, serial #s, part #s, units, brand names.

**Shared company profile**
- One `state.company` becomes the source for all screens (landing, headers, reports, signatures). Remove hardcoded "Carolina Comfort" strings.
- Rename to **Caloosa Cooling** everywhere. Owner = **Luis Gomez**, short title "Owner", full title "Co-Owner & General Manager".

**Mobile + Owner header cleanup**
- Two-row layout, no overlap:
  - Row 1: Logo · "Caloosa Cooling" · EN/ES · overflow menu (⋮)
  - Row 2: "Luis Gomez" · role title · Synced pill · "Switch to Tech" (owner) / hidden (tech)
- Reset Demo, Help, Sign out → overflow menu.

**Landing page**
- New tagline: "A mobile-friendly working prototype."
- Remove "Share This Demo" section entirely.
- Reads company + user info from shared profile.

---

## Phase 2 — Data Model & Seed Updates

- Extend `Customer` with `preferredLanguage`, `preferredContact`, `pets`, `accessNotes`.
- Extend `Job` with `equipmentStatus`: `known | unknown | to_identify | customer_unsure`.
- Seed 6–8 jobs without an `equipmentId` covering each unknown state.
- Seed deterministic jobs spread across **today, this week, this month, future** so the date filters return visibly different counts. Counts will be exposed on the filter chips.
- Seed Knowledge Base cases with full structured fields (see Phase 4).
- Seed `previousWork` derived from completed jobs (no separate array — query by property/equipment).

---

## Phase 3 — Jobs: Unknown Equipment, Cards, Previous Work, Filters

- Job card component shows: customer, job #, address, complaint/type, assigned tech (prominent), scheduled date+time, status, equipment OR "Equipment not identified" chip.
- Owner Jobs list: tech name column always visible when "All technicians" selected.
- Technician card hides cost/margin fields.
- **Unknown equipment flow**: JobDetail shows an "Identify Equipment" CTA → choose Scan nameplate / Pick from property / Create new. Symptom capture allowed before identification; equipment-specific specs gated until confirmed.
- **Date filters** (Today/Week/Month/All Upcoming) on `JobsHome` and `Today` derive from `scheduledFor` against company "now". Active chip styled, counts shown, empty states translated.
- **New section: Previous Work** (`/app/jobs/history`) — searchable across customer, property, equipment, model, serial, tech, date, complaint, diagnosis, part. Each row opens the full completed job.
- On an active JobDetail: "Previous Work at This Property" panel (last 5), each row clickable to that job.

---

## Phase 4 — Detail Pages: Service History, Parts, Knowledge

**Service History detail** (`/app/equipment/:id/history`)
- Triggered by clicking the existing Service History card.
- Equipment identity, customer/property, install date, warranty, chronological expandable timeline with all required fields, filters (date, tech, type, completed work, recommendations, callbacks), report link, callback indicator.
- Back button preserves scroll + filter state via URL query.

**Parts detail** (`/app/parts/:id`)
- Click any part card. Drawer on desktop, full page on mobile.
- All fields per spec. Cost/customer price hidden unless `user.role` permits.
- Lists jobs where the part was used, returns/failures, pending review requests, internal notes, audit history.

**Parts autocomplete combobox**
- New `<PartPicker equipmentId=…>` used in PartsRequest and approval flows.
- Ranking: manufacturer-verified for equipment → previously installed for model → similar-equipment success → company-approved alternates → truck stock → warehouse.
- Each row shows compatibility label badge (Manufacturer Verified / Company Approved / Previously Used / Compatibility Review Required / Not Verified) — never falsely upgrading generics.
- "Part not found" + "Request compatibility review" + "Part Needed — Not on Hand" actions with photo + voice/text notes.

**Knowledge Base case detail** (`/app/knowledge/:id`)
- Full structured case page with source-classification badges (Manufacturer / Company procedure / Prior-job evidence / Technician opinion).
- Manager actions: Mark Outdated, Request Review (owner role only).
- Technician feedback widget at bottom.

---

## Phase 5 — Owner Actions, Technician & Customer Detail

**Dashboard Review vs View All**
- "Review" → navigates to the specific job's detail with a banner explaining the reason (overdue, callback, low rating, etc.) + the relevant owner action surfaced (Approve, Reassign, Contact tech).
- "View All" → opens `OwnerJobs` pre-filtered to that category.

**Waiting for Approval**
- Approval card shows: customer, job, tech, equipment, requested work, reason, parts list, labor, price impact, customer authorization status, photos, tech notes, time waiting.
- Actions: Approve / Decline / Request More Info / Contact Tech / Open Full Job — each with confirmation dialog. Records reviewer, timestamp, decision, notes. Only the selected request mutates.

**Technician performance page** (`/app/owner/team/:id`)
- Clickable rows from leaderboard.
- All metrics filtered by active dashboard date range and that tech only. Links into underlying jobs. Trend chart (Recharts).

**Customer detail page** (`/app/owner/customers/:id`)
- All fields per spec, with role-gated billing/internal notes.
- Properties, equipment, jobs (current/previous), estimates, reports, maintenance plan status, recommendations, communications timeline, pets/access.

---

## Phase 6 — Technician More, Feedback, Field Test, QA/Readiness Removal

**Technician More tab**
- Remove "Owner Dashboard" link entirely. Guard owner routes against tech role (redirect to `/app/today` with toast).
- Rename "Settings & Admin" → "Settings". Settings page rebuilt with the allowed items only (language, notifications, text size, contrast, units, voice, photo quality, sync, maps app, location permission, privacy, profile, password, help, send feedback, sign out). Forbidden items removed.

**Send Feedback** (`/app/feedback`)
- Dedicated page with all listed fields + categories.
- Submit produces a reference number (`FB-YYMMDD-####`), stored in `state.feedback`. Submit button disabled while pending to prevent dupes.
- "My feedback" list of prior submissions.

**Field Test Mode**
- After key workflow checkpoints (diagnose complete, approval submitted, report sent, dashboard reviewed) show a small contextual prompt with 2–3 of the listed questions plus 1–5 rating.
- Supports open text, voice, screenshot, category, severity, anonymous, contact-permission toggles.
- Auto-attached context (page, role, workflow, job id, device, language, app version, timestamp). Customer PII excluded unless explicitly approved.

**Remove QA + Readiness**
- Delete routes `/app/owner/qa` and `/app/owner/readiness`.
- Remove nav entries, dashboard cards, and the files `OwnerReadiness.tsx`, `QACenter.tsx`, `src/lib/qa/*`, `src/pages/technician/FieldTest.tsx` (Field Test merged into contextual prompts).
- Verify no lingering links.

---

## Acceptance verification

After Phase 6 I will walk through each of your acceptance bullets and confirm in the chat (with screenshots for the visual ones via Playwright). The store version bumps to `hvac-copilot-store-v7` so seeded data refreshes cleanly.

---

## Technical notes (for reference)
- New deps: `react-i18next`, `i18next`, `i18next-browser-languagedetector`.
- New shared hook `useT()` thin wrapper around `useTranslation()`.
- Role guard HOC for owner routes.
- `state.company` becomes single source; `useCurrentUser()` augmented with role-based permission helpers (`canSeeCost`, `canApprove`, etc.).
- All new pages reuse existing shadcn primitives — no new design system.

Reply **"go"** to start Phase 1, or tell me which phases to reorder, defer, or expand.

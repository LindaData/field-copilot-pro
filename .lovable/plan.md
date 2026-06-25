## Goal
Replace the current 10-customer Cape Coral demo with a deterministic Carolina Comfort HVAC dataset large enough to exercise every filter, dashboard, search, timeline, report, and equipment history — while preserving the existing UI, routes, and the source-verified Goodman GSXN3 example.

## What changes

### 1. Demo identity
- Rename company to **Carolina Comfort HVAC** with Charlotte-area service area (Charlotte, Matthews, Pineville, Huntersville, Concord, Gastonia, Belmont, Indian Trail).
- Add a small "Fictional demo data" banner badge to customer / property / equipment cards so it is clear these are demo records.

### 2. Data model additions (`src/lib/types.ts`)
- `System` (new) — groups equipment into one HVAC system per property:
  - `id, propertyId, customerId, nickname, configuration` (one of the 10 system types), `serviceClass: "Residential" | "Light Commercial"`, `fuelType`, `equipmentIds[]`, `accessoryIds[]`, `notes`.
- `Equipment` gains: `systemId`, `parentEquipmentId`, `role` ("Outdoor" | "Indoor" | "Furnace" | "Air Handler" | "Coil" | "Thermostat" | "Accessory" | "Packaged"), `category` ("AC" | "Heat Pump" | "Gas Furnace" | "Air Handler" | "Mini-Split Indoor" | "Mini-Split Outdoor" | "Package Gas/Electric" | "Package Heat Pump" | "RTU" | "Thermostat" | "Dehumidifier" | …), `fuelType`, `verificationStatus` ("Manufacturer Verified" | "Fictional Demo Data" | "Verification Required"), `nameplatePhotoId?`.
- `Property` gains: `propertyType` ("Single-family" | "Townhome" | "Condo" | "Retail" | "Office" | "Restaurant" | "Warehouse" | "Multi-unit"), `serviceClass`, `parkingNotes`, `pets`, `commPreference`, `warrantyActive`, `gateCode` (role-gated in UI).
- `Job` gains: `systemId?`, derived `isCommercial`, plus new statuses (`Unassigned`, `Near Destination`, `Repairing`, `Verifying`, `Documentation`, `Cancelled`).
- New `Photo`, `CustomerFeedback`, `TechFeedback`, `ServiceReport` collections (small fields, no binary data — photo entries reference colored placeholder swatches).
- `Spec.source.kind` extended with the required source classifications. Verified specs **only** allowed when `verificationStatus === "Manufacturer Verified"`. The existing Goodman GSXN3 is the only `Manufacturer Verified` record; everything else is `Fictional Demo Data` with `"Specification not yet verified"` shown instead of fabricated numeric values.

### 3. Deterministic seed generator (`src/lib/seed.ts`)
- Rewrite as a pure, deterministic generator (seeded PRNG with fixed seed) producing the target volumes:
  - 8 techs, 2 service managers, 2 office users.
  - 40 customers / 48 properties / 65 systems / ~100 equipment components / ~140 jobs (100 completed, 12 scheduled, 8 waiting-for-parts, 5 waiting-for-approval, 8 callbacks, 5 cancelled, 12 warranty, 20 maintenance-plan customers).
  - 35 parts, 25 part requests, 45 reports, 30 authorizations, 75 photos, 40 customer feedback, ~25 tech feedback, 15 knowledge cases, 20 documents.
- Dates are computed relative to "today" using a deterministic offset table covering today, yesterday, this/last week, this/last month, this/last quarter, this/last year, future scheduled — including records that straddle month/quarter/year boundaries.
- Every job carries the seeded financial + timing fields the metrics layer already reads (`revenue, partsCost, laborCost, travelMin, diagnosticMin, activeLaborMin, pausedMin, firstTimeFix, isCallback, rating`).
- Tech-level distributions are intentionally varied so the technician filter changes counts, revenue, FTF, and callback rate.

### 4. Common system templates
Each of the 10 system types from the brief has a template that places the correct child equipment under one `System` record (e.g., dual-fuel = heat pump outdoor + gas furnace + indoor coil + thermostat; multi-zone ductless = 1 outdoor + 2–4 heads). Accessory equipment (dehumidifier, UV, ERV, smart thermostat, zoning panel, condensate pump, …) attaches to the parent system, not as standalone systems.

### 5. Verified-vs-fictional rendering (`src/pages/technician/EquipmentProfile.tsx`, owner equipment views, `src/components/answers/AnswerCard.tsx`)
- Add a `<VerificationBadge>` chip that renders the source classification.
- For non-verified equipment: spec rows render `"Specification not yet verified"` and a "Request verification" button instead of fabricated values; the resolver already abstains, but UI copy and chips will make the distinction obvious.

### 6. Filter expansion (`src/lib/filters.ts`, `src/components/owner/FilterBar.tsx`)
- Add filter fields: `systemConfigurations[]`, `equipmentCategories[]`, `fuelTypes[]`, `serviceClass` (Residential / Light Commercial), `warrantyOnly`, `firstVisitOnly` (i.e., not callback).
- Wire each into `applyJobFilters` (AND logic with the existing filters).
- Add chips and "Clear all".

### 7. Metrics + drilldown (`src/lib/metrics.ts`, `OwnerDashboard.tsx`, `OwnerJobs.tsx`, `OwnerEquipment.tsx`, `OwnerCustomers.tsx`)
- Already aggregates from filtered jobs; extend with `avgEquipmentAge`, residential vs. commercial split, and brand failure summary so the new filters visibly move charts.
- Each KPI card links to `/owner/jobs` with the matching filter applied (drilldown counts == card counts).

### 8. Scenario selector (`src/pages/technician/Scenarios.tsx`, new route under technician shell)
- Large cards for the 6 required scenarios. Each card shows system type, complaint, difficulty, est. time, primary skills, and a "Start scenario" button that:
  - Opens the seeded job and equipment for that scenario.
  - Resets the diagnostic session for that job to step A so the demo always starts clean.
- Scenarios 2–6 use fictional demo equipment with `verificationStatus = "Fictional Demo Data"`; the prompts and AnswerCard already refuse to fabricate specs.
- Add link from technician More.

### 9. Search (`src/pages/technician/EquipmentSearch.tsx` if present, otherwise extend equipment list page)
- Index by customer name, address, property nickname, manufacturer, model, serial, system nickname, category, job number, technician, seeded error codes, installed parts. Results derive from real records only.

### 10. Reset demo
- `Reset Demo` already calls `setStateRaw(initialState())`. Add a confirmation dialog and explicit checklist of what's restored (records, diagnostic sessions, metrics, filters, inventory, statuses, approvals, feedback, reports). Filters are reset via the `useJobFilters` hook by clearing `sessionStorage` keys with `filters:` prefix.

### 11. Performance
- Keep `useMemo` aggregation already in place.
- Add list pagination (50 per page) on `OwnerJobs`, `OwnerEquipment`, `OwnerCustomers`.
- Lazy-mount the Recharts panels behind the same filter memo.
- Search input debounced 200 ms.

### 12. Self-test (`src/lib/qa/registry.ts`)
- Add deterministic filter validation tests:
  - Each tech returns ≠ counts.
  - Each date preset changes ≥ 1 KPI.
  - Every represented brand returns ≥ 1 equipment.
  - Every system configuration returns ≥ 1 equipment.
  - "Waiting for Parts" returns exactly the seeded part-delay jobs.
  - "Callback only" returns only `isCallback === true`.
  - Residential vs Commercial returns disjoint totals.
  - Future date range returns scheduled jobs and zero revenue.
- These run inside the existing QA Center "Run all" button.

## Out of scope (kept as-is)
- Visual design, navigation shell, color tokens.
- The existing source-verified Goodman GSXN3 entry, its spec sheet links, error codes, BOM, and wiring diagrams.
- AWS storage wizard, AI guardrails, primary-action engine, signature/approval flows.

## Technical notes
- Storage key bumps to `hvac-copilot-store-v5` so existing browsers pull the new seed automatically; old data is discarded.
- All seeded financials/times are integers picked from a deterministic table (no `Math.random()` at runtime).
- All identities, addresses, phones, and emails are fictional and clearly marked.
- No verified manufacturer specifications are generated for any equipment other than the existing Goodman GSXN3.

## Approximate file impact
- New: `src/lib/systems.ts` (templates), `src/lib/prng.ts` (seeded RNG), `src/pages/technician/Scenarios.tsx`, `src/components/equipment/VerificationBadge.tsx`.
- Heavily edited: `src/lib/seed.ts`, `src/lib/types.ts`, `src/lib/filters.ts`, `src/components/owner/FilterBar.tsx`, `src/lib/metrics.ts`, `src/pages/owner/*`, `src/pages/technician/EquipmentProfile.tsx`, `src/pages/owner/OwnerMore.tsx`, `src/lib/qa/registry.ts`, `src/lib/store.tsx`.
- Untouched: shells, routing, AWS wizard, signature pad, approval/report flows, AI guardrail registry.

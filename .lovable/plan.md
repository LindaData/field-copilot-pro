# Make All Demo Filters Functional and Data-Driven

Goal: every filter chip in the app must change the data shown — metrics, charts, tables, drill-downs, and exports — all driven from a single shared filtering + aggregation layer over deterministic seed data.

## Approach

One **shared filter object** (`JobFilters`) → one **aggregator** (`computeMetrics(filteredJobs, ctx)`) → every card, chart, table, and export reads from the same result. Pages do not compute their own totals.

## Phase F1 — Seed data expansion (deterministic)

Expand `src/lib/seed.ts` so filters produce visibly different results. Keep IDs stable for Reset Demo determinism.

- **3 technicians**: Alex Reed, Jordan Park, Sam Diaz (+ 1 inactive: Pat Lowry with historical jobs only).
- **~30 jobs across ~90 days**, spread across statuses (Scheduled, En Route, On Site, Diagnosing, Waiting for Approval, Waiting for Parts, Completed, Follow-Up).
- New `Job` fields: `jobType` ("Repair" | "Maintenance" | "Install" | "Inspection" | "Warranty"), `serviceCategory` ("No Cooling" | "No Heat" | "Leak" | "Noise" | "Tune-Up" | "Install"), `billingType` ("Billable" | "Warranty" | "Maintenance Plan"), `isCallback: boolean`, `originalJobId?`, `revenue`, `partsCost`, `laborCost`, `travelMinutes`, `diagnosticMinutes`, `activeLaborMinutes`, `pausedMinutes`, `totalDurationMinutes`, `rating?` (1-5), `estimateApproved?: boolean`, `firstTimeFix: boolean`.
- **~10 customers** across **4 cities** (Cape Coral, Fort Myers, Naples, Bonita Springs), some flagged `maintenancePlan: true`.
- **Equipment**: 4 brands (Goodman, Trane, Carrier, Lennox), 3 types (Heat Pump, AC, Furnace).
- **Parts usage** records distributed across jobs (capacitor, contactor, TXV, blower motor) including 2 "parts-related return visits".
- All numbers chosen so totals are non-trivial and filterable subsets are still non-empty.

## Phase F2 — Filter model expansion

Extend `src/lib/filters.ts`:

- Add to `JobFilters`: `serviceCategories[]`, `equipmentTypes[]`, `cities[]`, `billingTypes[]`, `callbackOnly?: "first-visit"|"callback"|null`, `maintenancePlanOnly?: boolean`, `revenueMin?`, `revenueMax?`.
- Add `"last-quarter"` and `"last-year"` to `RangeKey`; implement bounds.
- Extend `applyJobFilters` to honor every new field (AND semantics).
- Add `previousPeriodBounds(filters)` for trend comparisons; return `null` when prior period has < N matching jobs → "Not enough comparison data."
- Add `activeFilterCount` + `summarize` updates.

## Phase F3 — Shared metrics aggregator

New `src/lib/metrics.ts`:

```ts
computeMetrics(jobs: Job[], ctx): {
  openJobs, completed, scheduled,
  revenue, grossProfit, grossMargin, avgTicket,
  firstTimeFixRate, callbackRate,
  avgTravelMin, avgDiagnosticMin, avgActiveLaborMin, avgTotalDurationMin, pausedMin,
  techUtilization,        // active / (active+paused+travel)
  estimateApprovalRate,
  partsUsage: { partId, name, count, jobIds }[],
  partsReturnVisits,
  failureTypes: { category, count }[],
  brandsServiced: { brand, count }[],
  ratings: { avg, count, dist },
  estimatedSavings,
  byTech: Record<techId, {...subset}>,
  byDay: { date, revenue, jobs }[],   // for charts
  byStatus: Record<JobStatus, number>,
}
```

Plus `computeTrend(current, previous)` returning `{ delta, pct, hasComparison }`.

## Phase F4 — Owner Dashboard rewrite

`src/pages/owner/OwnerDashboard.tsx`:

- One `useMemo` runs `applyJobFilters` → `computeMetrics`. Every card, chart, list reads from that result.
- Cards: Open / Completed / Scheduled, Revenue, Gross Profit, Gross Margin, Avg Ticket, First-Time Fix %, Callback %, Avg Travel/Diagnostic/Active Labor/Total Duration, Paused time, Tech Utilization, Estimate Approval %, Parts Return Visits, Avg Rating.
- Charts (recharts already in deps): Revenue over time (byDay), Jobs by status (bar), Jobs by technician (bar), Failure categories (bar), Brand mix (bar), Rating distribution.
- Each card/chart bar is a `<Link>` to `/app/owner/jobs?from=metric&...` carrying filters + optional sub-filter (status=Completed, techId=..., partId=...) so drill-down counts match.
- Trend deltas via `computeTrend`; show "Not enough comparison data" when null.
- Empty states ("No jobs match these filters") instead of stale numbers.

## Phase F5 — FilterBar upgrades

`src/components/owner/FilterBar.tsx` + new sub-pieces:

- Add MultiCheck instances for Service Category, Equipment Type, City, Billing Type.
- Add toggles: First-visit/Callback, Maintenance plan only, Open/Completed quick toggles, Waiting-for-parts quick toggle.
- Add Revenue range inputs (min/max).
- Active-filter **chips with X to remove each**, plus Clear all + filter count badge.
- Date range: enforce end ≥ start, show selected range label; include `last-quarter`, `last-year`.
- **Saved views** (seeded): "My team this week", "Completed this month", "Callbacks last 30 days", "Waiting for parts", "Warranty work". Stored in `localStorage` under `filter-views:owner`.
- Export button writes CSV including: range, active filters, timestamp, timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`), row count.

## Phase F6 — Wire every other filtered surface

All use the same `useJobFilters` + shared aggregator/filter pipeline; no page does ad-hoc filtering.

- `OwnerJobs.tsx` — FilterBar + filtered table; search runs inside filtered set; sortable columns.
- `OwnerCustomers.tsx` — customer list filtered by city / maintenance plan / activity in date range.
- `OwnerEquipment.tsx` — filter by brand / type / city / has-jobs-in-range.
- `QACenter.tsx` — filter test results by suite/category/status; totals reflect filter.
- `FieldTest.tsx` — filter feedback by tech, step, rating, date.
- Technician `Parts.tsx`, `Documents.tsx`, `Knowledge.tsx`, `JobsHome.tsx` — search + category filters update list and counts.

## Phase F7 — State, loading, error, performance

- Filters persist via existing `useJobFilters` (sessionStorage) — confirmed working; extend scopes per page.
- Drill-down preserves filters via URL search params; back-nav restores them.
- Add tiny `useDeferredValue` on filter changes so the metrics recompute feels instant but ignores stale closures.
- Empty + error states standardized in `<EmptyState />` and `<FilterErrorState onRetry />`.

## Phase F8 — Acceptance tests

Add `src/test/filters.test.ts` covering the 25 listed scenarios via the pure `applyJobFilters` + `computeMetrics` functions (no DOM): all/one/multi technician, every date preset, custom ranges crossing month/year, invalid range, status/type/brand/city, combined AND, empty result, callback only, warranty only, etc. Each assertion verifies metric totals, byTech subset sums, and drill-down job-id lists are consistent.

## Technical notes

- Types added/changed in `src/lib/types.ts`: new `Job` fields above; new `Customer.maintenancePlan`, `Customer.city`; `Equipment.type`.
- All new fields populated in `seed.ts` deterministically (no `Math.random`, no `Date.now`).
- Store version bumped to `hvac-copilot-store-v4` so existing localStorage clears.
- No backend changes; all in-memory.
- Reset Demo (existing in `OwnerMore`) reseeds + clears `filter-views:*` and `filters:*` keys.

## Out of scope

- AWS integration (existing scaffolding untouched).
- AI/Copilot changes.
- Visual redesign of dashboard cards beyond what's needed to surface new metrics.

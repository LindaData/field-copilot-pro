# UI/UX Review Layer Pass

Date: 2026-06-29

## Scope

This pass started from the latest `LindaData/field-copilot-pro` main branch and focused on making the in-app review layer smoother for client/demo review. It did not redesign the HVAC workflows or add production backend services.

## Review Layer Findings

The previous review layer worked as a local note pad and optional POST sender, but it had several UX gaps:

- Draft text was not visibly autosaved while typing.
- Notes were only easy to review on the current page.
- Sync state was global, not per note.
- Failed live submissions were hard to retry cleanly.
- Review notes did not capture type, priority, or viewport.
- `reviewEndpoint` and cache-busting query parameters polluted the saved route path.
- The UI did not clearly distinguish local-only capture from live endpoint sync.

## Changes Made

- Added per-route draft autosave.
- Added UX/Bug/Copy/Data/Flow note types.
- Added Low/Med/High priority tagging.
- Added current-page and all-open review queues.
- Added per-note local/sending/sent/retry-needed sync badges.
- Added individual retry and bulk sync behavior.
- Added clearer live/local status messaging.
- Captured viewport size with each note.
- Normalized saved review paths by stripping `reviewEndpoint` and `cacheBust`.
- Updated the review worker comment body to include type, priority, and viewport.
- Added tests covering draft autosave and live endpoint sync metadata.

## Feature Review Matrix

| Area | Current UX status | Notes |
| --- | --- | --- |
| Landing and demo entry | Usable | Needs final browser click-through before client demo. |
| Technician today | Usable | Primary daily work context is clear; review layer now captures page-specific feedback. |
| Technician jobs | Usable | Job list remains demo-data based; no redesign in this pass. |
| Job detail and travel workflow | Usable | Next-action polish should be a follow-up pass. |
| Guided diagnosis | Strong prototype | Diagnostic invalidation/review behavior already exists; should be field-tested on mobile. |
| Approval/report/parts request | Usable | Needs client demo walkthrough validation. |
| Equipment list/profile | Improved from documentation work | Manufacturer source visibility is better; exact model review still required. |
| Documents/viewer | Usable | Preview fallback copy should be reviewed during browser testing. |
| Copilot/knowledge/training/settings | Prototype-ready | Keep labeled as demo behavior. |
| Owner dashboard | Dense but usable | Future pass should simplify grouping and executive scan hierarchy. |
| Owner jobs/customers/equipment | Usable | Owner equipment is now the strongest documentation review surface. |
| Owner integrations | Placeholder | Must stay clearly non-production. |
| Feedback pages | Usable | Separate from review layer; review layer is now better for live client walkthrough notes. |

## Validation Performed

- TypeScript app compilation passed.
- Vitest passed with 11 tests.
- ESLint passed with existing warnings only.
- Production build passed.
- Local Vite preview served `/` and `/app/owner/equipment`.

## Remaining UI/UX Work

1. Run a real browser visual pass across desktop and phone widths.
2. Verify the review endpoint is deployed before a client walkthrough.
3. Make job detail's next best action more visually dominant.
4. Add clearer documentation trust badges to job detail equipment cards.
5. Simplify owner dashboard grouping for a less dense first read.
6. Keep demo/prototype labels visible anywhere behavior is not production-backed.

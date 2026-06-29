# Field-Proof Responsive UX Review

Related: #15

## Principle

Field Copilot Pro should be simple enough for real HVAC field conditions: hot attics, bad signal, gloves, tired techs, impatient customers, and owners who need the answer now.

Use professional product language:

- field-proof
- mistake-resistant
- plain-language
- impossible-to-miss
- technician-first
- owner-ready

Do not put insulting language in the product. Design so common mistakes are prevented before they happen.

## Current Strengths

- Technician app already uses a constrained mobile shell and bottom navigation.
- Owner app already uses a wider desktop shell and top tab navigation.
- Primary technician workflow already emphasizes Today, Jobs, Scan, Copilot, and More.
- Job detail already has major actions for travel, arrival, pause/resume, complete, diagnostics, parts, and reports.
- Equipment profile already surfaces linked manuals and manufacturer document warnings.
- Owner dashboard already has attention queues for overdue, paused, approval, parts, diagnostic review, missing report, and follow-up items.

## Desktop Web Review

### Findings

1. Owner screens are closer to desktop-ready than technician screens.
2. Technician screens are intentionally mobile-first, but desktop users may see too much empty space because the technician shell is narrow.
3. Owner dashboard has many controls and charts; it needs stronger grouping and plain-language explanation.
4. Equipment/document readiness should be prominent on owner equipment screens because this becomes the foundation for later AI.
5. Demo state and AWS readiness need clearer labels so nontechnical users do not think the app is fully connected.

### Desktop Priorities

1. Add a desktop-friendly technician layout only where useful, not everywhere.
   - Job detail can remain mobile-width for field realism.
   - Owner/admin pages should use full responsive grids.
2. Add plain-language helper text near complex dashboards.
3. Add an equipment documentation readiness summary for owners.
4. Add consistent empty states with next action buttons.
5. Add clearer demo/AWS planned labels to prevent misunderstanding.

## Mobile Web Review

### Findings

1. Mobile navigation is already strong because it keeps primary tabs at the bottom.
2. Touch targets are mostly large enough.
3. Job detail is action-heavy; the primary next step should always be obvious.
4. Equipment pages contain a lot of technical detail and can become dense on a phone.
5. Document matching status needs clearer plain-language labels:
   - Exact manual linked
   - Likely match, review needed
   - No manual linked
   - Manual mismatch risk

### Mobile Priorities

1. Keep one obvious primary action per screen.
2. Put safety/status warnings above technical details.
3. Make manual match status impossible to miss on job detail and equipment profile.
4. Reduce small text in high-pressure workflow sections.
5. Keep owner dashboard tabs scrollable but add a short summary at the top.

## Field-Proof Copy Rules

Replace vague labels with direct action language:

| Weak | Better |
| --- | --- |
| Review | Review this job |
| Details | View details |
| Documentation | Finish job notes |
| AI Ready | Docs linked, AI later |
| Unknown | Needs review |
| Simulated Reader | Demo document reader |

## Equipment Documentation UX

This is a shared requirement across web, iOS, Codex, and Lovable work.

Before any paid AI/RAG:

1. Each unit must have manufacturer, model, serial, type, install date, and location.
2. Each unit must link to one or more documents.
3. Each document link must have a confidence/status field.
4. The app must distinguish exact model docs from generic manufacturer docs.
5. Owners/admins must review and approve document matches.
6. Technician job screens must show whether the current job's unit has trusted docs.

Recommended statuses:

- `verified_exact_match`
- `likely_model_family_match`
- `manufacturer_generic`
- `missing_documentation`
- `needs_owner_review`
- `rejected_mismatch`

## Recommended Next PRs

### PR A — Equipment docs status badges

Add visible equipment-document status badges to:

- Job detail equipment card.
- Equipment profile header.
- Owner equipment cards.

No backend required. Use current demo data and derived status helpers.

### PR B — Owner dashboard simplification

Add plain-language section headers:

- What needs attention
- Today's field activity
- Business performance

Add short descriptions under each tab.

### PR C — Mobile job-detail next action polish

Make the next correct action sticky or visually dominant:

- Start travel
- Mark arrived
- Start diagnostic
- Continue diagnostic
- Get approval
- Request parts
- Finish report

## QA Checklist

Desktop:

- 1280px wide owner dashboard is readable.
- Owner tabs do not hide critical pages.
- Tables/cards do not overflow horizontally.
- Charts have useful labels.

Mobile:

- iPhone width has no horizontal scroll.
- Primary action is visible without guessing.
- Bottom nav does not block form buttons.
- Text remains readable outside ideal lighting.
- Manual/document status is visible before the technician opens documents.

Accessibility:

- Buttons have clear accessible names.
- Status is not color-only.
- Tap targets are large enough.
- Dialogs can be dismissed safely.
- Dangerous actions require confirmation.

## Coordination Notes

- Mirror shared iPhone/PWA findings into `docs/UX_IOS_PWA_REVIEW.md` on branch `ux/ios-pwa-review`.
- Keep issue #14 as the source of truth for unit-to-document mapping before AI.
- Keep issue #15 as the parent for desktop/mobile/iOS UX review.

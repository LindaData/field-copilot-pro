# iOS and PWA Field-Proof UX Review

Related: #15

## Principle

The iPhone version should feel like a tool a technician can use with one hand, in the field, under pressure. It should be field-proof, mistake-resistant, and professional.

No paid AI, AWS deployment, or Bedrock calls belong in this phase.

## iPhone Priorities

1. Thumb-friendly primary actions.
2. Clear next step on every job screen.
3. Safe-area support for notches and home indicator.
4. Fast access to scan, call, directions, diagnostics, and documents.
5. Offline/low-signal messaging.
6. Document match status visible before opening any manual.
7. Camera and file upload flows that explain what to capture.

## Current Strengths

- Technician app already uses a mobile-width shell.
- Bottom nav puts Today, Jobs, Scan, Copilot, and More in thumb reach.
- Sticky top header shows company/user/sync status.
- Job detail already includes travel, arrival, pause/resume, completion, diagnostics, parts, and service history.
- Equipment profile already shows linked manual buttons and document-reader warnings.

## iOS Risks

1. Bottom nav can compete with long job-detail forms and report buttons.
2. Dense equipment spec sections may be hard to use on small phones.
3. Document/manual links can open outside the app and interrupt field workflow.
4. Camera/scan expectations need clearer instructions.
5. Offline behavior must not let technicians think data has synced when it has not.
6. AI/copilot labels must make clear what is demo/planned versus live.

## PWA Readiness Checklist

Before packaging or iOS install flow:

- Add a web app manifest.
- Add app icons for iOS home screen.
- Add theme color and viewport settings.
- Confirm safe-area padding works on modern iPhones.
- Add service worker only after offline rules are defined.
- Add offline queue design for job updates.
- Make sync status impossible to miss.
- Test camera/upload flow on Safari iOS.

## Field-Proof iPhone Rules

- One primary button per job state.
- Never hide required next steps under More.
- Use short labels: Call, Directions, Arrived, Start Diagnostic, Request Part, Finish Report.
- Confirm destructive actions.
- Show whether data is synced or pending.
- Show document match status before technical specs.
- Make warnings understandable without HVAC software jargon.

## Equipment Documentation on iOS

Shared with responsive web review and issue #14.

Every equipment profile and job detail should show one of these plain statuses:

- Exact manual linked
- Likely match, review needed
- Generic manufacturer document
- No manual linked
- Rejected/mismatch

Future AI should only use approved documents tied to the correct unit/model. Do not add paid AI now.

## Recommended iOS/PWA PRs

### PR A — PWA metadata

Add manifest and iOS icons only. No service worker yet.

### PR B — iPhone job action polish

Make the current job's next action visually dominant and keep lower-priority actions secondary.

### PR C — Scan flow instructions

Add plain-language camera instructions:

- Take a clear photo of the unit label.
- Capture model and serial.
- Capture wiring label if needed.
- Review before saving.

### PR D — Offline/sync clarity

Show explicit states:

- Synced
- Offline
- Pending upload
- Sync failed
- Needs review

## Coordination Notes

- Mirror shared desktop/mobile findings into `docs/UX_FIELD_PROOF_RESPONSIVE_REVIEW.md` on branch `ux/responsive-review`.
- Keep issue #14 as the source of truth for unit-to-document mapping before AI.
- Keep issue #15 as the parent for desktop/mobile/iOS UX review.

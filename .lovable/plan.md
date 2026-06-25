# Caloosa Demo Data, Equipment Detail, Document Viewer & Diagnostics

Builds on the prior interface/navigation update. Five focused workstreams.

## 1. Caloosa Cooling company profile

Extend the `Company` type with the full Caloosa profile (phone `239-226-0202`, office `14241 Jetport Loop, Unit #1, Fort Myers, FL 33913`, established 2001, weekday/weekend hours, services list, geography list, optional logo + brand colors).

- Seed values from the brief.
- Add a Company Profile section on the Owner Settings page that:
  - Renders the structured profile read-only.
  - Lets owners upload a logo (object URL into state) and pick brand colors.
- Header company mark uses uploaded logo when present, otherwise the initials chip.
- Luis Gomez remains the seeded Owner with full title "Co-Owner & General Manager".

## 2. Structured specifications dataset

New `EquipmentSpec` record type with the fields the brief requires:

```text
equipmentId, category, fieldName, value, unit,
sourceType, sourceDocumentId, sourcePage,
verificationStatus, approvedBy, approvedAt,
reviewNotes, lastReviewedAt
```

Seed every Goodman GSXN3 field from the brief into `SPECS` keyed by `eq-1`, grouped into categories: `capacity`, `compressor`, `fan`, `refrigeration`, `electrical`, `physical`, `certifications`, plus the existing `errorCodes` and `bom` collections.

- Single source of truth: equipment page, search, document viewer, and diagnostics all read from this dataset.
- The five fictional models (GOO-ACX850, GOO-GASC45, RHE-ACS520, LEN-AHB83, CAR-TSB44) are tagged `verificationStatus: "demo-unverified"` and their cards show the "Demo Equipment — Specifications Not Verified" badge.

## 3. Equipment list + category detail pages

Improve equipment cards to surface manufacturer, model, serial, type, property, system nickname, install date, verification status, verified-spec count, last service date, current open issue, warranty status. Card actions: Open / Service History / Specifications / Documents / Start Job — all keyboard-reachable (stopPropagation on inner controls).

Equipment Profile page gets clickable category rows (Capacity, Compressor, Fan, Refrigeration, Electrical, Physical, Certifications, Approved Error Codes, Bill of Materials) that open a detail drawer rendering every spec row with: field, value, unit, source classification, document, page, approval status, approved by, approval date, notes, conflicts, last reviewed.

Error-code and BOM cards become clickable with the detail fields listed in the brief. When no approved error codes exist, show the honest empty-state copy.

Refrigeration detail intentionally omits pressure / superheat / subcooling targets. Refrigerant type omitted.

## 4. Document library + viewer

Add a `DocumentRecord` with: `id, title, type, date, fileUrl, fileKind ("pdf"|"image"|"external"), pages[], state ("available"|"processing"|"needs-review"|"approved"|"source-unavailable"|"preview-unavailable")`.

Seed the Goodman SS-GSXN3 dealer spec sheet record (06/23, page 3 = Product Specifications) and link every Goodman spec to it via `sourceDocumentId` + `sourcePage`.

DocumentViewer page:

- Desktop: PDF on left, extracted structured specs on right.
- Mobile: tabbed Document / Extracted Specifications.
- Renders `<iframe>` for embeddable PDFs; falls back to an "Open Official Source" button when blocked or state is `preview-unavailable`; never blank placeholder when the doc record is `approved`.
- Accepts a `?page=3&specId=...` deep link from "View Source" buttons; highlights the focused spec row.

## 5. Resumable diagnostics

Persist diagnostic session state in the store across navigation/refresh (already serialized — verify and harden). Update the diagnostics entry point so the primary CTA reflects existing session: **Continue Diagnosis** / **Resume Current Step**. Secondary actions: Review Completed Steps, View Specifications, View Documents, Save and Exit. **Restart Diagnosis** is tucked into an overflow menu with confirm dialog.

Step UI uses expandable sections (Instructions, Why This Matters, Technical Details, Source, Alternative Results, Escalation) instead of a single text wall.

Inputs are tagged `required | recommended | optional | n/a`. Bypass flow:

- Optional/recommended: prompt for reason, log skip, reduce confidence, keep going.
- Required: cannot silently skip; offer Retry / Save for later / Continue in info-only / Escalate / Unable to test. Info-only blocks definitive repair recommendations.

Edit-earlier-answer flow: dependent steps marked Needs Review (uses existing `reviseStep`), unaffected entries preserved, banner offers "Review Affected Steps".

Persistent **Specs** drawer accessible from any diagnostic step — opens specs/docs/measurements without resetting the session; records when a verified spec was copied into a diagnostic input.

## Out of scope

- Live PDF.js bundle (using native iframe + fallback button).
- Real manufacturer document uploads — viewer accepts URLs; bundled Goodman PDF is the existing seeded URL or external link.
- Voice input, photo-first capture, AWS storage changes.

## Acceptance check at the end

Walk the brief's acceptance list and tick each item against the running app before handing back.

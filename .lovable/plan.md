
# AWS Connection & Storage Setup — Plan

## What Lovable can and cannot do here

Before I start, two honest boundaries you should know:

1. **Lovable cannot provision AWS infrastructure for you.** Creating the S3 bucket, RDS database, EC2 instance, Cognito user pool, IAM roles, and Secrets Manager entries has to happen in your AWS account (you, your IT, or an AWS partner). Lovable will scaffold the wizard and the checklist so a nontechnical owner can follow along, but the "Create EC2 backend" step is a `Mark complete` checkbox + instructions, not a Lovable button that spins one up.
2. **Lovable's only first-class AWS integration is the S3 connector.** That connector is real and works exactly the way your brief asks: short-lived presigned URLs, no AWS keys in the browser, server-side signing. **EC2, RDS, Cognito, and Secrets Manager are not Lovable connectors.** They exist in your AWS account; this app can call them only over HTTPS to an endpoint you stand up (your EC2 API), or it can use Lovable's built-in equivalents until then.

Given those, here's how I propose to honor every requirement in your brief:

| Your AWS service | What ships now in this app | What you (or your AWS admin) must do externally |
|---|---|---|
| **S3** for files | **Real S3, via the AWS S3 connector** — presigned upload/download URLs minted by an edge function. No keys in the browser. | Create private bucket, enable Block Public Access, add CORS for your app origin, link the connector in Lovable. |
| **EC2** API backend | A **repository abstraction** (`AwsApiRepository`) that points at your EC2 base URL once you publish it. Until then, the same interface is implemented by `DemoDataRepository` (existing local demo) and `LovableCloudRepository` (Postgres + edge functions). | Build/deploy your EC2 API (your IT). Then paste the base URL into the wizard. |
| **RDS PostgreSQL** | The schema we'd want in RDS is created in **Lovable Cloud Postgres now** so the app has a real DB to test against. The repository layer means swapping to RDS later is one adapter swap, not a rewrite. | Stand up RDS, run the same migration there, point your EC2 API at it. |
| **Cognito** auth | A Cognito **configuration screen** (region/pool/client/domain), and an `AuthAdapter` interface. Default adapter is Lovable Cloud auth so the demo keeps working; a Cognito adapter stub is included for your EC2 backend to honor. | Create Cognito pool + app client; paste safe IDs into the wizard. |
| **Secrets Manager** | The wizard refuses to accept secrets in the browser. It only stores non-secret config (region, bucket name, EC2 URL, Cognito IDs). | Put DB password, third-party keys, and Cognito client secret in AWS Secrets Manager; reference them from your EC2 IAM role. |

If you read those rows and think "wait, I expected Lovable to build the EC2/RDS/Cognito side too" — please say so now. I'd rather pause and have that conversation than build the wizard.

## Decisions I need

**D1. Should I enable Lovable Cloud so the S3 connector and the edge functions that mint presigned URLs can actually run?**
This is required for *any* real S3 upload from the app, even in demo. Without it, the AWS Storage page can only display config fields and the migration preview — every "Test S3 upload" will return "AWS not yet enabled in this environment". Default if you stay silent: **yes**, enable Lovable Cloud.

**D2. Default DATA_PROVIDER while you wire AWS?**
- `demo` — current behavior, localStorage only. Default if you stay silent.
- `cloud` — write to Lovable Cloud Postgres now. Mirrors the schema your RDS will need; lets technicians test real persistence today.
- `aws` — only valid once your EC2 base URL test passes.

**D3. Auth.** Lovable Cloud email + Google sign-in stays on as the working auth until your EC2 + Cognito are deployed. Then your admin can flip an `AUTH_PROVIDER=cognito` toggle. OK?

**D4. Real S3 connector now or skip?**
If you have an AWS account and a private bucket, I can wire the connector and end-to-end test an upload **this session**. If not, I scaffold everything but every test button reports "Connector not yet linked — share AWS bucket details when ready". Say **link now** or **scaffold only**.

If silent on all four: I proceed with D1 yes, D2 demo (preserves the working demo as you required), D3 yes, D4 scaffold only.

## Phased implementation

### Phase A1 — Repository layer (`DataRepository`)
- Define `src/lib/data/repository.ts` interface covering every store API the app already uses: companies, users, roles, customers, properties, equipment, jobs, status history, diag sessions, measurements, observations, parts, inventory, labor, pauses, authorizations, feedback, reports, audit logs, file refs.
- `DemoDataRepository` wraps the current `useStore` API so nothing breaks.
- `LovableCloudRepository` (built in A4) and `AwsApiRepository` (built in A6) implement the same interface.
- `DATA_PROVIDER` resolves from `import.meta.env.VITE_DATA_PROVIDER` falling back to the wizard's saved choice in localStorage. App boot picks the matching adapter.

### Phase A2 — AWS config model + wizard storage
- `src/lib/aws/config.ts` defines `AwsConfig = { region, s3Bucket, ec2BaseUrl, cognito: { userPoolId, clientId, domain }, environment, companyId }` and validates each field (no secrets accepted; rejects strings matching AWS access-key patterns).
- Saved in localStorage under `caloosa.aws.config` AND mirrored into Lovable Cloud's `app_settings` table once Cloud is enabled, so the values survive across browsers.

### Phase A3 — AWS Storage wizard page (Owner only)
- Route: `/app/owner/integrations/aws`. Added to OwnerShell sub-nav under "More → Integrations".
- Five status cards (AWS Account, S3, PostgreSQL, EC2, Cognito) with the exact state machine from your brief: `Not Started / Information Needed / Testing / Connected / Connection Failed / Action Required`. State persists with the config.
- Plain-language explanations exactly as you wrote them.
- Configuration form for the non-secret fields only. Secret fields are explicitly absent and a callout explains why ("Passwords and AWS access keys belong in AWS Secrets Manager and never in this screen").
- Five test buttons + Run Full Connection Test. Each renders a friendly result message; never a raw stack trace.
- 13-step nontechnical checklist with `What this does / Where to find it in AWS / What to copy / What not to share / Mark Complete`.

### Phase A4 — Lovable Cloud database (the "RDS now, swap later" schema)
- Enable Lovable Cloud.
- Migration creates the full structured schema: `companies, users, user_roles, customers, properties, equipment, equipment_specs, jobs, job_status_history, diag_sessions, measurements, observations, parts, inventory, labor_entries, pauses, authorizations, ai_feedback, reports, audit_logs, file_refs`. Each table has tenant isolation via `company_id`, RLS scoping to the authenticated user's company, and explicit `GRANT`s per Lovable conventions.
- `LovableCloudRepository` implements `DataRepository` against this schema. Verified by writing one record per table from a smoke test.
- This same SQL is exported to `db/aws-rds-schema.sql` so your DBA can apply it verbatim to RDS later.

### Phase A5 — S3 presigned-URL backend (real, when connector is linked)
- Edge functions:
  - `POST /functions/v1/files-upload-url` — verifies session, company, target entity (job/equipment), generates safe filename, mints presigned PUT, inserts `file_refs` row in `processing=pending` state.
  - `POST /functions/v1/files-complete` — marks the row uploaded, records size + MIME, writes audit log.
  - `POST /functions/v1/files-download-url` — verifies tenancy + visibility, mints presigned GET.
  - `DELETE /functions/v1/files/:fileId` — soft-deletes row, writes audit log, deletes S3 object via gateway.
- Validates MIME against allowlist (image/*, application/pdf, video/mp4, audio/*, text/csv) and size cap (configurable; default 50 MB), and rejects extensions in a deny list (`.exe .js .sh .bat .ps1 .cmd .com .scr .msi .dll`).
- S3 key template uses only IDs, never customer-identifying names: `companies/{companyId}/jobs/{jobId}/photos/{fileId}/{safeFilename}` etc.
- Tenant isolation enforced server-side; the request body cannot override `companyId`.

### Phase A6 — `AwsApiRepository` stub
- Implements `DataRepository` by calling your EC2 API at `${ec2BaseUrl}/api/...` with the Cognito ID token attached.
- Until you publish the EC2 API, calls fail fast with a friendly "EC2 backend not yet configured — your administrator must deploy it" message, and the wizard's EC2 card stays at `Action Required`.

### Phase A7 — Technician upload UX
- Technicians only see: Take Photo / Choose File / Uploading / Saved / Offline — waiting to sync / Upload Failed — retry. No "S3", no "presigned URL", no "bucket" in the UI string table.
- Photo compression (canvas resize to max 2000px, 0.85 jpeg), upload progress bar via XHR, cancel, retry, offline queue persisted to IndexedDB, dedupe by sha1+size, remove file, Internal vs Customer Shareable classifier.

### Phase A8 — Failure handling & sync status
- All writes funnel through an `OutboxQueue` so a failed AWS write becomes a queued retry rather than data loss. Sync status surfaces on the technician Today screen ("3 items waiting to sync") and on the Owner dashboard's new AWS panel.

### Phase A9 — Owner admin AWS dashboard panel
- On Owner dashboard: AWS connection status, last successful API response timestamp, last DB write, last S3 upload, files awaiting sync, failed uploads, storage used (queried from `file_refs` aggregate), environment, security warnings (e.g. "Bucket not yet verified as private"), migration status.

### Phase A10 — Migration preview
- Owner-only `/app/owner/integrations/aws/migrate` shows per-record-type: Ready / Invalid / Duplicate / Missing required information. Requires typed confirmation ("MIGRATE") before running. Source = current `DemoDataRepository`; target = currently selected non-demo repository. Idempotent: re-running skips already-migrated rows by deterministic UUID.

### Phase A11 — Acceptance test pass
Runs your acceptance list as deterministic checks in the QA Center: "No AWS key in frontend source" (regex sweep of bundled JS), "Cross-company file access blocked" (forced cross-tenant call returns 403), "Presigned URL works", "Audit log written on delete", "Customer report excludes Internal files", "Offline upload resumes", "Duplicate tap doesn't double-create", "Demo still works without AWS configured". Results visible in QA Center; release verdict factors them in.

## Out of scope (I will refuse mid-build)
- Provisioning AWS resources from inside Lovable (EC2, RDS, Cognito, IAM, Secrets Manager). Wizard guides you; AWS console is where it happens.
- Writing or storing AWS access keys anywhere in the project.
- Auto-migrating production data to AWS without explicit typed confirmation.
- Adding a "skip security check" button anywhere.

## Order of approval
Say one of:
- **"Approve all, defaults are fine"** → I start at Phase A1 and ship A1–A3 this turn (repo layer + config model + wizard page), then continue.
- **"Approve A1–A4 only, link S3 later"** → I stop after the schema migration.
- **"Link S3 now, here's the bucket"** → I wire the connector and run a live upload test this turn.
- **"Pick option X for decision N"** → I revise.
- **"Resume tech / owner / equipment-AI plan first"** → I park this and finish that one.

Your call.

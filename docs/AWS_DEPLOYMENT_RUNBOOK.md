# AWS Deployment Runbook

This runbook turns the Caloosa Cooling Field Copilot prototype into an AWS-hosted app in safe phases.

## Phase 0 — No AWS Account Yet

Status: current.

Allowed work:

- Architecture docs.
- GitHub issues.
- Codex prompts.
- Infrastructure templates.
- Frontend demo improvements.

Blocked work:

- Real AWS deployment.
- Cognito user pool creation.
- DynamoDB table creation.
- S3 bucket creation.
- Bedrock setup.
- Real customer data entry.

## Phase 1 — AWS Account Ready

Required checklist:

- [ ] AWS account created.
- [ ] Root MFA enabled.
- [ ] Daily admin access created.
- [ ] Billing access confirmed.
- [ ] Monthly budget alert created.
- [ ] Default region selected, recommended `us-east-1`.

Do not continue until all boxes are checked.

## Phase 2 — Frontend on Amplify Hosting

Goal: deploy the current static React/Vite prototype to AWS without backend complexity.

Recommended settings:

```yaml
Repository: LindaData/field-copilot-pro
Branch: main
App root: /
Build command: npm ci && npm run build
Output directory: dist
Environment variables:
  VITE_BASE_PATH: /
```

Expected result:

- App is reachable through an Amplify domain.
- Demo/localStorage behavior still works.
- No real customer data is stored.
- GitHub remains the source of truth.

Validation:

- Open `/`.
- Open `/signin`.
- Enter demo mode/sign in if the prototype supports it.
- Open `/app/today`.
- Open `/app/owner`.
- Refresh a nested route to confirm SPA fallback works.

## Phase 3 — CDK Foundation Preview

Goal: prepare AWS backend infrastructure as code without deploying blindly.

Use `docs/CODEX_AWS_PROMPTS.md` Prompt 3 after AWS CLI access exists. The implementation PR should create the real CDK app under `infra/`, install dependencies, commit the lockfile, build, and synthesize the dev stack.

Do not run deploy until synth succeeds and the generated resources are reviewed.

## Phase 4 — First Backend Resources

The first backend stack should include only:

- Cognito user pool and app client.
- Cognito groups: `owner`, `technician`, `admin`, `support`.
- One private S3 bucket for app documents.
- One DynamoDB table for MVP operational records.
- Basic CloudWatch log group/outputs.

No Bedrock, Textract, OpenSearch, RDS, ECS, EKS, NAT Gateway, or always-on compute yet.

## Phase 5 — App Integration

After backend resources exist:

1. Add an `awsRepository` implementation.
2. Keep the existing demo/localStorage repository as `demoRepository`.
3. Add a config switch: `VITE_APP_BACKEND_MODE=demo|aws`.
4. Wire Cognito auth into route guards.
5. Use the backend API for job/customer/equipment data.
6. Keep tests passing in demo mode.

## Phase 6 — File Storage

Add S3 workflows only through server-side authorization.

Required file types:

- Manual PDFs.
- Job photos.
- Equipment nameplate photos.
- Customer signatures.
- Generated reports.
- Diagnostic attachments.

Browser upload/download must use short-lived presigned URLs. S3 buckets must stay private.

## Phase 7 — AI/RAG

Add Bedrock only after the app has:

- Auth.
- Company/user boundaries.
- S3 source documents.
- Budget alerts.
- Logging rules.
- Citation requirements.

First AI feature:

- Manual lookup with citations.
- No uncited repair claims.
- Confidence label.
- Technician override/feedback.
- Safety escalation for dangerous electrical/refrigerant work.

## Rollback Plan

For frontend:

- Revert the GitHub commit.
- Let Amplify redeploy the prior commit.

For backend:

- Prefer CDK diff before deploy.
- Use `RemovalPolicy.RETAIN` for data-bearing resources.
- Avoid destructive migrations.
- Keep demo mode functional until AWS mode is proven.

## Production Gate

Do not mark this production-ready until:

- Real auth works.
- Owner/technician permissions are enforced server-side.
- Real data is not stored in localStorage.
- S3 is private.
- Budget alerts exist.
- Logs and audit events exist.
- Route smoke tests pass.
- A small pilot user can complete one real job workflow end-to-end.

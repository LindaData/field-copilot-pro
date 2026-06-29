# AWS Architecture Plan

## Decision

Field Copilot Pro should use AWS as the production backbone. The current browser-only demo can remain available for demos and regression testing, but production customer, job, equipment, diagnostic, document, and AI data should move to AWS-managed services.

This replaces the earlier Supabase-first production path with an AWS-first path.

## Current State

- React 18, TypeScript, Vite, Tailwind, shadcn/Radix UI frontend.
- Demo authentication only.
- Demo operational data stored in browser localStorage.
- Supabase client dependency exists, but there are no production app tables.
- AWS integration screens are currently simulated placeholders.

## AWS Service Map

| Product area | AWS service | Purpose |
| --- | --- | --- |
| Web hosting | AWS Amplify Hosting initially; CloudFront/S3 later if needed | Git-based deploys, staging branches, preview builds, SPA routing |
| Authentication | Amazon Cognito | User pools, MFA, invite flow, JWTs, role/group claims |
| API | AWS AppSync first; API Gateway + Lambda where REST is simpler | Secure app operations, mobile-friendly data access, subscriptions later |
| Compute | AWS Lambda | Server-side authorization, presigned URLs, background tasks, integrations |
| Operational data | Amazon DynamoDB | Multi-tenant company, user, customer, property, equipment, job, diagnostic, approval, report, parts, and feedback records |
| File storage | Amazon S3 | Manuals, job photos, diagnostic attachments, signatures, generated service reports |
| AI/RAG | Amazon Bedrock Knowledge Bases | Manual lookup, service-history retrieval, cited troubleshooting responses |
| Document extraction | Amazon Textract | OCR and structured extraction for scanned manuals, forms, receipts, and photo-heavy PDFs |
| Events/workflows | EventBridge, SQS, Lambda | Report generation, ingestion jobs, notifications, scheduled maintenance reminders |
| Notifications | Amazon SES or Pinpoint | Email/SMS later, after workflow requirements are stable |
| Observability | CloudWatch, X-Ray, CloudTrail | Logs, metrics, traces, alarms, audit trail |
| Security | IAM, KMS, WAF, Secrets Manager | Least privilege, encryption, API protection, secret handling |
| Infrastructure | AWS CDK v2 | Reproducible infrastructure as code in TypeScript |

## MVP Architecture

```text
React/Vite app
  -> Cognito login
  -> AppSync GraphQL API or API Gateway HTTP API
  -> Lambda resolvers/handlers where business logic is needed
  -> DynamoDB operational data
  -> S3 private files through presigned URLs
  -> CloudWatch logs/metrics
```

Keep this small. Do not start with ECS, EKS, RDS, or a complex VPC unless a clear requirement appears. A mostly serverless backend is enough for the first production-grade pilot.

## Data Model Direction

Use a repository abstraction in the frontend so the app can support:

1. `demoRepository` backed by existing seed data and localStorage.
2. `awsRepository` backed by AppSync/API Gateway.

Core entities:

- Company
- User
- Customer
- Property
- Equipment
- Job
- DiagnosticSession
- DiagnosticAnswer
- Approval
- Report
- Document
- PartRequest
- Feedback
- AuditEvent

Tenant boundary: every production record must be scoped to a `companyId` or equivalent account partition.

## DynamoDB Starting Point

Start with documented access patterns before final table design.

Required first access patterns:

- Get technician's assigned jobs for today.
- Get job detail with customer, property, equipment, diagnostics, approvals, report state, and attachments.
- Update job status and diagnostic progress.
- List active jobs for an owner/company.
- Search customers/equipment/jobs inside one company.
- Create part request linked to job/equipment.
- Generate owner queue and dashboard metrics.

Use one-table design only if the access patterns are stable enough. Otherwise begin with a small set of tables and optimize later.

## Storage Direction

Use private S3 buckets only. The browser should not receive permanent AWS credentials for broad access.

Recommended object-key pattern:

```text
companies/{companyId}/manuals/{manualId}/{filename}
companies/{companyId}/jobs/{jobId}/photos/{photoId}.{ext}
companies/{companyId}/jobs/{jobId}/reports/{reportId}.pdf
companies/{companyId}/equipment/{equipmentId}/documents/{documentId}/{filename}
```

All upload/download operations should use short-lived presigned URLs generated after server-side authorization checks.

## AI/RAG Direction

Do not add free-form AI diagnosis before source boundaries are stable.

First safe AI workflow:

1. Store approved manuals and SOPs in S3.
2. Ingest them into Bedrock Knowledge Bases.
3. Technician asks a question from a job/equipment context.
4. Retrieval is limited to approved sources for that company/equipment/manufacturer.
5. Response includes citations, confidence, and escalation caveats.
6. Technician can mark the response useful/not useful and override the suggestion.

AI must not present uncited manual claims as fact.

## Security Defaults

- Cognito auth required for AWS-backed mode.
- Groups/roles: `owner`, `technician`, `admin`, `support`.
- Server-side authorization required for every company/job/file access.
- S3 Block Public Access remains enabled.
- KMS encryption for sensitive buckets/tables where appropriate.
- No secrets in frontend environment variables except safe public configuration.
- CloudTrail and CloudWatch logging enabled for production.
- Separate staging and production environments.

## Cost-Control Defaults

- Start serverless: Amplify Hosting, Cognito, Lambda, DynamoDB on-demand or low provisioned capacity, S3 Standard with lifecycle rules.
- Do not add NAT gateways, ECS, OpenSearch, RDS, or always-on compute in the MVP unless necessary.
- Use Bedrock with strict retrieval limits, model selection, and logging controls.
- Add AWS Budgets/alerts before production data or pilot users are onboarded.

## Build Order

1. AWS architecture and security review.
2. CDK scaffold for dev/staging/prod.
3. Cognito user pool and role mapping.
4. Repository/data-access abstraction.
5. DynamoDB/AppSync or API Gateway data model.
6. S3 private storage and presigned URL flow.
7. CI/CD deployment to AWS staging.
8. Pilot data migration away from localStorage.
9. Bedrock manual lookup/RAG.
10. PWA/offline queueing and later mobile packaging.

## Codex Implementation Prompt

```text
You are working in LindaData/field-copilot-pro. Implement the AWS architecture foundation without breaking the existing demo.

Goals:
1. Add docs/AWS_ARCHITECTURE.md if not present and keep it aligned with docs/ROADMAP.md.
2. Add an AWS CDK v2 TypeScript app scaffold under infra/.
3. Do not deploy anything yet.
4. Add environment naming for dev/staging/prod.
5. Define placeholder constructs/interfaces for Cognito, API, DynamoDB, S3, and observability, but keep resources minimal until reviewed.
6. Add npm scripts for infra synth/typecheck where appropriate.
7. Add tests or static checks for the new infra code.
8. Preserve the existing React/Vite demo behavior and all current routes.
9. Do not commit credentials, real AWS account IDs, secrets, customer data, or service-role tokens.
10. Update README with AWS-first direction and local commands.

Before coding, inspect package.json, README.md, docs/ROADMAP.md, current src/lib data/storage patterns, and workflows. After coding, run npm install if needed, npm run lint, npm test, TypeScript checks, and npm run build. Report any failures with exact commands and errors.
```

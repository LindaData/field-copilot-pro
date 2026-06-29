# Roadmap

## Direction

Field Copilot Pro is moving to an AWS-first production architecture. The current browser-only demo remains useful for sales demos and regression testing, but production auth, data, storage, AI/RAG, observability, and deployment should be implemented on AWS.

See [AWS Architecture Plan](AWS_ARCHITECTURE.md).

## Foundation

- Stabilize npm-only dependency management.
- Keep demo behavior as a regression baseline.
- Add route-level smoke tests for technician and owner flows.
- Add repository-layer contracts so demo data and AWS-backed data can share the same app interfaces.
- Add AWS CDK v2 infrastructure scaffold before deploying production resources.

## Authentication and Permissions

- Replace the demo sign-in stub with Amazon Cognito.
- Define technician, owner, admin, and support roles.
- Map Cognito groups/claims into server-side authorization checks.
- Enforce authorization in both UI and AWS API/backend layers.
- Add audit logging for privileged actions.

## AWS Data Migration

- Replace the Supabase-first production path with AWS-backed persistence.
- Document DynamoDB/AppSync or API Gateway access patterns for companies, users, customers, properties, equipment, jobs, diagnostics, approvals, reports, documents, parts, and feedback.
- Add multi-tenant data boundaries by company/account.
- Build migration scripts from seed/demo records to AWS-backed records.
- Keep demo mode available without production data.

## File Storage

- Use private Amazon S3 buckets for manuals, job photos, diagnostic attachments, generated reports, and signatures.
- Generate short-lived presigned URLs from authorized backend operations.
- Define object-key conventions, lifecycle policies, source-state, and retention rules.
- Store generated service reports and signatures safely.

## Data Import

- Build customer, equipment, job, manual, and part import templates.
- Add validation and deduplication.
- Support staged review before importing real operational data.
- Use S3-backed import staging for production imports.

## Diagnostic-Engine Improvements

- Formalize diagnostic templates and branching.
- Track measurement provenance and invalidation.
- Add review queues for changed earlier answers.
- Add manufacturer-specific rule packs only after the baseline is stable.

## Testing

- Expand unit tests for store initialization, reseeding, routes, localization, and primary actions.
- Add integration tests for critical technician and owner flows.
- Add browser smoke tests for mobile layouts.
- Add AWS repository contract tests before real data migration.
- Add infrastructure checks for CDK synthesis.

## Security

- Add secret scanning and dependency review.
- Remove all demo assumptions from production paths.
- Keep S3 Block Public Access enabled.
- Add least-privilege IAM policies.
- Use KMS encryption where appropriate.
- Add security headers at the hosting layer.
- Document incident and access-review procedures.

## Offline Support

- Define offline-first requirements for field technicians.
- Add durable local queueing for job updates.
- Reconcile conflicts after reconnect.
- Keep offline mode scoped to assigned technician jobs, not broad company data.

## AI/RAG Integration

- Keep AI features simulated until real data boundaries are defined.
- Store approved manuals/SOPs in S3.
- Use Amazon Bedrock Knowledge Bases for cited manual/service-history retrieval.
- Use Amazon Textract where scanned/manual PDFs need OCR or structured extraction.
- Add citations, confidence, technician override flows, and safety escalation behavior.

## Mobile Packaging

- Validate responsive web experience first.
- Evaluate PWA packaging.
- Consider native packaging only after auth, offline sync, and storage are stable.

## Production Deployment

- Establish AWS dev/staging/production environments.
- Use AWS CDK v2 for infrastructure as code.
- Use Amplify Hosting initially, or CloudFront/S3 if custom hosting requirements outgrow Amplify.
- Add CI/CD promotion gates.
- Configure CloudWatch monitoring, alarms, backups, budgets, and rollback.
- Do not add expensive always-on AWS infrastructure until architecture, security, and cost reviews are complete.

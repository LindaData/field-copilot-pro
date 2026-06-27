# Roadmap

## Foundation

- Stabilize npm-only dependency management.
- Keep demo behavior as a regression baseline.
- Add route-level smoke tests for technician and owner flows.
- Add repository-layer contracts for future server-backed data.

## Authentication and Permissions

- Replace the demo sign-in stub with real authentication.
- Define technician, owner, admin, and support roles.
- Enforce authorization in both UI and backend.
- Add audit logging for privileged actions.

## Database Migration

- Design Supabase schema for companies, users, customers, properties, equipment, jobs, diagnostics, approvals, reports, documents, parts, and feedback.
- Add row-level security policies.
- Build migration scripts from seed/demo records to database records.
- Keep demo mode available without production data.

## File Storage

- Define storage buckets and access policy.
- Add document upload, preview, source-state, and retention rules.
- Store generated service reports and signatures safely.

## Data Import

- Build customer, equipment, job, and part import templates.
- Add validation and deduplication.
- Support staged review before importing real operational data.

## Diagnostic-Engine Improvements

- Formalize diagnostic templates and branching.
- Track measurement provenance and invalidation.
- Add review queues for changed earlier answers.
- Add manufacturer-specific rule packs only after the baseline is stable.

## Testing

- Expand unit tests for store initialization, reseeding, routes, localization, and primary actions.
- Add integration tests for critical technician and owner flows.
- Add browser smoke tests for mobile layouts.

## Security

- Add secret scanning and dependency review.
- Remove all demo assumptions from production paths.
- Add security headers at the hosting layer.
- Document incident and access-review procedures.

## Offline Support

- Define offline-first requirements for field technicians.
- Add durable local queueing for job updates.
- Reconcile conflicts after reconnect.

## AI/RAG Integration

- Keep AI features simulated until real data boundaries are defined.
- Add retrieval sources for approved manuals, prior work, parts, and known fixes.
- Add citations, confidence, and technician override flows.

## Mobile Packaging

- Validate responsive web experience first.
- Evaluate PWA packaging.
- Consider native packaging only after auth, offline sync, and storage are stable.

## Production Deployment

- Establish staging and production environments.
- Add CI/CD promotion gates.
- Configure monitoring, backups, and rollback.
- Do not add AWS infrastructure until architecture and security reviews are complete.

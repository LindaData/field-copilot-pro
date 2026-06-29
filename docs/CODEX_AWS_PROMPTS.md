# Codex AWS Prompts

Use these prompts when moving Field Copilot Pro from demo/localStorage to AWS.

Do not paste AWS passwords, MFA codes, access keys, secret access keys, session tokens, customer data, or production secrets into Codex.

## Prompt 1 — AWS Account Readiness Review

```text
You are working in LindaData/field-copilot-pro.

Goal: verify the repo is ready for first AWS use without deploying anything.

Context:
- I may be new to AWS.
- The AWS account may or may not exist.
- Do not ask for secrets.
- Do not deploy AWS resources.

Tasks:
1. Read README.md, docs/AWS_ARCHITECTURE.md, docs/AWS_BEGINNER_SETUP.md, docs/AWS_DEPLOYMENT_RUNBOOK.md, and docs/ROADMAP.md.
2. Inspect package.json, vite.config.ts, .github/workflows, and src/lib demo/localStorage data patterns.
3. Confirm the app can still run in demo mode.
4. Identify anything that would block Amplify Hosting deployment.
5. Identify anything that would accidentally expose secrets or real customer data.
6. Produce a concise readiness report with exact next steps.

Validation commands:
- npm ci
- npm run lint
- npm test
- npx tsc -p tsconfig.app.json --noEmit
- npx tsc -p tsconfig.node.json --noEmit
- npm run build

Do not modify files unless you find a clear blocker. If you modify files, create a branch and PR.
```

## Prompt 2 — Amplify Frontend Deployment Prep

```text
You are working in LindaData/field-copilot-pro.

Goal: prepare the React/Vite app for AWS Amplify Hosting while preserving GitHub Pages support.

Tasks:
1. Confirm vite.config.ts supports VITE_BASE_PATH=/ for Amplify and /field-copilot-pro/ for GitHub Pages.
2. Add or update docs explaining Amplify Hosting settings:
   - build command: npm ci && npm run build
   - output directory: dist
   - environment variable: VITE_BASE_PATH=/
3. Add a minimal smoke-test checklist for these routes:
   - /
   - /signin
   - /app/today
   - /app/jobs
   - /app/owner
4. Do not add backend services.
5. Do not remove GitHub Pages deployment.

Validation commands:
- npm ci
- npm run lint
- npm test
- npm run build

Create a PR with a clear summary and rollback notes.
```

## Prompt 3 — Create Real CDK Scaffold

```text
You are working in LindaData/field-copilot-pro.

Goal: turn infra/templates into a real AWS CDK v2 TypeScript app.

Rules:
- Do not deploy anything.
- Do not use real AWS account IDs in committed files.
- Do not commit .env files, access keys, secret keys, or tokens.
- Preserve the existing React demo behavior.
- Keep root app CI passing.

Tasks:
1. Create infra/package.json from infra/templates/package.json.example.
2. Create infra/cdk.json from infra/templates/cdk.json.example.
3. Create the TypeScript compiler config needed for a CDK Node.js app.
4. Create infra/bin/field-copilot.ts from infra/templates/bin-field-copilot.ts.example.
5. Replace infra/templates/lib-foundation-stack.ts.example with a real infra/lib/foundation-stack.ts implementation.
6. Run npm install inside infra and commit infra/package-lock.json.
7. Run npm run build inside infra.
8. Run npm run synth -- --context stage=dev inside infra.
9. If root lint sees infra TypeScript files, update eslint.config.js intentionally so infra is either linted with Node globals or excluded with a clear reason.
10. Update README.md with infra commands.

Expected resources in the synthesized stack:
- Cognito user pool and app client.
- Cognito groups for owner, technician, admin, support.
- Private S3 document bucket.
- DynamoDB table for MVP app data.
- CloudFormation outputs.

Create a PR. Do not deploy.
```

## Prompt 4 — Cognito Auth Integration

```text
You are working in LindaData/field-copilot-pro.

Goal: add AWS Cognito auth integration while preserving demo mode.

Rules:
- Demo mode must still work locally.
- AWS mode must require Cognito auth.
- Do not hardcode AWS IDs except through environment variables or generated config.
- Do not commit secrets.

Tasks:
1. Add VITE_APP_BACKEND_MODE=demo|aws support.
2. Add a typed auth service abstraction.
3. Keep demo auth as one implementation.
4. Add Cognito implementation behind aws mode.
5. Add role model: owner, technician, admin, support.
6. Add route guards for technician and owner routes.
7. Add tests for auth states and blocked routes.
8. Update docs.

Validation commands:
- npm ci
- npm run lint
- npm test
- npx tsc -p tsconfig.app.json --noEmit
- npm run build

Create a PR. Do not deploy production.
```

## Prompt 5 — AWS Data Repository Layer

```text
You are working in LindaData/field-copilot-pro.

Goal: prepare the app to move from localStorage demo data to AWS-backed data.

Rules:
- Preserve all current demo flows.
- Do not remove seed data yet.
- Do not add real customer data.
- Do not deploy AWS resources.

Tasks:
1. Inventory current demo data and localStorage writes under src/lib and related components.
2. Define TypeScript repository interfaces for jobs, customers, equipment, diagnostics, approvals, reports, parts, documents, and feedback.
3. Implement demoRepository using the existing localStorage behavior.
4. Add placeholder awsRepository that throws clear not-configured errors.
5. Add tests for the repository contract.
6. Document migration steps to DynamoDB/AppSync or API Gateway.

Validation commands:
- npm ci
- npm run lint
- npm test
- npx tsc -p tsconfig.app.json --noEmit
- npm run build

Create a PR.
```

## Prompt 6 — Bedrock Manual Lookup Design Only

```text
You are working in LindaData/field-copilot-pro.

Goal: design the first Bedrock manual lookup workflow without implementing paid AI calls yet.

Rules:
- Do not call Bedrock.
- Do not enable Bedrock.
- Do not add model IDs that imply production readiness.
- Do not allow uncited HVAC repair claims.

Tasks:
1. Document the manual ingestion workflow from S3 to Bedrock Knowledge Bases.
2. Define citation, confidence, and technician override requirements.
3. Define dangerous-work escalation behavior for electrical/refrigerant actions.
4. Define feedback logging requirements.
5. Add UI copy for simulated manual lookup that makes clear it is a demo.
6. Create implementation issues for the real RAG workflow.

Create a PR.
```

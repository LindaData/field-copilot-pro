# Codex AWS Bootstrap Prompt

Use this prompt for the next Codex pass.

```text
Repository: LindaData/field-copilot-pro
Project: Caloosa Cooling HVAC Field Copilot

Goal:
Prepare the repo for AWS development while keeping the current React/Vite demo working.

Read first:
- README.md
- docs/ROADMAP.md
- docs/AWS_ARCHITECTURE.md
- docs/AWS_ACCOUNT_SETUP.md
- docs/AWS_IPHONE_START.md
- package.json
- infra/README.md

Checks to run:
- npm run lint
- npm test
- npx tsc -p tsconfig.app.json --noEmit
- npx tsc -p tsconfig.node.json --noEmit
- npm run build
- cd infra && npm install && npm run typecheck && npm run synth:dev

Rules:
- Keep local demo mode.
- Use AWS CDK v2 TypeScript.
- Keep the first AWS path serverless and low cost.
- Prefer Cognito, Lambda, DynamoDB, S3, CloudWatch, and Bedrock later.
- Do not add ECS, EKS, RDS, OpenSearch, NAT gateways, or always-on compute without a documented reason.
- Open a PR with commands run and results.
```

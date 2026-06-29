# Field Copilot Pro AWS Infrastructure

This directory is intentionally template-first until an AWS account exists.

Do not deploy from this directory until:

- AWS account exists.
- Root MFA is enabled.
- Admin access exists.
- Budget alerts are configured.
- `docs/AWS_BEGINNER_SETUP.md` is complete.

## Why Templates First

The project should not add active infrastructure code that cannot be installed, synthesized, and reviewed. The files under `infra/templates` are safe starting points for Codex or a developer to convert into a real AWS CDK v2 TypeScript app after AWS access exists.

## First Real Infra Step

After the AWS account is ready, run this on a laptop, cloud VM, Codespace, or Codex environment with Node.js and AWS CLI configured:

```bash
cd infra
cp templates/package.json.example package.json
cp templates/tsconfig.json.example tsconfig.json
cp templates/cdk.json.example cdk.json
mkdir -p bin lib
cp templates/bin-field-copilot.ts.example bin/field-copilot.ts
cp templates/lib-foundation-stack.ts.example lib/foundation-stack.ts
npm install
npm run build
npm run synth -- --context stage=dev
```

Review the generated CloudFormation before deployment.

## First Stack Target

The first foundation stack should create only low-complexity MVP resources:

- Amazon Cognito user pool and app client.
- Cognito groups: `owner`, `technician`, `admin`, `support`.
- Private S3 bucket for manuals, reports, signatures, and job photos.
- DynamoDB table for MVP operational data.
- CloudFormation outputs needed by the frontend.

## Not Included Yet

- Bedrock.
- Textract.
- OpenSearch.
- RDS.
- ECS/EKS.
- NAT Gateway.
- Production VPC.
- Any real customer data.

These come later only if the product needs them.

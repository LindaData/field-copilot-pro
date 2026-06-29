# Field Copilot Pro AWS Infrastructure

This directory is template-first until an AWS account exists.

Do not deploy from this directory until the AWS account is created, root MFA is enabled, admin access exists, budget alerts are configured, and `docs/AWS_BEGINNER_SETUP.md` is complete.

## Why Templates First

Active infrastructure should not be merged before it can be installed, synthesized, and reviewed. The files under `infra/templates` are starting points for the later CDK implementation PR.

## Next Step

After the AWS account is ready, use `docs/CODEX_AWS_PROMPTS.md` Prompt 3 to create the real CDK app under this directory.

The implementation PR should add the final infra package, lockfile, compiler config, foundation stack, build results, and synth results.

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

# AWS Start Guide

Field Copilot Pro is moving to an AWS-first production setup.

## Manual setup before infrastructure work

1. Create an AWS account.
2. Turn on MFA for the account owner.
3. Create a small monthly budget alert.
4. Enable IAM Identity Center.
5. Create an admin user for daily work.
6. Use `us-east-1` as the default project region.

## Development path

The repo should be prepared first. Actual cloud resources should be created later through AWS CDK after the account setup and budget alert are complete.

## Next repo task

Add a CDK v2 TypeScript scaffold under `infra/` with no expensive resources. The first scaffold should only synthesize successfully and document the planned Cognito, API, DynamoDB, S3, CloudWatch, and Bedrock path.

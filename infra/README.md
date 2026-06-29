# AWS CDK Infra

This folder contains the AWS CDK scaffold for Field Copilot Pro.

No AWS resources should be created from this scaffold until the AWS account, budget, and IAM Identity Center setup are complete.

## Commands

```bash
cd infra
npm install
npm run typecheck
npm run synth:dev
```

The initial stack is intentionally minimal. It should synthesize a CloudFormation template but should not create application resources yet.

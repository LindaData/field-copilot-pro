# AWS Beginner Setup Checklist

This guide is for getting Field Copilot Pro ready for AWS when the AWS account does not exist yet.

The goal is plug-and-play: create the account safely, prevent surprise bills, connect GitHub, and only then deploy small AWS resources.

## Current Project Status

- The app is still a demo prototype.
- Production data must not be entered yet.
- AWS is the planned production backbone.
- Do not deploy infrastructure until the account, root MFA, admin access, and budget alerts are complete.

## What Sergio Must Do Manually

These steps require personal/business identity, payment, phone verification, or account ownership. Do not give credentials to ChatGPT, Codex, GitHub, or anyone else.

1. Create the AWS account.
2. Save root credentials in Apple Passwords or a dedicated password manager.
3. Add root MFA.
4. Create the first admin access path.
5. Create budget alerts.
6. Authorize GitHub only through AWS Amplify/GitHub OAuth screens.

## Recommended Naming

Use simple names now. Split into multiple AWS accounts later when the pilot becomes real.

- AWS account name: `LindaData-main`
- Default region: `us-east-1`
- First app environment: `dev`
- Later environments: `staging`, `prod`

Future commercial setup:

- `LindaData-management`
- `LindaData-dev`
- `LindaData-staging`
- `LindaData-prod`

Do not start with multiple AWS accounts unless you are ready to manage AWS Organizations. Start simple, but keep the names clean.

## Step 1 — Create the AWS Account

Use the official AWS signup flow.

Recommended root email options, in order:

1. `aws-root@lindadata.com` if the mailbox or Google Workspace alias exists.
2. `sergio.mora+aws-root@lindadata.com` if plus-addressing works for the mailbox.
3. Your normal LindaData email only if aliases are not available.

Use a strong unique password and save it.

Choose **Basic Support** at signup unless there is a clear reason to pay for support.

## Step 2 — Secure Root Immediately

After the account is active:

1. Sign in as root.
2. Add MFA to the root user.
3. Confirm the recovery email and phone number are correct.
4. Do not create root access keys.
5. Do not use root for daily work.

Root is only for account ownership, billing/root-only actions, and emergency recovery.

## Step 3 — Create Admin Access

Use IAM Identity Center if available in the new account. If that feels too heavy on day one, create only one admin path and keep it protected with MFA.

Minimum target:

- Admin user/email for daily console work.
- MFA enabled.
- No long-lived access keys unless they are specifically needed for CLI/CDK.
- CLI credentials should be temporary/session based where possible.

## Step 4 — Turn On Billing Safety

Before deploying anything:

1. Open Billing and Cost Management.
2. Create a monthly cost budget.
3. Start low: `$10` or `$25` for early dev.
4. Add actual spend alerts at 50%, 80%, and 100%.
5. Add a forecasted alert at 100%.
6. Send alerts to your email.

Do this before Amplify, Cognito, S3, DynamoDB, Bedrock, or CDK deployment.

## Step 5 — Keep Bedrock Disabled Until Needed

Do not enable or use Amazon Bedrock yet.

Bedrock comes after:

1. Auth exists.
2. S3 manual storage exists.
3. Source/citation boundaries are designed.
4. Budget alerts are working.
5. You are ready to test one tiny manual lookup workflow.

## Step 6 — First Safe Deployment Path

The first deployment should be the frontend only.

Use AWS Amplify Hosting connected to GitHub:

- Repository: `LindaData/field-copilot-pro`
- Branch: `main`
- App root: repository root
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Environment variable: `VITE_BASE_PATH=/`

This deploys the current web prototype on AWS without creating the full backend yet.

## Step 7 — Backend Deployment Comes Later

After the frontend is live on Amplify, use the backend order below:

1. Cognito auth.
2. Data-access repository abstraction in the React app.
3. DynamoDB data model.
4. AppSync or API Gateway + Lambda.
5. S3 private upload/download flow.
6. Observability and audit logging.
7. Bedrock manual lookup/RAG.

## Do Not Do Yet

- Do not enter real customer data.
- Do not create access keys for root.
- Do not enable expensive services before budget alerts.
- Do not deploy Bedrock/OpenSearch/RDS/ECS/EKS/NAT Gateway for the MVP.
- Do not put AWS secrets in `.env`, GitHub, Codex prompts, ChatGPT messages, or frontend code.

## When Account Is Ready

Tell ChatGPT/Codex only this safe information:

- AWS account exists: yes/no
- Region: usually `us-east-1`
- Budget alert created: yes/no
- Root MFA enabled: yes/no
- Admin access created: yes/no
- Amplify connected to GitHub: yes/no

Never share root password, MFA codes, access keys, secret keys, or session tokens.

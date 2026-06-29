# AWS Account Setup Checklist

## Goal

Create the AWS account foundation for Field Copilot Pro before production resources are deployed.

The repository can move forward now even though no AWS account exists yet.

## Phase 1 — Create the AWS Account

1. Open the official AWS account signup page.
2. Use a long-term email address you control.
3. Store the account login in your password manager.
4. Turn on MFA for the root user immediately.
5. Add account recovery details and alternate contacts.

Use the root user only for account-level tasks. Use IAM Identity Center for normal daily work.

## Phase 2 — Add Cost Guardrails

Create an AWS Budget before deploying anything.

Recommended starter budget:

- Monthly cost budget: `$10` while learning.
- Alerts at 50%, 80%, and 100%.
- Email alerts to the account owner.

Raise this later only after the app has a real staging deployment plan.

## Phase 3 — Enable IAM Identity Center

Use IAM Identity Center for day-to-day AWS access.

Recommended starter setup:

- Identity Center instance: organization instance if AWS offers it and you plan to grow into multiple accounts.
- User: your personal admin user.
- Group: `LindaData-Admins`.
- Permission set: administrator for initial setup only.
- Later permission sets: developer, read-only, billing, deployment.

## Phase 4 — Pick Default Region

Recommended default region for this project:

```text
us-east-1
```

Reason: most AWS services needed by the MVP are broadly available there, and it is a common default for early serverless projects.

## Phase 5 — Connect a Dev Environment

After the account exists, connect through one of these paths:

### Easiest desktop or cloud path

Use AWS CLI SSO on a laptop, Codex environment, GitHub Codespace, or Oracle VM.

```bash
aws configure sso
aws sts get-caller-identity
```

### iPhone-only path

Use the AWS Console in Safari for account setup, MFA, budgets, and Identity Center.

## Phase 6 — First Deploy Rule

Run this only after the budget and admin access are complete:

```bash
cd infra
npm install
npm run synth:dev
```

Run this only when you intentionally want to create AWS resources:

```bash
npm run deploy:dev
```

## What To Tell ChatGPT/Codex Later

Safe project details:

- AWS region, for example `us-east-1`.
- Whether IAM Identity Center is enabled.
- Whether budget alerts are configured.
- Whether AWS CLI SSO works.
- Non-private error messages.

Keep account access details and private customer HVAC data out of GitHub and chat logs.

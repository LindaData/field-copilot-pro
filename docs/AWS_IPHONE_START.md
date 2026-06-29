# iPhone-First AWS Setup Guide

## Goal

Make the first AWS setup steps possible from an iPhone while keeping infrastructure deployment in code.

## What You Can Do From iPhone

Use Safari or the AWS Console mobile app for:

1. Creating the AWS account.
2. Turning on root MFA.
3. Creating the starter AWS Budget.
4. Enabling IAM Identity Center.
5. Creating your admin user and group.
6. Checking Billing and Cost Management.
7. Reading CloudWatch alarms and logs later.

## What Should Wait For Codex, Laptop, Codespaces, or VM

Use a real terminal environment for:

1. Installing Node.js and npm packages.
2. Running AWS CLI SSO.
3. Running AWS CDK commands.
4. Running app tests and builds.
5. Deploying infrastructure.

## Recommended iPhone App Stack

- ChatGPT: project planning and code review.
- GitHub Mobile: review issues and PRs.
- AWS Console mobile app: check account, budgets, and resources.
- Apple Passwords: store account login and MFA recovery info.

## First AWS Console Tasks

### 1. Create account

Create the AWS account using a long-term email address.

### 2. Secure root user

Turn on MFA immediately.

### 3. Create budget

Create a `$10` monthly starter budget with 50%, 80%, and 100% alerts.

### 4. Enable IAM Identity Center

Create:

- Group: `LindaData-Admins`
- User: your admin user
- Permission set: administrator for initial setup

### 5. Pick region

Use:

```text
us-east-1
```

## When To Ask Codex To Continue

After the above is done, use this status message:

```text
AWS account exists. Root MFA is enabled. Budget alerts are configured. IAM Identity Center admin user is ready. Default region is us-east-1. Continue Field Copilot Pro AWS bootstrap from the repo docs without deploying production resources until I approve.
```

## Do Not Do From iPhone

- Do not manually create production app resources in the console unless the repo docs say to.
- Do not bypass CDK for permanent infrastructure.
- Do not store real customer HVAC data in the demo app.
- Do not add paid always-on services until the budget and architecture are reviewed.

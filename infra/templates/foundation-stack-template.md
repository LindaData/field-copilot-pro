# Foundation Stack Template

Create `infra/lib/foundation-stack.ts` during the CDK scaffold step.

The first stack should include:

- Cognito user pool and web app client.
- Cognito groups: owner, technician, admin, support.
- Private S3 bucket with public access blocked.
- DynamoDB table using `pk` and `sk` keys.
- CloudFormation outputs for frontend configuration.

Use `RemovalPolicy.RETAIN` for data-bearing resources during early development.

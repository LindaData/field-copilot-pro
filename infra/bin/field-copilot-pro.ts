import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import { getFieldCopilotConfig } from '../lib/config';
import { FieldCopilotProFoundationStack } from '../lib/field-copilot-pro-foundation-stack';

const app = new App();
const config = getFieldCopilotConfig(app);

const stack = new FieldCopilotProFoundationStack(app, `FieldCopilotPro-${config.stage}-Foundation`, {
  env: config.env,
  config,
});

Tags.of(stack).add('Project', 'FieldCopilotPro');
Tags.of(stack).add('Product', 'CaloosaCoolingFieldCopilot');
Tags.of(stack).add('Stage', config.stage);
Tags.of(stack).add('ManagedBy', 'AWS-CDK');

#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ShiftStormStack } from '../lib/shiftstorm-stack';

const app = new cdk.App();

new ShiftStormStack(app, 'ShiftStormStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});

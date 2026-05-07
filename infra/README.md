# ShiftStorm AWS Practice Stack (CDK)

This folder scaffolds an AWS serverless backend + static hosting for ShiftStorm:

- CloudFront + S3 for the static site
- API Gateway (HTTP API) + Lambda for a minimal JSON API
- DynamoDB for submissions + settings
- Cognito user pool (created, but auth enforcement is a follow-up step)

## Getting Started

From `infra/`:

```bash
npm i
npm run build
npm run synth
```

Deploy (requires AWS credentials configured):

```bash
npx cdk bootstrap aws://ACCOUNT_ID/us-east-2
npm run deploy
```

Recommended region for this project: `us-east-2`.

## API Endpoints (current)

- `POST /submit?orgId=default`
- `GET|PUT /settings/emails?orgId=default`
- `GET|PUT /leadership-notes?orgId=default&date=YYYY-MM-DD&shift=1st|2nd|3rd`

Auth is not enforced yet; add a JWT authorizer once Cognito groups and client flows are set up.

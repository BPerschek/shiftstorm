import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigwv2Auth from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';

export class ShiftStormStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Absolute paths from compiled dist/lib location
    const repoRoot = path.resolve(__dirname, '..', '..');
    const lambdaPath = path.join(repoRoot, 'lambda');

    // Change this if your frontend folder has another name
    const sitePath = path.join(repoRoot, 'site');

    // DynamoDB tables
    const submissions = new dynamodb.Table(this, 'ShiftSubmissions', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const settings = new dynamodb.Table(this, 'OrgSettings', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Cognito
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true
      }
    });

    // ── Cognito JWT Authorizer ──────────────────────────────────────────
    // Validates Bearer tokens issued by the Cognito User Pool.
    // Protected routes require a valid token; /submit remains open.
    const jwtAuthorizer = new apigwv2Auth.HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      }
    );

    // HTTP API
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      corsPreflight: {
        allowHeaders: ['authorization', 'content-type'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT
        ],
        allowOrigins: ['*']
      }
    });

    // Lambda API
    const apiFn = new lambda.Function(this, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      environment: {
        SUBMISSIONS_TABLE: submissions.tableName,
        SETTINGS_TABLE: settings.tableName
      },
      timeout: cdk.Duration.seconds(15)
    });

    submissions.grantReadWriteData(apiFn);
    settings.grantReadWriteData(apiFn);

    const lambdaIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      'ProxyIntegration',
      apiFn
    );

    // Open route — staff form submission, no auth required
    httpApi.addRoutes({
      path: '/submit',
      methods: [apigwv2.HttpMethod.POST],
      integration: lambdaIntegration,
    });

    // Protected routes — require valid Cognito JWT Bearer token
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: lambdaIntegration,
      authorizer: jwtAuthorizer,
    });

    // Static hosting
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');

    siteBucket.grantRead(oai);

    // ── Custom domain certificate (us-east-1, already issued) ────────────
    // ARN is stable — cert covers shiftstorm.me + www.shiftstorm.me.
    // We reference it by ARN so CDK never tries to create or destroy it.
    const siteCert = acm.Certificate.fromCertificateArn(
      this,
      'SiteCert',
      'arn:aws:acm:us-east-1:824140446439:certificate/367b8484-c8a7-407e-9d1c-0bd58afb3c93'
    );

    // ── Route53 hosted zone (already exists, reference only) ─────────────
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'ShiftstormZone',
      {
        hostedZoneId: 'Z07036261ZES0YCTD1E65',
        zoneName:     'shiftstorm.me',
      }
    );

    // ── Security response headers ──────────────────────────────────────────
    // Sends HSTS, X-Content-Type-Options, X-Frame-Options, and
    // Referrer-Policy on every CloudFront response.
    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
      },
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(siteBucket, {
          originAccessIdentity: oai
        }),
        viewerProtocolPolicy:  cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: securityHeaders,
      },
      defaultRootObject: 'index.html',
      // ── Custom domain wiring ─────────────────────────────────────────
      domainNames:  ['shiftstorm.me', 'www.shiftstorm.me'],
      certificate:  siteCert,
    });

    // ── Route53 DNS records ───────────────────────────────────────────────
    // Apex A alias → CloudFront (replaces GitHub Pages 185.199.x.x records)
    new route53.ARecord(this, 'ApexAlias', {
      zone:       hostedZone,
      recordName: 'shiftstorm.me',
      target:     route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(distribution)
      ),
    });

    // www CNAME alias → CloudFront (replaces bperschek.github.io)
    new route53.ARecord(this, 'WwwAlias', {
      zone:       hostedZone,
      recordName: 'www',
      target:     route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(distribution)
      ),
    });

    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.asset(sitePath)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*']
    });

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${distribution.domainName}`
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId
    });
  }
}
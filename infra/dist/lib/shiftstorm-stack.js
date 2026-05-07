"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftStormStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const apigwv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const apigwv2Integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
class ShiftStormStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        httpApi.addRoutes({
            path: '/{proxy+}',
            methods: [apigwv2.HttpMethod.ANY],
            integration: new apigwv2Integrations.HttpLambdaIntegration('ProxyIntegration', apiFn)
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
        const distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(siteBucket, {
                    originAccessIdentity: oai
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            },
            defaultRootObject: 'index.html'
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
exports.ShiftStormStack = ShiftStormStack;

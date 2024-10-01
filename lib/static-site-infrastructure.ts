import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs"
import {
  NsRecord,
  ARecord,
  HostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53"
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager"
import {
  CachePolicy,
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront"
import { BlockPublicAccess, Bucket, BucketPolicy } from "aws-cdk-lib/aws-s3"
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets"
import { S3StaticWebsiteOrigin } from "aws-cdk-lib/aws-cloudfront-origins"
import { Artifact } from "aws-cdk-lib/aws-codepipeline"
import { AnyPrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam"

interface InfrastructureProps extends StackProps {
  environment: string
  domainName: string
  owner: string
}

export class StaticSiteInfrastructure extends Stack {
  sourceOutput = new Artifact("sourceOutput")
  buildOutput = new Artifact("buildOutput")
  sourceBucket: Bucket
  deployBucket: Bucket

  constructor(scope: Construct, id: string, props: InfrastructureProps) {
    super(scope, id, props)

    const { environment, domainName, owner } = props

    const hostedZone = new HostedZone(this, "HostedZone", {
      zoneName: domainName,
    })

    const certificate = new Certificate(this, "Certificate", {
      domainName,
      validation: CertificateValidation.fromDns(hostedZone),
    })

    const originAccessIdentity = new OriginAccessIdentity(
      this,
      "OriginAccessIdentity"
    )

    this.sourceBucket = new Bucket(this, "SourceBucket", {
      bucketName:
        `${owner}-${environment}-codepipeline-source-bucket`.toLowerCase(),
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    this.deployBucket = new Bucket(
      this,
      `${environment}-FrontendDeployBucket`,
      {
        bucketName: `${owner}-${environment}-frontend-deploy-bucket`,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        websiteIndexDocument: "index.html",
        websiteErrorDocument: "error.html",
        publicReadAccess: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      }
    )
    this.deployBucket.grantRead(originAccessIdentity)

    const bucketPolicy = new BucketPolicy(this, "BucketPolicy", {
      bucket: this.deployBucket,
    })

    bucketPolicy.document.addStatements(
      new PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [`${this.deployBucket.bucketArn}/*`],
        principals: [new AnyPrincipal()],
      })
    )

    const distribution = new Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: new S3StaticWebsiteOrigin(this.deployBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      domainNames: [domainName],
      certificate,
    })

    const aRecord = new ARecord(this, "ARecord", {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    })

    // If the environment is prod, add NS records for the dev environment
    // if (environment === "prod") {
    //   const devHostedZone = HostedZone.fromLookup(this, "DevHostedZone", {
    //     domainName: `dev.${domainName}`,
    //   })

    //   // Fetch the NS records from the dev hosted zone
    //   const devNsRecords = devHostedZone.hostedZoneNameServers

    //   // Add NS records to the prod hosted zone
    //   new NsRecord(this, "DevNsRecord", {
    //     zone: hostedZone,
    //     recordName: `dev.${domainName}`,
    //     values: devNsRecords || [],
    //   })
    // }
  }
}

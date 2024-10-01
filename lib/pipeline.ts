import { Stack, StackProps, SecretValue } from "aws-cdk-lib"
import { StaticSiteInfrastructure } from "./static-site-infrastructure"
import {
  Role,
  CompositePrincipal,
  ServicePrincipal,
  PolicyStatement,
  PolicyDocument,
} from "aws-cdk-lib/aws-iam"
import { Pipeline as CodePipeline } from "aws-cdk-lib/aws-codepipeline"
import { Construct } from "constructs"
import {
  S3DeployAction,
  CodeBuildAction,
  GitHubSourceAction,
} from "aws-cdk-lib/aws-codepipeline-actions"
import {
  BuildSpec,
  Cache,
  LinuxBuildImage,
  LocalCacheMode,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild"

interface PipelineProps extends StackProps {
  environment: string
  repo: string
  branch: string
  owner: string
  infrustructure: StaticSiteInfrastructure
}

export class Pipeline extends Stack {
  constructor(scope: Construct, id: string, props: PipelineProps) {
    super(scope, id, props)

    const { environment, repo, branch, owner, infrustructure } = props

    const githubToken = SecretValue.secretsManager("github-token")

    const pipelineRole = new Role(this, "PipelineRole", {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("codebuild.amazonaws.com"),
        new ServicePrincipal("codepipeline.amazonaws.com")
      ),
      inlinePolicies: {
        CdkDeployPermissions: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ["sts:AssumeRole"],
              resources: ["arn:aws:iam::*:role/cdk-*"],
            }),
          ],
        }),
      },
    })

    new PipelineProject(this, "sourceProject", {
      environment: {
        buildImage: LinuxBuildImage.AMAZON_LINUX_2_5,
      },
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": {
              nodejs: "20.x",
            },
            commands: ["npm install"],
          },
          build: {
            commands: ["echo Building Frontend", "npm run build"],
          },
        },
        artifacts: {
          "base-directory": "dist",
          files: "**/*",
        },
      }),
      cache: Cache.local(LocalCacheMode.CUSTOM),
    })

    const pipeline = new CodePipeline(this, "CIPipeline", {
      pipelineName: `${environment}-pipeline`,
      role: pipelineRole,
      artifactBucket: infrustructure.sourceBucket,
      stages: [
        {
          stageName: "Source",
          actions: [
            new GitHubSourceAction({
              actionName: "GitHubSource",
              owner,
              repo,
              branch,
              oauthToken: githubToken,
              output: infrustructure.sourceOutput,
            }),
          ],
        },
        {
          stageName: "Build",
          actions: [
            new CodeBuildAction({
              actionName: "Build",
              project: new PipelineProject(
                this,
                `${environment}-sourceProject`,
                {
                  environment: {
                    buildImage: LinuxBuildImage.AMAZON_LINUX_2_5,
                  },
                  buildSpec: BuildSpec.fromObject({
                    version: "0.2",
                    phases: {
                      install: {
                        "runtime-versions": {
                          nodejs: "20.x",
                        },
                        commands: ["npm install"],
                      },
                      build: {
                        commands: ["echo Building Frontend", "npm run build"],
                      },
                    },
                    artifacts: {
                      "base-directory": "dist",
                      files: "**/*",
                    },
                  }),
                  cache: Cache.local(LocalCacheMode.CUSTOM),
                }
              ),
              input: infrustructure.sourceOutput,
              outputs: [infrustructure.buildOutput],
            }),
          ],
        },
        {
          stageName: "Deploy",
          actions: [
            new S3DeployAction({
              actionName: `${environment}-DeployFrontend`,
              bucket: infrustructure.deployBucket,
              input: infrustructure.buildOutput,
              extract: true,
            }),
          ],
        },
      ],
    })
  }
}

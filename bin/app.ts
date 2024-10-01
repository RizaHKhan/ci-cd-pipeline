#!/usr/bin/env node
import "source-map-support/register"
import { App } from "aws-cdk-lib"
import { Pipeline } from "../lib/pipeline"
import { StaticSiteInfrastructure } from "../lib/static-site-infrastructure"

const app = new App()
const env: { account?: string; region: string } = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
}
const repo: string = app.node.tryGetContext("repo")
const owner: string = app.node.tryGetContext("owner")
const domain: string = app.node.tryGetContext("domain")
interface EnvironmentConfig {
  [key: string]: {
    subdomain: string
    branch: string
  }
}

const environments: EnvironmentConfig = app.node.tryGetContext("environments")
const userSuppliedEnv: string = app.node.tryGetContext("env")

if (!Object.keys(environments).includes(userSuppliedEnv)) {
  throw new Error("Please provide a valid environment")
}

const { branch, subdomain } = environments[userSuppliedEnv]

const domainName: string = `${subdomain}${domain}`

const infrustructure = new StaticSiteInfrastructure(
  app,
  `${userSuppliedEnv}-StaticSiteInfrastructure`,
  {
    environment: branch,
    domainName,
    owner,
    env,
  }
)

new Pipeline(app, `${userSuppliedEnv}-Pipeline`, {
  environment: userSuppliedEnv,
  repo,
  branch,
  owner,
  infrustructure,
  env,
})

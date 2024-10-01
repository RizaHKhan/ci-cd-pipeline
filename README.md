# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

## Development

### Checklist

What are the things we need for a website?

1. Repository(in Github)
   - Name of the respository
   - Owner of the repository
2. We need a domain purchased from a third party vendor (ie, GoDaddy)

### Code

#### Infrastructure

1. Need a hosted zone
   - DNS Records that define how to route traffic for a domain and its subdomains
2. Need a certificate
   - Encrypts data between the browser and the webserver
   - Verified the identity of the website. Prevents man-in-the-middle attacks
   - Enabled HTTPS which is a secure version of HTTP
3. Need originAccessIdentity
   - Only allow access to Cloudfront for this S3 bucket
   - Secure Content Delivery: Ensures that content is delivered security though Cloudfront
4. A source bucket
5. A distribution
6. "ARecord"

#### Pipeline

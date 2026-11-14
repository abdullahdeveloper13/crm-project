---
name: vercel-deployment
description: Deploy existing web projects to Vercel, configure project settings, diagnose build failures, manage environment variables safely, and verify production deployments. Use whenever the user asks to deploy, redeploy, publish, or troubleshoot a Vercel deployment.
---

# Vercel Deployment Skill

You are an experienced Vercel deployment engineer.

Your responsibility is to deploy the user's existing project reliably without damaging its configuration or source code.

## 1. Inspect the project

Before deployment:

- Inspect the current working directory.
- Read package.json and identify the package manager.
- Detect the framework and its version.
- Inspect the existing build scripts.
- Identify the correct project root directory.
- Inspect existing vercel.json, if present.
- Check for existing Git configuration.
- Identify existing Vercel project linkage.
- Never assume the framework is Next.js.

Supported frameworks include:
- Next.js
- React
- Vite
- TanStack Start
- Astro
- Nuxt
- SvelteKit
- Other Vercel-supported frameworks.

## 2. Check Vercel CLI

Check whether Vercel CLI is installed:

vercel --version

If unavailable, explain and install it using:

npm install -g vercel

Check authentication:

vercel whoami

If authentication is missing, ask the user to authenticate using:

vercel login

Never request passwords, access tokens, or private credentials in chat.

## 3. Project linking

Check whether the project is already linked.

Inspect:
.vercel/project.json

If linked:
- Verify that the linked project is the intended project.
- Preserve the existing project association.
- Do not relink unnecessarily.

If not linked:
- List accessible projects when possible.
- Ask the user which existing Vercel project to use.
- Use vercel link.
- Do not create a new project unless explicitly requested.

Never overwrite an existing project's association without confirmation.

## 4. Framework configuration

Determine the correct settings from the actual project.

Check:
- Framework Preset
- Root Directory
- Install Command
- Build Command
- Output Directory
- Node.js compatibility
- Build configuration

Do not blindly use Next.js settings for Vite or TanStack Start.

Use framework-specific Vercel documentation when configuration is uncertain.

Do not invent output directories or build commands.

If configuration is incorrect, explain the proposed change before modifying production settings.

## 5. Environment variables

Inspect which environment variables the application expects.

- Identify required variables from source code and configuration.
- Check whether required variables exist in Vercel environments.
- Distinguish Development, Preview and Production variables.
- Never print secret values.
- Never commit .env files.
- Never expose API keys or credentials in logs.
- Do not delete or overwrite existing environment variables without permission.

If variables are missing, explain which variable names need configuring and where.

## 6. Pre-deployment validation

Before deploying:

1. Install dependencies using the existing package manager.
2. Run the production build.
3. Inspect TypeScript errors.
4. Inspect framework-specific build errors.
5. Check missing environment variables.
6. Fix deployment-related problems where safe.
7. Preserve existing application functionality.

Do not deploy a known broken production build.

Do not make unrelated UI or backend changes.

## 7. Deployment

Determine deployment intent.

For preview deployment:

vercel

For production deployment:

vercel --prod

Use the intended existing Vercel project and correct working directory.

Production deployment must only happen when the user has requested production deployment.

Do not claim deployment success based only on a successful CLI command initiation.

## 8. Verify deployment

After deployment:

- Capture the deployment URL.
- Check the deployment status.
- Inspect build logs if deployment fails.
- Verify the deployment is ready.
- Check the deployed website when possible.
- Report any remaining errors.

Use appropriate commands such as:

vercel inspect DEPLOYMENT_URL
vercel logs DEPLOYMENT_URL

Never invent a deployment URL or claim that a deployment is live without verification.

## 9. Error diagnosis

When deployment fails, investigate the actual error.

Common issues:

- Incorrect framework preset
- Incorrect root directory
- Incorrect build command
- Incorrect output directory
- Missing environment variables
- Dependency conflicts
- Node.js version incompatibility
- TypeScript errors
- Incorrect routing configuration
- Serverless function errors
- Invalid Vercel project linkage

Fix the underlying issue rather than randomly changing configuration.

Do not repeatedly redeploy without understanding the failure.

## 10. Custom domains

When requested:

- Inspect existing domain configuration.
- Check DNS records.
- Explain apex and www domain configuration.
- Check domain verification.
- Preserve existing DNS records unless changes are authorized.
- Never invent DNS record values.
- Verify the final domain configuration.

## 11. Final deployment report

Always provide:

- Project name
- Detected framework
- Vercel project used
- Deployment type (Preview or Production)
- Deployment URL
- Build status
- Deployment status
- Any remaining issues

Clearly distinguish successful deployment from successful build.

## Important safety rules

- Never delete the .vercel directory without permission.
- Never unlink an existing project without permission.
- Never overwrite environment variables without permission.
- Never change DNS records without permission.
- Never expose secrets.
- Never create duplicate Vercel projects unnecessarily.
- Never make unrelated source-code changes.
- Preserve the existing application architecture.
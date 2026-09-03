# Scheduled Vercel Redeployments and Multimodal Warm-ups

QCX now includes a GitHub Actions workflow at `.github/workflows/scheduled-redeploy-warmup.yml`. The workflow runs once per day at **04:17 UTC** and can also be started manually from the repository’s Actions page.

| Stage | Behavior | Side effects |
| --- | --- | --- |
| Redeployment | Creates an empty commit on `main`, which triggers the existing Git-connected Vercel production deployment for the qcx project. | Adds one clearly labeled maintenance commit per run. |
| Deployment URL lookup | Reads the successful Vercel production deployment status associated with the maintenance commit and uses its deployment-specific URL. | Read-only GitHub API requests. |
| Readiness check | Polls the deployment URL’s `/api/health` endpoint for up to five minutes, using Vercel’s automation-bypass header. | Read-only HTTP requests. |
| Multimodal warm-up | Calls the deployment URL’s `/api/warmup` endpoint for `image`, `vision`, `document`, and `video`. | Read-only runtime warm-up; no model inference, provider request, database write, or user record is created. |

## Required Vercel access configuration

The qcx Vercel project currently uses Deployment Protection, so the workflow requires a Vercel **Protection Bypass for Automation** secret. Create the secret in the qcx project, then add the same value to the GitHub repository as an Actions secret named `VERCEL_AUTOMATION_BYPASS_SECRET`. The workflow sends it in the `x-vercel-protection-bypass` header, as documented in [Vercel’s official automation-bypass guide](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation). Do not place this value in source control, workflow YAML, or a URL.

The warm-up endpoint is intentionally safe without an application secret because it performs no external provider calls and has no side effects. To add defense in depth, add a repository Actions secret named `QCX_WARMUP_TOKEN` and configure the same value as the `QCX_WARMUP_TOKEN` environment variable in the Vercel production environment. The workflow will then send the token as a bearer credential, while unauthorized requests receive HTTP 401.

The endpoint accepts one or more `feature` query parameters from this allowlist: `image`, `vision`, `document`, and `video`. With no parameter, it reports all supported feature families. For example:

```text
GET /api/warmup?feature=image&feature=vision
```

## Operational notes

GitHub Actions cron expressions are interpreted in UTC. GitHub may delay scheduled jobs during periods of high load, and scheduled workflows can be disabled by GitHub after extended repository inactivity. The workflow uses a concurrency lock so a manual run cannot overlap a scheduled production redeployment.

This workflow assumes that the Vercel project remains connected to `QueueLab/QCX`, uses `main` as its production branch, and creates a GitHub deployment status with a successful Vercel production target URL. It does not depend on a fixed custom domain or deployment alias.

The warm-up is deliberately limited to **serverless runtime readiness**. It does not invoke image or vision models, upload files, query geospatial providers, or exercise authenticated user flows. Those operations can incur provider charges or require user credentials and should be tested separately in a controlled health-check or staging workflow.

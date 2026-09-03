# Scheduled Vercel Redeployments and Multimodal Warm-ups

QCX now includes a GitHub Actions workflow at `.github/workflows/scheduled-redeploy-warmup.yml`. The workflow runs once per day at **04:17 UTC** and can also be started manually from the repository’s Actions page.

| Stage | Behavior | Side effects |
| --- | --- | --- |
| Redeployment | Creates an empty commit on `main`, which triggers the existing Git-connected Vercel production deployment for the QCX project. | Adds one clearly labeled maintenance commit per run. |
| Readiness check | Polls `https://www.queue.cx/api/health` for up to five minutes. | Read-only HTTP requests. |
| Multimodal warm-up | Calls `/api/warmup` for `image`, `vision`, `document`, and `video`. | Read-only runtime warm-up; no model inference, provider request, database write, or user record is created. |

## Optional endpoint protection

The warm-up endpoint is intentionally safe without a secret because it performs no external provider calls and has no side effects. To restrict it, add a repository Actions secret named `QCX_WARMUP_TOKEN` and configure the same value as the `QCX_WARMUP_TOKEN` environment variable in the Vercel production environment. The workflow will then send the token as a bearer credential, while unauthorized requests receive HTTP 401.

The endpoint accepts one or more `feature` query parameters from this allowlist: `image`, `vision`, `document`, and `video`. With no parameter, it reports all supported feature families. For example:

```text
GET /api/warmup?feature=image&feature=vision
```

## Operational notes

GitHub Actions cron expressions are interpreted in UTC. GitHub may delay scheduled jobs during periods of high load, and scheduled workflows can be disabled by GitHub after extended repository inactivity. The workflow uses a concurrency lock so a manual run cannot overlap a scheduled production redeployment.

This workflow assumes that the Vercel project remains connected to `QueueLab/QCX`, uses `main` as its production branch, and serves the production domain at `https://www.queue.cx`. If the production domain changes, update the `QCX_URL` value in the workflow before enabling the schedule.

The warm-up is deliberately limited to **serverless runtime readiness**. It does not invoke image or vision models, upload files, query geospatial providers, or exercise authenticated user flows. Those operations can incur provider charges or require user credentials and should be tested separately in a controlled health-check or staging workflow.

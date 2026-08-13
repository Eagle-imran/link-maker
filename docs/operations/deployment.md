# Vercel deployment

## Prerequisites

- Access to the GitHub repository and Vercel project
- An Upstash Redis database for tracked links
- A preview deployment for validation

## Initial deployment

1. Import `Eagle-imran/link-maker` into Vercel.
2. Use the repository root as the project root.
3. Keep the detected Next.js framework settings unless the project layout has
   changed.
4. Provision Upstash Redis through Vercel Marketplace or use an existing
   Upstash database.
5. Configure one supported Redis variable pair for Preview and Production.
6. Deploy a preview.
7. Complete the smoke checks below before promoting the same commit.

Direct links deploy without Redis, but tracked creation, redirect resolution,
and stats do not function without it.

## Preview smoke checks

- Home page loads without console or server errors.
- Supported video and channel inputs generate the expected direct routes.
- Invalid and non-YouTube inputs are rejected.
- Direct routes reach the correct YouTube target.
- Tracked creation returns a short URL and a private stats URL.
- Opening the short URL increments total, UTC-day, and device counters.
- A missing or incorrect stats key shows generic not-found content.
- The compatibility matrix passes for any redirect behavior change.
- `npm test` and `npm run build` passed on the deployed commit.

## Production release

1. Confirm Preview and Production use the intended Redis database. Do not
   assume Marketplace variables were copied across environments.
2. Promote or deploy the exact reviewed commit.
3. Repeat a minimal direct and tracked smoke test against production.
4. Record user-visible changes and compatibility results in `CHANGELOG.md`.
5. Monitor API failures and Redis health after release.

## Rollback

Use Vercel's deployment history to promote the previous known-good deployment.
Application rollback does not revert Redis data. Avoid changing the stored-link
schema without a backward-compatible read path or a separate migration plan.

## Secrets

- Store Redis tokens only in Vercel environment variables or `.env.local`.
- Rotate a token immediately if it appears in source control or logs.
- Treat full stats URLs as credentials even though they are not deployment
  secrets.

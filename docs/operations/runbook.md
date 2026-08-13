# Production runbook

## Service objectives

The application has no formal SLO yet. Operationally, prioritize correct and
fast viewer redirects over analytics completeness. A counting failure must not
prevent a valid tracked link from redirecting once its target has been resolved.

## Monitor

At minimum, observe:

- Vercel function errors and latency for `/api/links`, `/s/*`, and stats pages
- Counts of API `429` and `503` responses
- Upstash availability, command errors, storage, and request limits
- Tracked-link creation success
- Redirect smoke checks from representative mobile clients

Do not log request bodies, Redis tokens, raw stats keys, or full stats URLs.

## Redis outage

Expected impact:

- Direct `/v/` and `/c/` links continue working.
- New tracked-link creation returns `503`.
- Existing `/s/` links show the safe fallback because their targets cannot be
  resolved.
- Stats are unavailable.

Response:

1. Check Upstash status and Vercel environment variables.
2. Confirm whether failures affect Preview, Production, or both.
3. Avoid redeploying unchanged application code solely to recover an external
   Redis outage.
4. Restore the correct credentials or service.
5. Verify one existing tracked link and its stats page.

## Elevated API 429 responses

Check for abusive or automated creation traffic. The limit is fixed at 20
attempts per first forwarded IP per hour. Shared networks can legitimately
group many creators under one address. Do not disable the limit without
assessing Redis costs and abuse exposure.

## Elevated API 503 responses

Check Redis connectivity and quotas first. If Redis is healthy, inspect logs for
link allocation errors. Preserve the untracked-link path as the user-facing
fallback.

## Incorrect redirect destination

1. Capture only a non-sensitive failing input and generated direct route.
2. Reproduce using the corresponding route test.
3. Verify strict identifier validation before altering URL construction.
4. Test Android, iOS, desktop, and fallback behavior on Preview.
5. Roll back if a recent release affects established link formats.

## Disclosed stats URL

There is currently no key rotation or server-side deletion interface. Treat the
incident as a known product limitation, avoid sharing the URL further, and
decide whether targeted Redis deletion is warranted. Any manual deletion must
resolve and back up the exact `link:{code}` and `clicks:{code}` keys before
change and requires explicit operator authorization.

## Post-incident record

Document timeline, impact, root cause, remediation, and follow-up work without
including secrets, private stats URLs, IP addresses, or visitor data.

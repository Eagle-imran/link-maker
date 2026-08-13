# Troubleshooting

## Tracked creation returns 503

Confirm that one complete Redis variable pair is present in `.env.local`, then
restart the development server. Ensure the URL and token belong to the same
Upstash database.

Direct links remain available while tracking is unavailable.

## A tracked link shows the fallback page

Possible causes:

- The code does not exist or is malformed.
- Redis credentials point to a different database.
- Redis is unavailable.
- The stored record is malformed.

Check application and Redis service logs without printing the stored stats key
or full stats URL.

## Stats show “not found”

Open the full URL created with the link, including `?key=...`. A missing,
incorrect, lost, or disclosed key cannot currently be recovered or rotated.

## Stats are temporarily unavailable

The link record and key were accepted, but reading its counter hash failed.
Retry after checking Redis health and credentials.

## Stats totals disagree with breakdowns

Total, daily, and device counters are independent increments. A partial Redis
failure can update only part of a click. Counts are intentionally best-effort.

## A mobile link stays in the embedded browser

The host app may block intents or custom URL schemes. Test the visible manual
link, confirm the YouTube app is installed, and record the device/OS/host-app
versions. Do not change user-agent logic based on one device without running the
compatibility matrix.

## Clipboard copy fails

The UI first uses the Clipboard API and then a legacy textarea fallback.
Restricted or insecure browser contexts can block both. Select and copy the URL
manually.

## Build reports the wrong workspace root

The repository sets `outputFileTracingRoot` in `next.config.ts`. If the warning
returns, confirm that the config is loaded and inspect for additional lockfiles
or a changed monorepo layout before altering the tracing root.

## Port 3000 is already in use

Stop the other development server or start Next.js on another port:

```bash
npm run dev -- --port 3001
```

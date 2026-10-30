# Development

## Setup

```bash
nvm use        # Node 20, from .nvmrc
npm ci         # exact versions from package-lock.json
cp .env.example .env.local
npm run dev    # http://localhost:3000
```

Direct links work without Redis. For tracked links, create an Upstash Redis
database, add one credential pair to `.env.local` (see
[Configuration](api.md#configuration)) and restart the dev server.

Stop `npm run dev` before running `npm run build`. Running both at once
corrupts the `.next` folder.

## Layout

```text
app/     pages and route handlers
lib/     link parsing, redirect page, tracked links, Redis
tests/   Vitest tests and the in-memory FakeRedis
docs/    these docs
```

## Tests

`npm test` runs everything with no network or Redis needed. CI runs
`docs:check`, `test` and `build` on every pull request and push to `main`.

| File | Covers |
| --- | --- |
| `tests/youtube.test.ts` | Which links are accepted, and the web, iOS and Android URLs built from them |
| `tests/redirect-page.test.ts` | The redirect page's HTML, size, headers, and where its script sends each device |
| `tests/direct-routes.test.ts` | `/v/` and `/c/` |
| `tests/links.test.ts` | Codes, click counting, rate limit, device detection, chart data |
| `tests/tracked-routes.test.ts` | `POST /api/links`, `/s/{code}` and the stats page |

Use `FakeRedis` with `setRedisForTesting()`, and reset it in `afterEach`. Never
point tests at a real database.

Tests can't prove the YouTube app actually opens. Changes to the redirect page
also need the device checks in [Operations](operations.md#before-releasing-a-redirect-change).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Creating a tracked link fails | Check that `.env.local` has one complete Redis pair from the same database, then restart the dev server |
| A tracked link shows "This link isn't valid." | The code doesn't exist, Redis points at a different database, or Redis is down |
| "No stats found" | Open the full stats link, including `?key=…` |
| "Stats are unavailable" | The key was right but reading the counts failed. Check Redis |
| Total doesn't match the breakdowns | Expected after a partial Redis failure. See [trade-offs](how-it-works.md#known-trade-offs) |
| Link stays in Instagram's browser | The host app may block app links. Try the manual link and note device, OS and app versions |
| Copy button does nothing | Some in-app browsers block the clipboard. Copy the link by hand |
| Port 3000 is busy | `npm run dev -- --port 3001` |

# Testing

## Automated checks

Run the Vitest suite:

```bash
npm test
```

The suite runs in a Node environment and uses `tests/fake-redis.ts`; it does not
need credentials or network access.

Current coverage areas:

- Accepted and rejected YouTube URL forms
- Exact HTTPS, Android intent, and iOS destination construction
- Redirect HTML, metadata, fallback, and response headers
- Direct video and channel route behavior
- Code generation, collision retry, aggregate counting, and rate limiting
- Tracked-link creation and resolution
- Stats-key authorization and Redis failure states

Run a production build to type-check and validate Next.js rendering boundaries:

```bash
npm run build
```

## Adding tests

- Parser or destination changes belong in `tests/youtube.test.ts`.
- Redirect document or header changes belong in
  `tests/redirect-page.test.ts`.
- Direct route behavior belongs in `tests/routes.test.ts`.
- Redis-independent link behavior belongs in `tests/links.test.ts`.
- API, tracked route, and stats page behavior belongs in
  `tests/short-routes.test.ts`.

Tests should use `FakeRedis` and restore any injected test client in
`afterEach`. Do not connect automated tests to a real Redis database.

## Manual checks

Automated tests cannot simulate operating-system app handoff. Redirect changes
must also complete the [browser compatibility matrix](../product/browser-compatibility.md)
on a preview deployment.

At minimum, verify:

- iOS app handoff and timed web fallback
- Android intent and web fallback
- Manual link when automatic navigation is restricted
- Video, channel, channel subscription, and tracked paths
- Social preview metadata for both video and channel links
- Stats increment after a tracked redirect

## Test limitations

Route tests invoke handlers directly. Framework routing behavior, Vercel proxy
headers, edge caching, `after()` scheduling, and external YouTube app behavior
require integration or deployment testing.

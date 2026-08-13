# Architecture overview

Link Maker is a Next.js App Router application deployed on Vercel. Direct
redirects deliberately avoid React rendering; tracked redirects add Redis
resolution and best-effort counting.

## Components

| Component | Location | Responsibility |
| --- | --- | --- |
| Generator UI | `app/page.tsx` | Parse input, generate direct links, request tracked links, maintain the browser-local list |
| YouTube URL module | `lib/youtube.ts` | Validate inputs and build HTTPS, iOS, and Android destination URLs |
| Redirect renderer | `lib/redirect-page.ts` | Produce minimal HTML, metadata, app-handoff script, and security/cache headers |
| Direct routes | `app/v/`, `app/c/` | Validate path input and serve cacheable redirect HTML |
| Link API | `app/api/links/route.ts` | Validate input, rate-limit creation, and persist tracked links |
| Tracked route | `app/s/[code]/route.ts` | Resolve a code, schedule click counting, and serve uncached redirect HTML |
| Stats page | `app/s/[code]/stats/page.tsx` | Authorize with the stats key and render aggregate counts |
| Link service | `lib/links.ts` | Generate identifiers, operate on Redis keys, classify devices, and construct chart data |
| Redis adapter | `lib/redis.ts` | Normalize Upstash Redis behavior behind the testable `RedisLike` interface |

## Request paths

```text
Creator -> Generator UI -> direct /v or /c URL
                       \-> POST /api/links -> Redis -> tracked /s URL + stats URL

Viewer  -> /v or /c -> cached redirect HTML -> YouTube app/web
Viewer  -> /s/code -> Redis lookup -> deferred counters -> redirect HTML -> YouTube app/web
Creator -> /s/code/stats?key=... -> Redis -> server-rendered aggregate stats
```

## Design properties

- **Redirect speed:** direct routes return small handwritten HTML and can be
  cached at the edge for one year; browsers cache them for one hour.
- **Safe destinations:** target identifiers are strictly validated and
  interpolated only into fixed YouTube URL patterns, preventing use as an open
  redirector.
- **Graceful degradation:** invalid direct links and unavailable tracked links
  return a safe fallback page. Counting failures do not block a valid redirect.
- **Optional state:** direct routes require no database. Redis is needed only
  for creating, resolving, and viewing tracked links.
- **Credentialed stats:** a random query-string key is the sole authorization
  mechanism for a stats page; there are no user accounts.

## Runtime and rendering

The home page is statically generated and hydrated as a React client component.
Route handlers run on demand. The stats page is forced dynamic so each request
reads current Redis data. No runtime is explicitly selected, so deployment uses
the Next.js/Vercel default compatible with the Node APIs used for random bytes.

## Known consistency trade-offs

Click totals, daily counts, and device counts are three independent Redis
increments. A partial Redis failure can make the aggregates disagree. Link
creation rate limiting uses separate `INCR` and `EXPIRE` operations; a failure
between them could leave an IP counter without a TTL. These counters are
operational analytics, not financial or security records.

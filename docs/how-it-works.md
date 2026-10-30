# How it works

## The pieces

| File | Job |
| --- | --- |
| `app/page.tsx` | The homepage: parses the pasted link, builds direct links, requests tracked links |
| `app/_home/` | Homepage pieces: the link result with its QR code (made in the browser), Share and Try it, **Your links** and its `localStorage` store, the copy button, the page sections and the sponsor tiles (off unless `NEXT_PUBLIC_SPONSORS=on`) |
| `app/site-analytics.tsx` | Vercel Web Analytics for the site's pages, skipping stats pages |
| `lib/youtube.ts` | Validates YouTube links and builds the web, iOS and Android destination URLs |
| `lib/redirect-page.ts` | Builds the tiny redirect page and its headers |
| `app/v/`, `app/c/` | Direct video and channel links |
| `app/api/links/route.ts` | Creates tracked links |
| `app/s/[code]/route.ts` | Opens a tracked link and counts the click |
| `app/s/[code]/stats/page.tsx` | The private stats page |
| `lib/links.ts` | Codes, stats keys, click counts, rate limit, device detection |
| `lib/redis.ts` | Connects to Upstash Redis behind a small `RedisLike` interface that tests replace with `tests/fake-redis.ts` |

## Opening a link

Every link (`/v/`, `/c/` or `/s/`) returns the same ~1.6 KB HTML page. It shows
"Opening YouTube…" with a manual link, and a short inline script picks where
to go:

| Device | Tries | Falls back to |
| --- | --- | --- |
| Android | An `intent://` URL for the YouTube app | youtube.com (built into the intent) |
| iPhone, iPad, iPod | `vnd.youtube://` | youtube.com after about 1.5 seconds, unless the page was hidden because the app opened |
| iPad showing the desktop site | Same as iPhone | Same as iPhone |
| Anything else | youtube.com | |

Since iPadOS 13, Safari tells sites it's a Mac. The script treats a "Mac" that
reports touch points (`navigator.maxTouchPoints > 1`) as an iPad. Real Macs
report zero.

The page also has Open Graph tags, so chat apps show a preview: the video
thumbnail for videos, and for `@handle` channels a card from `/og?c=@handle`
with the handle on it (`lib/og-card.tsx`). The homepage's own share image is
`app/opengraph-image.tsx`. Invalid links get a fallback page that links to youtube.com, with
HTTP `200`.

Destinations are always built from a validated ID dropped into a fixed YouTube
URL, so ytopen can't be used to redirect anywhere else.

## Direct links: `/v/` and `/c/`

Channel handles get the shorter `/@handle`, which `next.config.ts` rewrites to
`/c/@handle`. Channel IDs (`UC…`) keep the `/c/` prefix, and older `/c/@handle`
links keep working.

Nothing is stored and nothing is counted. Because the page for a given ID never
changes, it's cached for a year on Vercel's edge and an hour in browsers. A new
deployment starts with a fresh edge cache.

## Tracked links: `/s/{code}`

1. `POST /api/links` checks the link, applies the rate limit (20 per IP per
   hour), and saves the target under a random 8-character code with a random
   16-character stats key.
2. Opening `/s/{code}` looks up the code, counts the click after the response
   is sent (Next.js `after()`), and returns the redirect page with
   `Cache-Control: no-store` so every click reaches the server.
3. `/s/{code}/stats?key=…` shows the counts only if the key matches. A wrong key
   and a missing code show the same "No stats found" page.

If Redis is down, tracked links show the fallback page, and link creation
returns `503`. Direct links keep working.

### What's in Redis

```text
link:{code}      JSON: { kind, id, sub, statsKey, createdAt }   no expiry
clicks:{code}    hash: total, d:{YYYY-MM-DD}, dev:android, dev:ios, dev:desktop   no expiry
ratelimit:{ip}   counter, expires after one hour
```

Days are in UTC. The stats page shows the last 30 days; older days stay stored.
The server sorts devices by User-Agent, so iPads showing the desktop site count
as desktop.

## Design decisions

- **Handwritten redirect page, not React.** Speed matters most on the viewer's
  path, and React would add JavaScript without helping the handoff. The cost is
  that the page's HTML must be escaped and validated by hand, and handoff needs
  real-device testing.
- **Tracking is optional.** Direct links stay stateless and cacheable, so they
  never depend on Redis. Only `/s/` links need it.
- **Stats behind a secret link, not accounts.** There are no user accounts, and
  stats shouldn't be public. The cost is that a lost key can't be recovered and
  a leaked key can't be revoked.

## Known trade-offs

- A click updates three counters separately, so a partial Redis failure can make
  the total and the breakdowns disagree. Counts are best-effort.
- The rate limiter increments and sets the expiry in two steps. A failure in
  between can leave a counter with no expiry.
- Links and click counts never expire, and the app can't edit, delete or revoke
  them.

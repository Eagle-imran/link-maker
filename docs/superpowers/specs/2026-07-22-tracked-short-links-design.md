# Tracked Short Links (`/s/`) — Design Spec

**Date:** 2026-07-22
**Status:** Approved
**Builds on:** `2026-07-22-link-maker-design.md`

## Purpose

Opt-in click analytics for smart links — the monetization foundation. A "Track
clicks" toggle in the generator produces an `/s/{code}` short link plus a
private stats URL showing total clicks, a 30-day daily chart, and a
device/OS split. No accounts: the stats URL's secret key is the credential,
and the browser's localStorage keeps a convenience list of links you created.

The existing `/v/` and `/c/` routes are unchanged. `/s/` resolves a code,
counts the click without delaying the visitor, and serves the same redirect
page those routes use.

## Decisions (made during brainstorming)

- **Stats access:** secret stats URL (`/s/{code}/stats?key={statsKey}`), plus
  localStorage "My links" list for intuitiveness. No accounts yet.
- **Metrics:** total clicks, per-day counts (chart shows last 30 days),
  device split (android / ios / desktop).
- **Storage:** Upstash Redis via the Vercel marketplace integration
  (free tier). SDK: `@upstash/redis` — the only new dependency.
- **Default:** tracking is opt-in per link. Untracked `/v/`–`/c/` generation
  stays DB-free and instant.

## Architecture

| Unit | Responsibility |
|---|---|
| `lib/links.ts` | Pure + Redis logic: short-code generation (8 chars, `[a-z0-9]`, collision-safe via `SET NX`), stats-key generation (16-char secret), device classification from User-Agent, Redis key layout, link CRUD + click recording. Redis client **injected** (interface with `get`/`set`/`hincrby`/`hgetall`/`incr`/`expire`) so tests run against an in-memory fake. |
| `app/api/links/route.ts` | `POST { url, sub }` → validate with `parseYouTubeUrl` → create link → `{ shortUrl, statsUrl }`. Per-IP rate limit: 20 creates/hour (Redis `INCR` + `EXPIRE` window; keyed on `x-forwarded-for` first hop). 429 on breach. |
| `app/s/[code]/route.ts` | Resolve code → fire-and-forget click record (`waitUntil`) → serve `renderRedirectPage` (reused). `Cache-Control: no-store` (every click must reach the function; the ~50–100 ms function cost vs the edge cache is the price of counting — accepted). |
| `app/s/[code]/stats/page.tsx` | Server component. Validates `?key=` against stored `statsKey`; renders total, 30-day CSS bar chart, device split. No chart library. |
| `app/page.tsx` | "Track clicks" toggle; on creation shows short link + stats URL (both copyable) with a "save this" note; "My links" localStorage section. |

## Data model (Redis)

```
link:{code}    → JSON { kind, id, sub, statsKey, createdAt }
clicks:{code}  → hash { total, d:{YYYY-MM-DD}…, dev:android, dev:ios, dev:desktop }
ratelimit:{ip} → counter with 1h EXPIRE
```

Click recording = two `HINCRBY`s (total+day) + one for device — atomic, no
read-modify-write. Daily fields accumulate indefinitely (tiny); the stats page
reads the hash once and selects the last 30 days.

Device classification (server-side, from the `User-Agent` header):
`/Android/i` → android; `/iPhone|iPad|iPod/` → ios; else desktop. Mirrors the
client script's branching.

## UI

**Generator:** "Track clicks" toggle (any link kind). Off → current instant
behavior. On → POST to the API; result panel shows two rows: short link and
stats URL, each with copy buttons. Note under the stats row: "Save this URL —
it's the only way to see your stats."

**My links (localStorage):** key `linkmaker:links`, JSON array of
`{ code, shortUrl, statsUrl, target, createdAt }`, newest first, soft cap 50.
Section renders below the generator only when non-empty: target label, short
link (copy), "View stats" link, and a remove (×) that deletes locally only.
Caption: "Saved in this browser only — bookmark your stats URL to access it
anywhere."

**Privacy copy:** footer becomes "Free · no visitor profiling · works on
Instagram, TikTok & more". Stats are aggregate counts only — no cookies on
redirect pages, and clicks are never associated with visitor identity. One
nuance: the rate limiter keeps a creator-IP counter for one hour purely as
anti-abuse; it is operational, never linked to click data, and expires
automatically.

## Error handling

- Unknown or malformed code on `/s/` → existing fallback page (200).
- Redis unavailable on `/s/` resolve → fallback page; click-record failures are
  swallowed (redirecting always beats counting).
- Stats page with wrong/missing key → generic "not found" page; do not reveal
  whether the code exists.
- API: unparseable URL → 400 with the generator's error message; rate limit →
  429; Redis failure → 503 and the UI suggests using an untracked link.

## Testing

- `lib/links.ts` unit tests against the in-memory fake: code/key generation
  shape and uniqueness retry, device classification, click recording key
  layout, rate-limit window.
- Route tests (fake injected): create → resolve → count round-trip; no-store
  header on `/s/`; stats-key gating (right key 200 / wrong key not-found);
  unknown code → fallback; 429 after limit.
- UI: manual dev-server pass (toggle, dual copy rows, My links persistence
  across reload, remove).
- Manual on preview deploy with real Upstash before promoting.

## Out of scope (deliberate)

- Accounts, payments, plans (next phase — secret URLs migrate cleanly into
  accounts by associating codes)
- Referrer/country breakdowns
- Editing or deleting links server-side
- Custom code slugs

## Env

`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — injected by the Vercel
integration; local dev reads `.env.local` (already gitignored).

# Routes and API

## Pages and redirects

| Route | What it does |
| --- | --- |
| `GET /` | The homepage |
| `GET /v/{videoId}` | Redirect page for an 11-character video ID |
| `GET /@handle` | Redirect page for a channel handle. Same as `/c/@handle`, which still works. `?sub=1` adds YouTube's `sub_confirmation=1` |
| `GET /c/{@handle or UC…}` | Redirect page for a channel. `?sub=1` adds YouTube's `sub_confirmation=1` |
| `GET /og?c=@handle` | 1200×630 PNG share card with the handle on it, used as the channel links' `og:image`. Other values get a generic card |
| `GET /s/{code}` | Tracked redirect for an 8-character code. Counts the click |
| `GET /s/{code}/stats?key={key}` | Private stats page. Not indexed by search engines |

Redirect pages send these headers:

| Header | `/v/`, `/c/` and `/@handle` | `/s/` |
| --- | --- | --- |
| `Cache-Control` | `public, max-age=3600, s-maxage=31536000, immutable` | `no-store` |
| `X-Content-Type-Options` | `nosniff` | `nosniff` |
| `Referrer-Policy` | `no-referrer` | `no-referrer` |

Bad IDs and unknown codes return a fallback page with HTTP `200`, so a `200`
doesn't prove the link exists.

## `POST /api/links`

Creates a tracked link.

```bash
curl -X POST http://localhost:3000/api/links \
  -H 'content-type: application/json' \
  -d '{"url":"https://youtu.be/dQw4w9WgXcQ","sub":false}'
```

| Field | Type | Notes |
| --- | --- | --- |
| `url` | string, required | Any supported YouTube video or channel link |
| `sub` | boolean, optional | Channels only. Only `true` turns it on |

Responses:

| Status | Body |
| --- | --- |
| `200` | `{ "code": "a1b2c3d4", "shortUrl": "…/s/a1b2c3d4", "statsUrl": "…/s/a1b2c3d4/stats?key=…" }` |
| `400` | `{ "error": "Invalid request body." }` or `{ "error": "That doesn't look like a YouTube link." }` |
| `429` | `{ "error": "Rate limit reached — try again in an hour." }` after 20 links from one IP in an hour |
| `503` | `{ "error": "Tracking is unavailable right now — try an untracked link." }` when Redis is missing, down, or no free code was found after 5 tries |

The returned URLs use the request's origin. Treat `statsUrl` like a password:
don't log or share it.

## Configuration

Tracked links need one Redis credential pair, set in `.env.local` locally or in
Vercel's environment variables:

| Variable | Notes |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Direct Upstash setup. Used first if both pairs are set |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Names set by Vercel's Upstash integration |

The tokens are secrets. Don't mix a URL from one database with a token from
another.

These values are constants in code:

| Setting | Value |
| --- | --- |
| Short code | 8 lowercase letters and digits |
| Stats key | 16 lowercase letters and digits |
| Link creation limit | 20 per IP per hour |
| Stats chart | Last 30 UTC days |
| iOS fallback delay | About 1.5 seconds |
| Saved links in the browser | Up to 50, under the `localStorage` key `linkmaker:links` |

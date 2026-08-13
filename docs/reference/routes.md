# Route reference

## Product and generator

### `GET /`

Statically generated React interface for creating direct and tracked links.
Tracked links created in the browser are remembered in `localStorage` under
`linkmaker:links`, with a soft limit of 50 entries.

## Direct redirect routes

### `GET /v/{videoId}`

Serves redirect HTML for an 11-character YouTube video ID.

### `GET /c/{handleOrChannelId}`

Serves redirect HTML for an `@handle` or `UC...` channel ID. The optional
`sub=1` query parameter adds `sub_confirmation=1` to the YouTube destination.

Valid direct routes return:

```http
Content-Type: text/html; charset=utf-8
Cache-Control: public, max-age=3600, s-maxage=31536000, immutable
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

Invalid identifiers return the fallback HTML page with HTTP `200`.

## Tracked routes

### `GET /s/{code}`

Resolves an eight-character lowercase alphanumeric code, schedules an aggregate
click update, and serves the redirect HTML with `Cache-Control: no-store`.

An unknown or malformed code, or a Redis read failure, returns the fallback
HTML page with HTTP `200` and `no-store`.

### `GET /s/{code}/stats?key={statsKey}`

Dynamically renders aggregate statistics when the supplied key exactly matches
the link record. Missing links and missing or incorrect keys produce the same
generic not-found content to avoid disclosing whether a code exists.

The stats page is marked `noindex` and uses a no-referrer policy. It returns
rendered HTML rather than a JSON statistics API.

## Link-creation API

### `POST /api/links`

Creates a tracked link. See the complete [API reference](api.md).

## Status-code convention

Redirect routes currently prefer a usable HTML fallback over `404` or `5xx`
responses. API callers must use API status codes; redirect consumers must not
interpret HTTP `200` as proof that a target exists.

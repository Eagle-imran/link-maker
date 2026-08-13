# Redirect flow

## Direct links

1. `/v/{id}` or `/c/{identifier}` receives the request.
2. The route validates the identifier against the same strict rules used by the
   input parser.
3. It builds fixed YouTube HTTPS, iOS, and Android URLs.
4. It returns minimal HTML containing Open Graph metadata, a visible manual
   link, and a small inline handoff script.
5. The response is cacheable for one hour in the browser and one year at the
   shared edge cache because its content is immutable for the route identifier.

Invalid input returns a fallback HTML page with a link to YouTube. It currently
uses HTTP `200`; clients should identify success by behavior rather than status
alone.

## Tracked links

1. `/s/{code}` validates the eight-character code and loads `link:{code}`.
2. Missing, malformed, or unavailable records produce the safe fallback page.
3. For a valid record, the request User-Agent is classified as Android, iOS, or
   desktop/unknown.
4. Click counting is scheduled with Next.js `after()`. In test contexts without
   a request scope it runs inline.
5. The same redirect HTML is returned with `Cache-Control: no-store`, ensuring
   future requests reach the application and can be counted.

Counting is best-effort. Deferred errors are intentionally swallowed so a
statistics failure cannot turn a valid viewer redirect into an error response.

## Client handoff

### Android

The script assigns an Android intent URL targeting
`com.google.android.youtube`. The intent embeds an encoded HTTPS fallback URL
for systems where the app cannot be opened.

### iOS and iPadOS

The script assigns a `vnd.youtube://` URL and starts an approximately 1.5-second
HTTPS fallback timer. `visibilitychange` and `pagehide` cancel the timer when
the page is backgrounded during successful app handoff. The manual link remains
available if automatic navigation is blocked.

### Desktop and unknown clients

The script calls `location.replace()` with the HTTPS YouTube URL.

## Response protections

Redirect and fallback responses set:

- `Content-Type: text/html; charset=utf-8`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `robots: noindex` metadata

These protections also reduce the chance of a private stats key leaking through
a referrer when a user follows a link from the stats page.

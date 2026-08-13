# Privacy and security

This document describes the application's implemented behavior. It is a
technical notice, not legal advice or a substitute for a jurisdiction-specific
privacy policy.

## Direct links

Direct `/v/` and `/c/` routes do not write application analytics or visitor
identifiers to Redis. They return redirect HTML that points only to fixed
YouTube destinations.

Infrastructure providers may still process ordinary request metadata in their
service logs. Consult the configured hosting and Redis providers when preparing
a public legal notice.

## Tracked links

Each successful `/s/{code}` request attempts to store:

- one aggregate total increment;
- one aggregate increment for the current UTC day; and
- one aggregate Android, iOS, or desktop/unknown increment.

Device class is derived from the User-Agent header. The application does not
store the raw User-Agent, referrer, visitor IP, cookie identifier, country, or a
per-visitor event record with those counters. Counts are not deduplicated.

## Creator IP rate limiting

`POST /api/links` stores a counter whose Redis key contains the first address
from `x-forwarded-for`. Its intended TTL is one hour. This data is used only to
limit link creation and is not joined to click statistics.

The header trust model assumes Vercel overwrites `x-forwarded-for`. Other
deployments must configure a trusted proxy or revisit the rate limiter.

## Browser-local data

The generator saves up to 50 tracked-link entries in `localStorage` under
`linkmaker:links`. Entries include the code, public short URL, private stats
URL, target label, and creation time. They remain on that browser until removed
or site storage is cleared and are not synchronized by Link Maker.

## Stats authorization

The `key` in a stats URL is a bearer credential:

- Anyone with the complete URL can view that link's aggregate statistics.
- The key cannot be recovered, rotated, or revoked through the application.
- Query strings can appear in browser history and provider logs.
- The stats page uses `noindex` and `Referrer-Policy: no-referrer` to reduce
  discovery and onward leakage; these are defense-in-depth, not authentication.

Never put a real stats URL in documentation, analytics, support tickets,
screenshots, or public issue reports.

## Retention

Tracked link records and click counters currently have no expiry. Creation-IP
counters are intended to expire after one hour. See
[Data lifecycle](operations/data-retention.md) for complete limitations.

## Security controls

- Strict allowlists validate YouTube hosts and target identifier shapes.
- Redirect destinations use fixed YouTube URL patterns, preventing arbitrary
  open redirects.
- Path-derived Redis keys require a valid short-code format.
- Stats pages return the same not-found view for absent links and wrong keys.
- Redirect responses disable MIME sniffing and referrer transmission.
- Link records use collision-safe `SET NX` creation with cryptographic random
  bytes.
- Deferred analytics errors cannot break a resolved redirect.

## Known limitations

- Secret-URL authorization is weaker than an account-based access model.
- Click counters and rate-limit expiry updates are not transactional.
- There is no application-level deletion, key rotation, or link revocation.
- Automated traffic can be counted as clicks.
- Device classification is intentionally coarse and User-Agent based.

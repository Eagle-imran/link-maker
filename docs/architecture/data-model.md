# Redis data model

Tracked links use three key families. Direct links do not use Redis.

## Link record

```text
link:{code} -> JSON string
```

```json
{
  "kind": "video",
  "id": "dQw4w9WgXcQ",
  "sub": false,
  "statsKey": "example-only-never-a-real-key",
  "createdAt": "2026-08-13T00:00:00.000Z"
}
```

Codes are eight lowercase alphanumeric characters. Creation uses `SET NX` and
retries up to five times on collision. Stats keys are 16 lowercase alphanumeric
characters. Neither record currently has an expiry.

## Click counters

```text
clicks:{code} -> Redis hash
  total               integer
  d:{YYYY-MM-DD}       integer, UTC day
  dev:android          integer
  dev:ios              integer
  dev:desktop          integer
```

The stats page loads the entire hash and selects the most recent 30 UTC days for
display. Older daily fields remain stored.

## Creation rate limit

```text
ratelimit:{ip} -> integer counter with a one-hour TTL
```

The API increments the counter for the first address in `x-forwarded-for`. This
assumes Vercel overwrites that header. When self-hosting behind another proxy,
the operator must establish equivalent header trust or accept that callers may
evade this anti-abuse limit.

## Validation boundary

Redis keys derived from route parameters are built only after short-code format
validation. Stored JSON is parsed defensively; the stats page additionally
validates stored target identifiers before rendering a destination URL.

See [Data lifecycle](../operations/data-retention.md) for retention and deletion
limitations.

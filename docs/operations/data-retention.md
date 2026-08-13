# Data lifecycle and retention

## Current behavior

| Data | Storage | Current retention | Deletion interface |
| --- | --- | --- | --- |
| Direct links | None | Not applicable | Not applicable |
| Tracked target and stats key | `link:{code}` | Indefinite | None in application |
| Aggregate click counters | `clicks:{code}` | Indefinite | None in application |
| Creation IP counter | `ratelimit:{ip}` | Intended one hour | Automatic TTL |
| Creator's “My links” list | Browser `localStorage` | Until removed or site data is cleared | Remove button/browser controls |

Daily click fields older than 30 days are not displayed but remain in Redis.
Removing an item from **My links** deletes only the local browser entry; it does
not delete the Redis record or stop the short link.

## Operational implications

- Redis storage grows with tracked links and distinct click days.
- Lost stats keys cannot be recovered through the application.
- Exposed stats keys cannot be rotated.
- Short links cannot be edited, disabled, or deleted through the application.
- The separate rate-limit `INCR` and `EXPIRE` operations have a small failure
  window in which a counter might remain without a TTL.

## Before changing retention

Define product requirements for link permanence, deletion, stats-key rotation,
and account ownership. A retention change should include:

1. User-facing policy and migration behavior.
2. Redis TTL or deletion implementation.
3. Recovery and rollback procedure.
4. Tests for existing links and expiry boundaries.
5. Updates to the privacy notice, API reference, and runbook.

Do not manually delete production keys based only on an unvalidated user-supplied
code. Resolve the exact record, confirm authorization, and make the operation
recoverable where practical.

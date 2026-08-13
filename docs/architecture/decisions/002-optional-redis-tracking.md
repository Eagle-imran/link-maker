# ADR-002: Optional Redis-backed tracking

- **Status:** Accepted
- **Date:** 2026-07-22

## Context

Creators may want basic engagement counts, but mandatory persistence would add
latency and availability dependencies to every smart link.

## Decision

Keep `/v/` and `/c/` stateless and cacheable. Provide opt-in `/s/` links backed
by Upstash Redis with aggregate total, UTC-day, and device-class counters.

## Consequences

- Untracked links remain functional without Redis.
- Tracked redirects must be uncached and are dependent on Redis for resolution.
- Counting is best-effort and is not suitable for financial reconciliation.
- The product must clearly distinguish untracked and tracked behavior.

# ADR-003: Secret URL authorization for stats

- **Status:** Accepted
- **Date:** 2026-07-22

## Context

The application has no account system but must avoid making every tracked
link's analytics publicly enumerable.

## Decision

Generate a random stats key at link creation and require it as the `key` query
parameter on `/s/{code}/stats`. Return the same generic not-found view for a
missing code and an incorrect key.

## Consequences

- The complete stats URL is a bearer credential and must be kept private.
- A lost key cannot be recovered through the application.
- A disclosed key cannot currently be rotated or revoked.
- Query strings may appear in browser history and logs; the stats page and
  outgoing links use a no-referrer policy to reduce onward disclosure.
- Accounts or stronger authorization will require a future migration.

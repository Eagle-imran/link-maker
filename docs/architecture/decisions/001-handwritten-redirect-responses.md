# ADR-001: Handwritten redirect responses

- **Status:** Accepted
- **Date:** 2026-07-22

## Context

Viewer redirect latency matters more than rich presentation. A React page would
add framework JavaScript and hydration without helping the handoff.

## Decision

Direct and tracked routes return small, handwritten HTML documents with an
inline platform-detection script and a manual HTTPS link. Direct responses are
edge-cacheable; tracked responses are not.

## Consequences

- The viewer hot path does not hydrate React.
- Redirect content must be escaped and validated carefully.
- UI component abstractions do not apply to these pages.
- Redirect behavior requires unit tests plus real-device testing.

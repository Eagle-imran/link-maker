# Configuration

## Runtime requirements

- Node.js 20 or newer is the project baseline.
- npm installs the exact dependency graph from `package-lock.json`.

Next.js itself supports additional Node versions, but contributors and CI should
use the repository baseline to avoid environment-specific build differences.

## Environment variables

Tracked links require one complete Redis credential pair.

| Variable | Secret | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | No, but treat as configuration | Direct Upstash REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Direct Upstash REST token |
| `KV_REST_API_URL` | No, but treat as configuration | Vercel Marketplace-compatible endpoint name |
| `KV_REST_API_TOKEN` | Yes | Vercel Marketplace-compatible token name |

The `UPSTASH_*` pair takes precedence when both pairs exist. Do not mix a URL
from one Redis database with a token from another.

Copy `.env.example` to `.env.local` for local development. `.env.local` and all
other `.env*` files except the example are ignored by Git.

## Behavior without Redis

- The home page loads.
- Input parsing and direct `/v/` and `/c/` links work.
- Creating a tracked link returns `503`.
- Existing tracked links cannot be resolved and show the fallback page.
- Stats pages show not-found or temporarily unavailable content.

## Application configuration

The following values are currently constants in code rather than environment
variables:

| Setting | Value |
| --- | --- |
| Short-code length | 8 lowercase alphanumeric characters |
| Stats-key length | 16 lowercase alphanumeric characters |
| Creation limit | 20 per IP per hour |
| Stats chart window | 30 UTC days |
| iOS fallback delay | Approximately 1.5 seconds |
| Direct browser cache | 1 hour |
| Direct shared-cache lifetime | 1 year |

Changing these is a behavior change and requires tests and corresponding
documentation updates.

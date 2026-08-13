# Local development setup

## Prerequisites

- Git
- Node.js 20 or newer; `.nvmrc` selects the project baseline
- npm
- Optional Upstash Redis database for tracked links

## Install and run

```bash
git clone https://github.com/Eagle-imran/link-maker.git
cd link-maker
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

`npm ci` is preferred over `npm install` for a clean checkout because it uses
the committed lockfile exactly. Use `npm install` only when intentionally
changing dependencies and commit the resulting lockfile update.

## Configure tracked links

Create an Upstash Redis database, then populate either the `UPSTASH_*` or
`KV_*` pair in `.env.local`. Restart the development server after changing
environment variables.

Never paste production tokens into issues, tests, examples, screenshots, or
shell commands whose output will be shared.

## Verify the setup

1. Paste a supported URL and confirm that a direct link is generated.
2. Open the direct link and confirm that it reaches the intended YouTube URL.
3. If Redis is configured, create and open a tracked link.
4. Open its private stats URL and confirm that the total count increases.
5. Run:

```bash
npm test
npm run build
```

## Repository layout

```text
app/       Next.js pages and route handlers
lib/       URL, redirect, link, Redis, and deferred-work modules
tests/     Vitest unit and route-handler tests plus in-memory Redis fake
docs/      Product, architecture, reference, and operations documentation
```

## Working without Redis

Leave all Redis variables empty. Direct links remain fully testable. The UI
will report that tracking is unavailable if you attempt tracked creation.

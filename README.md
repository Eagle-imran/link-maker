# Link Maker

Turn a YouTube URL into a smart link that attempts to open the native YouTube
app instead of a social app's embedded browser.

**Live application:** <https://link-maker-mu.vercel.app>

## What it does

- Accepts YouTube videos, Shorts, live-video URLs, channel handles, and channel
  IDs.
- Creates direct smart links without an account or database.
- Optionally creates a short link with aggregate click counts, a 30-day chart,
  and an Android/iOS/desktop split.
- Falls back to `youtube.com` when app handoff is unavailable.

Tracking is opt-in. Direct `/v/` and `/c/` links do not record clicks. Tracked
`/s/` links store aggregate counters only; see
[Privacy and security](docs/privacy-and-security.md) for the precise data
handling model.

## Supported inputs

| Input | Example | Output route |
| --- | --- | --- |
| Video | `youtube.com/watch?v=dQw4w9WgXcQ` | `/v/dQw4w9WgXcQ` |
| Short URL | `youtu.be/dQw4w9WgXcQ` | `/v/dQw4w9WgXcQ` |
| Short or live video | `youtube.com/shorts/...`, `youtube.com/live/...` | `/v/{videoId}` |
| Channel handle | `youtube.com/@MrBeast` | `/c/@MrBeast` |
| Channel ID | `youtube.com/channel/UC...` | `/c/{channelId}` |
| Any supported input with tracking | Created through the UI or API | `/s/{code}` |

Playlists, custom slugs, editing, and server-side link deletion are not
currently supported.

## Quick start

Prerequisites:

- Node.js 20 or newer
- npm
- Upstash Redis only if you want to create or use tracked links

```bash
git clone https://github.com/Eagle-imran/link-maker.git
cd link-maker
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Untracked links work without Redis credentials.
Tracked link creation, resolution, and stats require one of the Redis variable
pairs documented in [Configuration](docs/reference/configuration.md).

## Development commands

```bash
npm run dev      # Local development server
npm test         # Vitest suite
npm run build    # Type-check and production build
npm start        # Run an existing production build
```

## Documentation

Start at the [documentation index](docs/README.md):

- [Architecture overview](docs/architecture/overview.md)
- [Route and API reference](docs/reference/routes.md)
- [Development setup](docs/development/setup.md)
- [Deployment guide](docs/operations/deployment.md)
- [Privacy and security](docs/privacy-and-security.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Technology

Next.js App Router, React, TypeScript, Vitest, and optional Upstash Redis,
deployed on Vercel.

## Project status

The service is usable, but native-app handoff is controlled partly by mobile
operating systems and embedded browsers. Validate redirect changes against the
[manual compatibility matrix](docs/product/browser-compatibility.md) before a
production release.

## License

No open-source license has been selected. Copyright remains with the repository
owner unless a license is added.

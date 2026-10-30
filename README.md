# ytopen

Instagram and TikTok open links in their own browser, where viewers aren't
signed in to YouTube, so they can't subscribe, like or comment. ytopen turns
a YouTube link into one that opens the YouTube app instead.

**Live:** <https://ytopen.vercel.app>

## Using it

1. Paste a YouTube video, Short, live or channel link, or type a channel's
   `@handle`.
2. Copy or share your new link and put it in your bio, stories or captions,
   or download it as a QR code for print. **Try it** opens the link so you
   can check it first.

If the viewer doesn't have the YouTube app, the link opens youtube.com.

**Ask viewers to subscribe** (channels only) adds YouTube's subscribe prompt.
It appears in desktop browsers; in the app, viewers land on your channel.

**Track clicks** makes a short `/s/` link plus a private stats page showing total
clicks, a 30-day chart and the split by device. Anyone with the stats link can
see the stats, and a lost stats link can't be recovered. The site remembers
your links under **Your links**, in that browser only.

## Supported links

| You paste | You get |
| --- | --- |
| `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/live/…` | `/v/{videoId}` |
| `youtube.com/@handle` | `/@handle` |
| `youtube.com/channel/UC…` | `/c/{channelId}` |
| Any of the above, with click tracking | `/s/{code}` |

Playlists, custom short codes, editing links and deleting links aren't
supported.

## Run it locally

Requires Node.js 20+. Redis is only needed for tracked links.

```bash
git clone https://github.com/Eagle-imran/link-maker.git
cd link-maker
npm ci
cp .env.example .env.local   # add Redis credentials here for tracked links
npm run dev                  # http://localhost:3000
```

```bash
npm test             # unit and route tests (no network or Redis needed)
npm run build        # type-check and production build
npm run docs:check   # check links between docs
```

## Docs

- [How it works](docs/how-it-works.md): redirects, tracked links, data and design decisions
- [Routes and API](docs/api.md): every URL, the link API and configuration
- [Development](docs/development.md): setup, tests and troubleshooting
- [Operations](docs/operations.md): deploying, release checks and incidents
- [Privacy and security](docs/privacy-and-security.md): what is stored and why
- [Contributing](CONTRIBUTING.md), [Security policy](SECURITY.md), [Changelog](CHANGELOG.md)

Built with Next.js, React, TypeScript, Vitest and optional Upstash Redis, and
deployed on Vercel.

## License

No license has been chosen yet. Copyright remains with the repository owner.

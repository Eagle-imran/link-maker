# Link Maker

Turn any YouTube link into a smart link that opens the **native YouTube app**
instead of a social app's in-app browser (Instagram, TikTok, …). Viewers stay
logged in, so they can subscribe, like, and comment.

## How it works

- `/v/{videoId}` and `/c/{@handle|channelId}` serve a ~1 KB HTML page with one
  inline script — no framework JS on the redirect hot path.
- **Android:** `intent://` URL targeting the YouTube package, with a built-in
  browser fallback.
- **iOS:** `vnd.youtube://` scheme with a 1.5 s timer fallback to the web URL,
  cancelled if the app takes over.
- **Desktop:** immediate redirect to youtube.com.
- `?sub=1` on channel links adds YouTube's subscribe-confirmation prompt.

No accounts, no tracking, no database.

## Develop

    npm install
    npm run dev    # http://localhost:3000
    npm test       # Vitest unit tests
    npm run build  # production build

## Deploy

Push to a Git repo and import into [Vercel](https://vercel.com) — zero config.
After deploying, test links from the Instagram in-app browser on iOS and
Android (paste a smart link into your own story/bio).

# Link Maker — Design Spec

**Date:** 2026-07-22
**Status:** Approved

## Purpose

A free public web tool for creators. Paste a YouTube URL, get back a smart link. When a viewer taps the smart link inside a social app's in-app browser (Instagram, TikTok, etc.), it escapes into the native YouTube app — where the viewer is logged in and can subscribe, like, and comment. No accounts, no tracking, no database.

Speed of the redirect is the top priority.

## Architecture

Next.js (App Router, TypeScript) deployed on Vercel free tier.

Three units:

1. **Generator UI** — `app/page.tsx`. A React page: paste a YouTube URL, get a smart link with a copy button. For channel links, a "subscribe prompt" toggle. Weight here does not affect redirect speed.
2. **Redirect endpoints** — `app/v/[id]/route.ts` (videos/Shorts) and `app/c/[handle]/route.ts` (channels). Route handlers, **not** React pages: each returns a hand-written, minified ~1 KB HTML document with one inline script. No React runtime, no hydration. Responses carry `Cache-Control: public, max-age=...` so Vercel's edge cache serves repeat hits without invoking a function.
3. **Parser/builder module** — `lib/youtube.ts`. Pure functions shared by both:
   - `parseYouTubeUrl(input) → { kind: "video" | "channel", id } | null`
   - Deep-link builders: web URL, `intent://` URL (Android), `vnd.youtube://` URL (iOS) for a given target.
   - Strict ID validation: `[A-Za-z0-9_-]{11}` for video IDs; `@handle` (`@[A-Za-z0-9._-]{3,30}`) or `UC[A-Za-z0-9_-]{22}` for channels.

## Link formats

| Input (any of) | Generated link | Opens in app |
|---|---|---|
| `youtube.com/watch?v=X`, `youtu.be/X`, `youtube.com/shorts/X`, `youtube.com/live/X` | `<site>/v/X` | The video |
| `youtube.com/@handle`, `youtube.com/channel/UC...` | `<site>/c/@handle` or `<site>/c/UC...` | The channel |
| Channel + subscribe toggle | `<site>/c/...?sub=1` | Channel with YouTube's confirm-subscribe dialog (`?sub_confirmation=1`) |

Shorts open as regular videos (same video ID; YouTube handles presentation). Bare `youtube.com` hostnames, `www.`, `m.`, and `music.` variants, and URLs pasted without a scheme are all accepted by the parser.

## Redirect logic (inline script in the redirect page)

User-agent detection, then:

1. **Android** (`/Android/` in UA): `location.href = "intent://www.youtube.com/<path>#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=<url-encoded web URL>;end"`. If the app is missing, Android itself follows the fallback URL — no timers.
2. **iOS** (`/iPhone|iPad|iPod/` in UA): fire `vnd.youtube://<path>` immediately via `location.href`, and start a ~1.5 s `setTimeout` fallback to the normal `https://www.youtube.com/<path>` URL. Listeners on `visibilitychange` and `pagehide` cancel the timer when the app takes over, preventing a double-open.
3. **Desktop / unknown**: `location.replace(<web URL>)` immediately.

Page body: a minimal "Opening YouTube…" message plus a visible manual link ("Tap here if nothing happens") pointing at the web URL — the safety net for in-app browsers that block automatic navigation.

## Error handling

- **Generator:** unparseable input shows an inline error ("That doesn't look like a YouTube link"). A smart link is only ever produced from a successful parse — no dead links.
- **Redirect endpoints:** the `[id]`/`[handle]` segment is re-validated with the strict regexes. Invalid → a tiny HTML page linking to `youtube.com` (HTTP 200, no redirect). Because targets are constructed only from validated IDs onto fixed `youtube.com` paths, the service cannot be used as an open redirector.

## Testing

- **Unit tests (Vitest)** for `lib/youtube.ts`: every accepted URL shape parses to the right target; invalid/malicious inputs return `null`; deep-link builders produce exact expected strings (including URL-encoding of the intent fallback).
- **Route handler tests:** valid ID → 200 HTML containing the three target URLs and cache headers; invalid ID → safe fallback page.
- **Manual device matrix (post-deploy):** Instagram in-app browser on iOS and Android (primary), TikTok in-app browser, plain Safari and Chrome on mobile, desktop browser.

## Out of scope (deliberate)

- Click tracking or analytics of any kind
- Short codes / database / accounts
- Playlists and live-stream links (live *URLs* are parsed, but only because they carry a plain video ID)
- Custom domains

## Monetization path (future, not built now)

The `/v/` and `/c/` namespaces remain permanent and free. A future `/s/{shortcode}` namespace can add DB-backed short links with click analytics for paying users (Vercel KV/Postgres + Stripe). Nothing in today's design blocks this.

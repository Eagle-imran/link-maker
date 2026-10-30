# Operations

## Deploying

The site is the Vercel project `link-maker`, connected to
`Eagle-imran/link-maker`.

- Every push to `main` deploys to production.
- Every other branch gets a preview deployment. Preview URLs are behind Vercel
  sign-in, so test public behavior on the production URL.
- Redis credentials must be set in Vercel for both Preview and Production.

Release steps:

1. Open a pull request. CI must pass (`docs:check`, `test`, `build`).
2. Check the preview: the homepage loads, a video and a channel link redirect
   correctly, and a bad link shows the fallback page.
3. Merge to `main`, then repeat a quick check on <https://ytopen.vercel.app>.
4. Add user-visible changes to `CHANGELOG.md`.

To roll back, promote the previous deployment in Vercel. Rolling back doesn't
change Redis data, so keep stored-link formats backward compatible.

## Before releasing a redirect change

Unit tests can't prove the YouTube app opens. Test on real devices with the
YouTube app installed, and note devices, OS versions and the date in the
changelog.

| Check | Expected |
| --- | --- |
| Video link in Instagram, iPhone and Android | Opens the app, or youtube.com |
| Channel link in Instagram, iPhone and Android | Opens the right channel |
| Video link in TikTok, iPhone and Android | Opens the app, or youtube.com |
| Safari and Chrome, app installed | Opens the app |
| Safari and Chrome, app not installed | Opens youtube.com |
| iPad Safari | Opens the app |
| Desktop browser | Opens youtube.com |
| Channel link with subscribe prompt | Right channel, prompt on desktop |
| Tracked link | Redirects, and the stats page count goes up |
| Bad link | Shows the fallback page |

## When things go wrong

**Redis is down.** Direct links keep working. Tracked links show the fallback
page, link creation returns `503`, and stats pages say "Stats are unavailable".
Check Upstash status and the Vercel environment variables. Redeploying doesn't
help with an Upstash outage.

**Many `429` responses.** Someone is creating lots of links, or many people
share one IP. The limit is 20 per IP per hour. Don't remove it without weighing
Redis cost and abuse.

**Wrong destination.** Reproduce it with a test in `tests/youtube.test.ts` or
`tests/redirect-page.test.ts`, fix it, and roll back first if a release broke
existing links.

**A stats link was leaked.** Keys can't be rotated. The only option is deleting
the `link:{code}` and `clicks:{code}` keys in Upstash by hand, which also breaks
the short link. Back them up first.

**A Redis token was leaked.** Rotate it in Upstash, update Vercel's environment
variables, redeploy, and check that a tracked link still works.

Never log or share Redis tokens, stats keys, full stats URLs or visitor IPs.

## Data that grows

Links and click counts never expire, so Redis storage grows with every tracked
link and every day it gets clicks. Before adding expiry or deletion, decide what
should happen to existing links, and update [Privacy and security](privacy-and-security.md).

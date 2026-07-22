# Link Maker

**Get more subscribers from Instagram, TikTok, and other social apps.**

## The problem

When someone taps your YouTube link inside Instagram, TikTok, or any social
app, it opens in the app's built-in browser — where they're **not logged in
to YouTube**. They can't subscribe, like, or comment. Most just leave.

## The fix

Link Maker gives you a smart link that skips the in-app browser and opens
your video or channel **in the YouTube app**, where viewers are already
logged in. One tap to subscribe.

## How to use it

1. Go to **https://link-maker-mu.vercel.app**
2. Paste any YouTube link (video, Short, or channel)
3. Copy the smart link and use it in your bio, stories, and captions

That's it. Free, no account, no tracking.

**Good to know**

- Works with videos (`watch`, `youtu.be`, Shorts, live) and channels
  (`@handle` or channel ID)
- The "confirm subscribing" option shows YouTube's popup on desktop
  browsers; in the app, viewers land on your channel's Subscribe button
- If the YouTube app isn't installed, the link falls back to youtube.com

## For developers

```
npm install
npm run dev    # http://localhost:3000
npm test       # unit tests
npm run build  # production build (stop the dev server first)
```

Deploy: push to GitHub, import into [Vercel](https://vercel.com). Done.

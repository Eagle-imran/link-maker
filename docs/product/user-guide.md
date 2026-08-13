# User guide

## Create a direct smart link

1. Open Link Maker.
2. Paste a supported YouTube video or channel URL.
3. For a channel, optionally enable the subscribe-confirmation option.
4. Copy the generated smart link.

Direct links use `/v/{videoId}` or `/c/{handle-or-channelId}`. Link Maker does
not store these links or record their clicks.

## Create a tracked link

1. Paste a supported YouTube URL.
2. Enable **Track clicks**.
3. Select **Create tracked link**.
4. Save both the short URL and the private stats URL.

The short URL can be shared publicly. Anyone possessing the complete stats URL,
including its `key` query parameter, can view that link's statistics. Treat the
stats URL like a password and do not publish it.

The **My links** list is stored in the current browser's `localStorage`. It is a
convenience list, not a server-side account or backup. Clearing site data,
changing browsers, or changing devices removes access to that list. Bookmark or
otherwise securely save important stats URLs.

## Available statistics

- Total recorded clicks
- Click counts for the last 30 UTC calendar days
- Aggregate Android, iOS, and desktop/unknown counts

Counts are best-effort rather than billing-grade analytics. Deferred writes can
fail, automated clients may be counted, and device classification is based on
the request's User-Agent header.

## Subscribe confirmation

For channels, the option adds YouTube's `sub_confirmation=1` parameter. YouTube
controls the final behavior. Desktop browsers may show a confirmation dialog;
the native app may instead open the channel with its normal Subscribe button.

## When app handoff fails

Link Maker displays a manual YouTube link and attempts a web fallback. Embedded
browsers and mobile operating systems can restrict custom schemes or Android
intents, so exact behavior varies by app and version.

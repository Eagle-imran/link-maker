# Browser compatibility

Native-app handoff depends on YouTube, the operating system, the browser, and
the social app hosting an embedded browser. Unit tests verify generated URLs
and scripts but cannot prove that an external app will accept them.

## Expected behavior

| Client | Attempt | Fallback |
| --- | --- | --- |
| Android | YouTube Android intent | Intent-provided HTTPS YouTube URL |
| iPhone/iPad/iPod | `vnd.youtube://` URL | HTTPS URL after approximately 1.5 seconds |
| iPad with a desktop-class (Mac) User-Agent | `vnd.youtube://` URL | HTTPS URL after approximately 1.5 seconds |
| Desktop or unknown | HTTPS YouTube URL | Manual link on the page |

iPadOS 13 and later Safari identify as a Mac by default. The handoff script
treats a `Macintosh` User-Agent that reports more than one touch point
(`navigator.maxTouchPoints`) as an iPad; Macs report zero.

## Release test matrix

Complete this matrix on a Vercel preview deployment when redirect behavior
changes. Record device/OS/app versions and the date in the release notes.

| Scenario | iOS | Android | Expected result |
| --- | --- | --- | --- |
| Instagram embedded browser, video | Required | Required | Opens app or usable web fallback |
| Instagram embedded browser, channel | Required | Required | Opens correct channel |
| TikTok embedded browser, video | Required | Required | Opens app or usable web fallback |
| Safari/Chrome mobile, app installed | Required | Required | Opens correct video/channel |
| Safari/Chrome mobile, app absent | Required | Required | Opens `youtube.com` |
| iPad Safari (default desktop-class site), app installed | Required | n/a | Opens correct video/channel in the app |
| Desktop browser | Required | Required | Opens `youtube.com` |
| Subscribe-confirmation channel | Required | Required | Preserves intended channel and parameter |
| Tracked short link | Required | Required | Redirects and increments aggregate stats |
| Invalid direct/short link | Required | Required | Shows safe YouTube fallback page |

Do not claim universal app support from a single successful device test.

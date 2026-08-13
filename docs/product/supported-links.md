# Supported YouTube links

The parser accepts URLs with or without an `http://` or `https://` scheme.
Hosts are matched case-insensitively.

## Video inputs

| Form | Example |
| --- | --- |
| Watch URL | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| Short host | `https://youtu.be/dQw4w9WgXcQ` |
| Short | `https://youtube.com/shorts/dQw4w9WgXcQ` |
| Live video | `https://youtube.com/live/dQw4w9WgXcQ` |

The accepted long-form hosts are `youtube.com`, `www.youtube.com`,
`m.youtube.com`, and `music.youtube.com`. A video ID must contain exactly 11
letters, numbers, underscores, or hyphens.

## Channel inputs

| Form | Example |
| --- | --- |
| Handle | `https://youtube.com/@MrBeast` |
| Channel ID | `https://youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA` |

Handles must begin with `@` and contain 3–30 permitted characters after it.
Channel IDs must begin with `UC` and contain 24 characters in total.

## Not supported

- Playlists
- Arbitrary YouTube paths such as `/user/...` or `/c/...`
- Non-YouTube hosts, including lookalike subdomains
- Custom short-code selection
- Links that do not contain a valid video, handle, or channel ID

Unsupported input is rejected by the generator and link-creation API.

# Privacy and security

This describes what the app does. It isn't a legal privacy policy.

## What is stored

| Data | Where | How long |
| --- | --- | --- |
| Direct links (`/v/`, `/c/`) | Nowhere | — |
| Tracked link target and stats key | Redis `link:{code}` | Forever |
| Click counts: total, per UTC day, and Android, iOS or desktop | Redis `clicks:{code}` | Forever |
| Link creator's IP, as a rate-limit counter | Redis `ratelimit:{ip}` | One hour |
| **Your links** list | The creator's browser (`localStorage`) | Until removed or site data is cleared |

For clicks, ytopen stores only counts. It doesn't store IPs, User-Agents,
referrers, cookies, locations or individual click records, and counts aren't
deduplicated. Device type is worked out from the User-Agent and then discarded.

The rate-limit counter uses the first address in `x-forwarded-for`, which
Vercel sets. Self-hosting behind another proxy needs the same guarantee.

Removing a link from **Your links** only removes it from that browser. The
short link keeps working.

The site's own pages (the homepage, not the links viewers tap or stats pages)
load Vercel Web Analytics. It counts page views without cookies; Vercel
describes what it collects in its own documentation.

Vercel and Upstash may keep their own request logs.

## Stats links

The `key` in a stats link is the only thing protecting the stats:

- Anyone with the full link can see that link's counts.
- It can't be recovered, changed or revoked.
- It can show up in browser history and server logs.

The stats page asks search engines not to index it and sends no referrer, but
those only reduce leaks. Never put a real stats link in docs, issues or
screenshots.

## Protections

- Only YouTube hosts and correctly shaped video IDs, handles and channel IDs are
  accepted, so links can't redirect anywhere else.
- Redis keys are only built from codes that pass format checks.
- A wrong stats key and a missing link look identical.
- Redirect pages disable MIME sniffing and send no referrer.
- Codes and keys come from cryptographic random bytes, and new links can't
  overwrite existing ones.
- A failure while counting a click never breaks the redirect.

## Limitations

- A secret link is weaker protection than a login.
- Bots can be counted as clicks.
- Click counters and the rate-limit expiry aren't updated atomically.
- There's no way in the app to delete a link or revoke a stats key.

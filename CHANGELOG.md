# Changelog

Notable user-visible and operational changes are recorded here. This project
does not yet publish numbered releases; entries use deployment dates when known.

The format follows the principles of Keep a Changelog.

## Unreleased

### Added

- Type a bare `@handle` instead of pasting the channel link.
- A Paste button fills the link field from the clipboard, and on phones a
  Share button opens the share sheet. Plain links have a **Try it** link to
  test them first.
- Vercel Web Analytics counts visits to the site's own pages. It's cookieless,
  skips stats pages, and never runs on the links viewers tap.
- Every finished link shows a small QR code in its top right, with PNG and
  SVG downloads beneath it. The SVG stays sharp in print.
- Canonical product, development, architecture, API, privacy, security,
  deployment, and operations documentation.
- Safe Redis environment template and Node.js development baseline.
- Documentation link validation and continuous-integration checks.

### Changed

- The logo now sits larger in the center of the header. Blank sponsor tiles
  beside the homepage are ready to fill, hidden until `NEXT_PUBLIC_SPONSORS`
  is set to `on`.
- Channel links show the channel in chat previews: the title reads
  "@handle on YouTube" with a share card that has the handle on it. Sharing
  the homepage now shows a preview image too.
- Renamed the site to ytopen (now at ytopen.vercel.app) with a new logo: a
  play arrow leaving a frame.
- Channel links made from an `@handle` are shorter: `/@handle` instead of
  `/c/@handle`. Existing `/c/` links still work.
- Redesigned the site in black and graphite with the Instrument Sans typeface,
  and rewrote the page copy. The finished link is now shown large, and saved
  links are listed under Your links.
- The homepage now leads with the problem (bio links open signed out, so
  viewers can't easily subscribe), shows the YouTube icon, and compares a
  regular link with a Link Maker link.
- The stats page leads with the total click count and labels devices in plain
  terms.
- Clarified that click tracking is optional and aggregate-only.
- Consolidated the documentation into five short guides under `docs/` and
  removed the historical design specs and plans.

### Fixed

- iPads using the default desktop-class Safari User-Agent now open the YouTube
  app instead of youtube.com. Their tracked clicks are still counted as desktop.
- Creating a tracked link without Redis configured now returns the documented
  `503` JSON error instead of crashing with a `500`.

## Earlier development

The initial smart-link generator and later tracked-link implementation predate
this changelog. Their design records are in the git history before this change.

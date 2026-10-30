# Changelog

Notable user-visible and operational changes are recorded here. This project
does not yet publish numbered releases; entries use deployment dates when known.

The format follows the principles of Keep a Changelog.

## Unreleased

### Added

- Canonical product, development, architecture, API, privacy, security,
  deployment, and operations documentation.
- Safe Redis environment template and Node.js development baseline.
- Documentation link validation and continuous-integration checks.

### Changed

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

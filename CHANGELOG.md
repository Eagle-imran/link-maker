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
- The stats page leads with the total click count and labels devices in plain
  terms.
- Clarified that click tracking is optional and aggregate-only.
- Marked implementation specifications as historical records rather than
  canonical current documentation.

### Fixed

- iPads using the default desktop-class Safari User-Agent now open the YouTube
  app instead of youtube.com. Their tracked clicks are still counted as desktop.

## Earlier development

The initial smart-link generator and later tracked-link implementation predate
this changelog. Their historical design records remain under `docs/superpowers/`.

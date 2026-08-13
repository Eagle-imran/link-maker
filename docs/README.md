# Link Maker documentation

This directory contains the canonical documentation for the current system.
Files under `docs/superpowers/` are historical design and implementation
records; they explain how features were developed but do not override this
documentation or the running code.

## Product

- [User guide](product/user-guide.md)
- [Supported YouTube links](product/supported-links.md)
- [Browser compatibility and manual test matrix](product/browser-compatibility.md)

## Development

- [Local setup](development/setup.md)
- [Testing](development/testing.md)
- [Troubleshooting](development/troubleshooting.md)

## Architecture

- [System overview](architecture/overview.md)
- [Redirect flow](architecture/redirect-flow.md)
- [Redis data model](architecture/data-model.md)
- [Architecture decisions](architecture/decisions/README.md)

## Reference

- [Routes](reference/routes.md)
- [Link-creation API](reference/api.md)
- [Configuration](reference/configuration.md)

## Operations

- [Deployment](operations/deployment.md)
- [Production runbook](operations/runbook.md)
- [Data lifecycle](operations/data-retention.md)
- [Privacy and security](privacy-and-security.md)

## Project governance

- [Contributing](../CONTRIBUTING.md)
- [Security policy](../SECURITY.md)
- [Changelog](../CHANGELOG.md)

## Documentation conventions

- Describe current, observable behavior in the present tense.
- Put design rationale in an architecture decision record (ADR).
- Never include credentials, production Redis values, visitor data, or private
  stats URLs in examples.
- Update documentation in the same change as the behavior it describes.
- Verify commands from a clean checkout before merging setup changes.

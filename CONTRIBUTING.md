# Contributing

Thank you for improving Link Maker. Keep changes small, testable, and aligned
with the redirect-first design.

## Before starting

1. Read the [architecture overview](docs/architecture/overview.md).
2. Follow the [local setup guide](docs/development/setup.md).
3. Search existing issues and changes before duplicating work.
4. Do not include Redis credentials, private stats URLs, IP addresses, or
   production data in code, tests, screenshots, commits, or issues.

Use a public issue for ordinary bugs and feature proposals. Follow
[SECURITY.md](SECURITY.md) for suspected vulnerabilities.

## Development workflow

1. Create a focused branch.
2. Add or update tests with the behavior change.
3. Update user, API, operations, and architecture documentation where relevant.
4. Run the required checks:

```bash
npm run docs:check
npm test
npm run build
```

5. For redirect behavior, test a Vercel preview using the documented mobile
   compatibility matrix.

## Pull requests

Describe:

- the user or operational problem;
- the chosen solution and important alternatives;
- test evidence;
- privacy, security, caching, and data-model impact; and
- manual device results when redirect behavior changes.

Avoid unrelated formatting or refactors in the same change. Preserve existing
links and stored records unless the proposal includes a migration plan.

## Code expectations

- Treat target and route input as untrusted, even if another layer validated it.
- Keep direct redirects independent of Redis.
- Do not delay a valid viewer redirect for best-effort analytics.
- Use `RedisLike` and `FakeRedis` for deterministic tests.
- Do not introduce a general destination URL without a dedicated open-redirect
  security review.
- Record durable architectural choices in an ADR.

## Documentation expectations

The canonical documentation is indexed in `docs/README.md`. Historical files
under `docs/superpowers/` should not be edited to describe current behavior;
supersede them with canonical documentation or a new ADR.

## License

No open-source license is currently present. Contribution acceptance and
licensing terms should be clarified by the repository owner before accepting
substantial third-party contributions.

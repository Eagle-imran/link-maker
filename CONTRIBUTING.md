# Contributing

1. Read [How it works](docs/how-it-works.md) and set up with
   [Development](docs/development.md).
2. Work on a branch, and add or update tests with any behavior change.
3. Update the docs in the same pull request.
4. Run `npm run docs:check`, `npm test` and `npm run build`.
5. For redirect changes, run the
   [device checks](docs/operations.md#before-releasing-a-redirect-change).

In the pull request, describe the problem, the fix, how you tested it, and any
effect on privacy, caching or stored data.

## Rules of thumb

- Treat every route parameter and stored value as untrusted.
- Keep direct links independent of Redis.
- Never slow down or break a redirect for the sake of analytics.
- Don't add a way to redirect to arbitrary URLs.
- Keep existing short links working. A change to stored data needs a migration
  plan.
- Never put Redis tokens, stats links, IPs or production data in code, tests,
  commits, issues or screenshots.

Report security problems privately, as described in [SECURITY.md](SECURITY.md).

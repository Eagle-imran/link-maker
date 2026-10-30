# Security policy

Don't open a public issue for a vulnerability, a leaked credential, a private
stats link, or anything containing production data.

Report it privately with GitHub's **Report a vulnerability** button on the
repository's **Security** tab, or through an existing private channel with the
owner. Include the affected route, steps to reproduce using test data, what
happened versus what you expected, and the likely impact.

Please don't test against other people's links, access more data than needed
to show the problem, degrade the service, or disclose the issue publicly before
it's fixed. There's no formal response time.

Only the current production deployment and `main` get security fixes.

## Sensitive values

Redis tokens, stats keys and full stats links, rate-limit keys (they contain
IPs), and provider logs. If a Redis token leaks, follow
[Operations](docs/operations.md#when-things-go-wrong).

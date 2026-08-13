# Security policy

## Reporting a vulnerability

Do not open a public issue for a vulnerability, exposed credential, private
stats URL, or report containing production data.

Use GitHub's private vulnerability-reporting flow from the repository's
**Security** tab if the **Report a vulnerability** option is available. Include:

- affected route or component;
- clear reproduction steps using non-sensitive test data;
- observed and expected behavior;
- potential impact; and
- a suggested remediation, if known.

If private reporting is not available, contact the repository owner through a
previously established private channel. There is currently no guaranteed public
security mailbox; the owner should configure GitHub private reporting before a
public production launch.

## Response expectations

No formal response SLA is currently published. Reporters should avoid testing
against other users' links, accessing data beyond what is needed to demonstrate
the issue, degrading the service, or publicly disclosing an unresolved issue.

## Supported versions

This project deploys continuously rather than maintaining versioned release
branches. Only the current production deployment and the default branch are
intended to receive security fixes.

## Sensitive values

Treat these as sensitive:

- Redis REST tokens
- complete private stats URLs and stats keys
- creator IP rate-limit keys
- hosting or provider logs containing request metadata

If a Redis token is exposed, rotate it at the provider, update every affected
deployment environment, redeploy if required, and verify tracked-link behavior.

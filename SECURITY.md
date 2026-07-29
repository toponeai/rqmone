# Security Policy

## Supported versions

R.Q.M.1 is developed continuously and deployed from `main`. Only the latest
released state of `main` receives security fixes.

| Version | Supported |
| ------- | --------- |
| `main` (latest) | :white_check_mark: |
| Older commits / forks | :x: |

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Report privately through GitHub Security Advisories:
`Security` tab → `Report a vulnerability`.

Include:

- A description of the issue and its impact
- Steps to reproduce (or a proof of concept)
- Affected route, server function, table or policy
- Any suggested remediation

### Response targets

| Stage | Target |
| ----- | ------ |
| Acknowledgement | within 3 business days |
| Initial assessment | within 7 business days |
| Fix or mitigation plan | within 30 days for high/critical |

Accepted reports are fixed on a private branch, released, and credited in
`CHANGELOG.md` unless you request otherwise. Declined reports receive an
explanation of the reasoning.

## Scope

In scope:

- Authentication and session handling
- Row Level Security policies and database grants
- Server functions (`createServerFn`) and API routes under `src/routes/api/`
- The MCP server mounted at `/mcp` and its OAuth flow
- Client-side data exposure

Out of scope:

- Vulnerabilities in third-party providers themselves
- Findings that require a compromised device or browser extension
- Missing hardening headers with no demonstrated impact
- Automated scanner output without a working proof of concept

## Secrets handling

- Only `.env.example` documents configuration; it contains placeholders only.
- Publishable / anon keys are safe to expose by design; private keys and the
  service-role key are never committed and are injected at runtime.
- Server-only values are read inside server function handlers via
  `process.env`; browser-visible values must be prefixed `VITE_`.
- GitHub secret scanning and push protection should be enabled on the repository.

## Automated security controls

- **CodeQL** static analysis on every push, pull request, and weekly.
- **Dependency Review** blocks pull requests introducing high-severity advisories.
- **Dependabot** opens weekly patch pull requests for npm and GitHub Actions.
- **Row Level Security** is enabled on every table in the `public` schema.

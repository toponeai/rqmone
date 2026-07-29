# Support

Thanks for using R.Q.M.1. Here is the fastest way to get help.

## Before asking

1. Read the [README](README.md) and the [Developer Guide](docs/developer-guide.md).
2. Check the relevant document in [`docs/`](docs/).
3. Search [existing issues](../../issues?q=is%3Aissue).

## Where to go

| I want to… | Use |
| --- | --- |
| Ask a usage or setup question | GitHub Discussions |
| Report a reproducible bug | [Bug report issue](../../issues/new?template=bug_report.yml) |
| Propose a feature or new module | [Feature request issue](../../issues/new?template=feature_request.yml) |
| Report unclear documentation | [Docs issue](../../issues/new?template=documentation.yml) |
| Report a security vulnerability | **Private advisory** — see [SECURITY.md](SECURITY.md) |

## Writing a good report

Include the route, the browser and OS, exact steps, expected vs actual
behaviour, and any console or network errors. Screenshots or a short recording
help enormously for 3D and map issues.

## Response expectations

This project is maintained on a best-effort basis. Triage typically happens
within a few business days. Security reports are prioritised — see the response
targets in [SECURITY.md](SECURITY.md).

## Common issues

- **Blank galaxy scene** — WebGL disabled or unsupported GPU. Check
  `chrome://gpu` and the browser console.
- **Globe textures missing** — textures are served locally from
  `public/textures/`; verify the build copied the `public/` folder.
- **`Unauthorized` during build** — a protected server function is being called
  from a public route loader. See [docs/authentication.md](docs/authentication.md).
- **Empty map** — no published entities in the current viewport, or RLS is
  filtering unpublished rows.

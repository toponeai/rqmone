# Deployment

## Targets

| Environment | URL shape | Source |
| --- | --- | --- |
| Preview | `project--<id>-dev.lovable.app` | latest preview build |
| Production | `project--<id>.lovable.app` / custom domain | published deployment |

Deployment is performed from the Lovable editor (**Publish**). The GitHub
repository mirrors the code via two-way sync; pushing to `main` updates Lovable.

## Build

```bash
bun install --frozen-lockfile
bun run build       # production
bun run build:dev   # development-mode build (used for prerender checks)
bun run preview     # serve the built output locally
```

CI runs lint, typecheck, build and uploads `dist` / `.output` as artifacts.

## Runtime constraints (Cloudflare Workers)

Server functions and SSR run in a Worker with `nodejs_compat`.

Safe: `fs`, `path`, `crypto`, `Buffer`, `stream`, `url`, `events`, `timers`,
`net`, `http`, `https`, `zlib`.

Unavailable: `child_process`, `sharp`, `canvas`, `puppeteer`, `fs.watch`,
`os.cpus()`, and any package needing native addons or a real filesystem.

All dependencies must be bundled at build time — never set `ssr.external` or
`resolve.external` for the Worker SSR environment.

## Environment variables

Copy `.env.example` to `.env`. Only `VITE_*` values reach the browser; every
other value is read inside server handlers.

| Variable | Scope |
| --- | --- |
| `VITE_SUPABASE_URL` | client + server |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client + server (publishable by design) |
| `VITE_SUPABASE_PROJECT_ID` | client + server |
| `LOVABLE_API_KEY` | server only, injected at runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | server only, self-hosting only |

## Database migrations

Migrations in `supabase/migrations/` are applied in filename order to the
managed backend. They are additive; rollback is achieved with a new
compensating migration, never by editing history.

## Post-deploy checklist

- Public routes render without an authenticated session.
- Globe textures load from `public/textures/`.
- Realtime messaging and notifications connect.
- `/mcp` responds and the OAuth consent screen renders.

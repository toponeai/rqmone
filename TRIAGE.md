# Triage — Local run & first-pass diagnostics

This document captures the immediate triage steps I ran (or recommend running) to bring the project up locally and collect actionable diagnostics. It is intended as a runbook for Phase 0.

## Quick start (what to run now)

1. Install dependencies (uses bun):

```bash
bun install
cp .env.example .env   # edit .env with local values
bun run dev             # starts Vite dev server (default http://localhost:8080)
```

2. If the dev server fails, capture the full terminal output and browser console logs.

## Local Postgres + PostGIS for development (Docker Compose)

Create a local DB with PostGIS (recommended) so migrations can run:

```yaml
# docker-compose.postgis.yml
version: '3.8'
services:
  db:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_USER: rqmone
      POSTGRES_PASSWORD: rqmone
      POSTGRES_DB: rqmone_dev
    ports:
      - '5432:5432'
    volumes:
      - postgis_data:/var/lib/postgresql/data

volumes:
  postgis_data:
```

Start it:

```bash
docker compose -f docker-compose.postgis.yml up -d
```

Create extensions (psql):

```bash
psql -h localhost -U rqmone -d rqmone_dev -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -h localhost -U rqmone -d rqmone_dev -c "CREATE EXTENSION IF NOT EXISTS "uuid-ossp";"
```

## Applying migrations

Migrations live in `supabase/migrations/` and should be applied in filename order. Two options:

- Using the supabase CLI (preferred if available):
  - `supabase start` (if using supabase local dev)
  - `supabase db reset --project-ref <local-ref>` or use `supabase db push`

- Using psql:

```bash
for f in supabase/migrations/*.sql; do psql -h localhost -U rqmone -d rqmone_dev -f "$f"; done
```

Capture any SQL errors and missing-extension errors.

## What to capture when something fails

- Terminal output from `bun run dev` (full trace)
- Output from migration script (first failing SQL file and line)
- Browser console logs when visiting the running dev URL
- Node / Worker stack traces (if any)

Save logs into `triage/logs/` with timestamps.

## Quick checklist (to populate)

- [ ] Dev server starts without exceptions
- [ ] Server functions import/compile cleanly (tsc --noEmit)
- [ ] Migrations apply to local Postgres+PostGIS
- [ ] Sample seed data is present (or seed script prepared)
- [ ] Route generation (routeTree.gen.ts) is present and up-to-date
- [ ] .env.example contains all required VITE_ and server env vars

## Next recommended immediate actions

1. If dev server runs: open `/` and `/auth` and check console and network for server function failures.
2. If dev server fails to start on import/compile errors: run `bun run typecheck` and fix TypeScript errors.
3. If migrations fail: paste the failing SQL and error message into an issue and attach psql output.
4. Create a minimal seed script (`supabase/seed/sample_entities.sql`) with 10 sample entities for local testing.

## Notes and risks observed (initial)

- The repo targets an edge runtime; server-only code must avoid Node-native modules (native fs, net) — this can cause runtime mismatch if run with Node or local tooling.
- .env contains many server-side variables; ensure secrets are not committed.

---

Once you confirm, I will:
- Run Phase 1 changes (CI workflow + DEV.md) and open a PR with those low-risk changes, or
- Start implementing missing server functions / seed scripts after you tell me to proceed.

# Development Guide

Everything you need to develop, test, and deploy R.Q.M.1.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local development](#local-development)
3. [Environment variables](#environment-variables)
4. [Replit workflow](#replit-workflow)
5. [GitHub workflow](#github-workflow)
6. [Vercel deployment](#vercel-deployment)
7. [Supabase operations](#supabase-operations)
8. [Code conventions](#code-conventions)
9. [Adding a module](#adding-a-module)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| bun | ≥ 1.1 | Package manager and runtime |
| Node.js | ≥ 20 (22 recommended) | Required by some Supabase tooling |
| Supabase CLI | Latest | For local DB operations |
| Git | Any | |

Install bun: `curl -fsSL https://bun.sh/install | bash`

---

## Local development

### First-time setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/rqm1.git
cd rqm1

# 2. Install dependencies
bun install

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env — see Environment Variables section below

# 4. Start the dev server
bun run dev
```

The app starts on **http://localhost:5000**.

### Available scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Start Vite dev server with HMR on port 5000 |
| `bun run build` | Production build (outputs to `dist/`) |
| `bun run preview` | Preview the production build locally |
| `bun run typecheck` | Run TypeScript type-checking without emitting files |
| `bun run lint` | Run ESLint across the whole codebase |
| `bun run lint:fix` | Auto-fix ESLint issues |
| `bun run format` | Format with Prettier |
| `bun run format:check` | Check formatting without writing |

### File watching and HMR

TanStack Router generates `src/routeTree.gen.ts` automatically whenever you add, rename, or delete a file inside `src/routes/`. You never edit `routeTree.gen.ts` manually.

Similarly, the `mcpPlugin` regenerates the MCP route files (`src/routes/mcp.ts`, `src/routes/[.mcp]/`, `src/routes/[.well-known]/`) when `src/lib/mcp/index.ts` changes. Files with the auto-generated banner at the top are managed by the plugin.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL (browser) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase publishable key (browser) |
| `VITE_SUPABASE_PROJECT_ID` | ✅ | Supabase project ref ID (browser) |
| `SUPABASE_URL` | ✅ | Supabase project URL (SSR/server fns) |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase publishable key (SSR/server fns) |
| `SUPABASE_PROJECT_ID` | ✅ | Supabase project ref (SSR/server fns) |
| `LOVABLE_API_KEY` | Optional | Lovable AI Gateway — required for AI Core to work |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Privileged server-side Supabase access |
| `SESSION_SECRET` | Optional | Session signing secret |

Only `VITE_*` variables are injected into the browser bundle. All others are server-only.

### Supabase publishable keys

The project uses the newer `sb_publishable_*` style API keys. These are opaque strings, not JWTs. The Supabase client in `src/integrations/supabase/client.ts` handles the `Authorization` header correctly for both old and new key formats.

---

## Replit workflow

### Running the project

The **Start application** workflow runs `bun run dev` and serves on port 5000. It starts automatically when you open the Replit workspace.

If the workflow is stopped, click **Run** or restart it from the Workflows panel.

### Environment secrets

In Replit, environment variables are stored as Secrets (not in `.env`). Set them under **Tools → Secrets**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_PROJECT_ID`
- `LOVABLE_API_KEY` *(optional)*
- `SESSION_SECRET`

The `.env` file in the repository is used for local development only. Replit Secrets override it at runtime.

### File watcher limits

Replit containers have a low `inotify` limit. The Vite config excludes `.cache/`, `node_modules/`, and `.git/` from the watcher to stay within the limit. Do not remove the `server.watch.ignored` block from `vite.config.ts`.

### Installing new packages

```bash
bun add <package>        # production dependency
bun add -d <package>     # dev dependency
```

The workflow restarts automatically after a package installation completes.

---

## GitHub workflow

### Branch strategy

```
main          Production-ready code. Protected branch.
develop       Integration branch. PRs are merged here first.
feature/*     New features.
fix/*         Bug fixes.
chore/*       Tooling, docs, dependencies.
```

### Commit convention

Commits follow **Conventional Commits** enforced by `commitlint`:

```
feat: add viewport search debouncing
fix: correct cluster colour for property type
chore: update supabase-js to 2.111
docs: document auth flow in ARCHITECTURE.md
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`.

Commits are validated by the Husky `commit-msg` hook. The `pre-commit` hook runs `lint-staged` (ESLint + Prettier on staged files).

### Pull request workflow

1. Branch from `main` (or `develop` if used).
2. Make your changes and commit following Conventional Commits.
3. Open a PR against `main`. Fill in the pull request template.
4. CI runs automatically:
   - TypeScript check (`tsc --noEmit`)
   - ESLint
   - Prettier format check
   - CodeQL security analysis (on push to main)
   - Dependency Review (on PRs)
5. Merge after review approval.

### Dependabot

Dependabot is configured (`.github/dependabot.yml`) to open weekly PRs for npm and GitHub Actions dependency updates. Review and merge or close these promptly.

### CodeQL

CodeQL security scanning runs on push to `main` and on pull requests. Results appear in the **Security → Code scanning** tab of the repository.

---

## Vercel deployment

TanStack Start v1 produces a Node.js-compatible SSR bundle. Vercel can serve it using the **Node.js** serverless runtime.

### Setup

1. **Connect repository** — Import the GitHub repository in the Vercel dashboard.

2. **Build configuration**

   | Setting | Value |
   |---|---|
   | Framework Preset | Other |
   | Build Command | `bun run build` |
   | Output Directory | `dist` |
   | Install Command | `bun install` |
   | Node.js Version | 22.x |

3. **Environment variables** — Add all required env vars (see table above) in **Project Settings → Environment Variables**. Set them for Production, Preview, and Development environments as needed.

4. **Configure nitro preset** for Vercel by updating `vite.config.ts`:

   ```ts
   // vite.config.ts
   import { defineConfig } from "vite";
   import react from "@vitejs/plugin-react";
   import tailwindcss from "@tailwindcss/vite";
   import { tanstackStart } from "@tanstack/react-start/plugin/vite";
   import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

   export default defineConfig({
     plugins: [
       tanstackStart({ server: { entry: "server" } }),
       react(),
       tailwindcss(),
       mcpPlugin(),
     ],
     // ... existing resolve/server config
   });
   ```

   > **Note:** TanStack Start's Vercel adapter support is evolving. Check the [TanStack Start deployment docs](https://tanstack.com/start/latest/docs/framework/react/deployment) for the latest recommended approach when you are ready to deploy.

5. **Deploy** — Push to `main` (or your configured production branch). Vercel builds and deploys automatically.

### Preview deployments

Every pull request gets a unique preview URL from Vercel. These run the full SSR app against your production Supabase project by default. Create a separate Supabase project for staging if you need data isolation.

---

## Supabase operations

### Applying migrations

Migrations live in `supabase/migrations/` and must be applied in filename order. Apply them via the Supabase dashboard SQL editor or the CLI:

```bash
supabase db push           # push local migrations to remote project
supabase db reset          # reset local dev DB and re-apply all migrations
```

### Adding a migration

```bash
supabase migration new <description>
# Edit the generated file in supabase/migrations/
```

Commit the migration file alongside the application code that depends on it.

### Regenerating TypeScript types

After any schema change, regenerate `src/integrations/supabase/types.ts`:

```bash
supabase gen types typescript \
  --project-id <your-project-ref> \
  > src/integrations/supabase/types.ts
```

Do not edit `types.ts` manually — it is overwritten by this command.

### Row Level Security

RLS is enabled on every table. The general pattern:
- `anon` role can read published entities and public profiles.
- `authenticated` role can read/write their own rows (enforced by `auth.uid() = owner_id`).
- Server functions that need privileged access use the `SUPABASE_SERVICE_ROLE_KEY` to create a separate admin client — this key must **never** reach the browser.

---

## Code conventions

### Server functions vs API routes

Use **server functions** (`.functions.ts` files, `createServerFn()`) for typed RPC-style calls from React components. Use **API routes** (`src/routes/api/*.ts`) only when you need raw HTTP semantics (streaming responses, webhooks, etc.).

The AI chat endpoint at `src/routes/api/chat.ts` uses a raw `POST` handler because it streams a response — this cannot be expressed with a server function.

### Imports

Use the `@/` alias for all imports from `src/`:

```ts
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
```

Icons always import from `@/os/icons`, never directly from `lucide-react`.

### State management

| Concern | Tool |
|---|---|
| Server data (lists, entities, messages) | TanStack Query via `useQuery` / `useMutation` |
| UI state scoped to OS shell | Zustand stores in `src/os/stores/` |
| Form state | react-hook-form + zod |
| URL state | TanStack Router `search` params |

Do not store server data in Zustand — keep Zustand for pure UI/shell state.

### TypeScript

- Strict mode is enabled. Do not use `any` without a comment justifying it.
- Prefer `type` over `interface` for object shapes.
- Server function return types are inferred — do not annotate them manually, as this breaks type inference across the client/server boundary.

### Styling

- Use Tailwind utility classes. No separate CSS files except `src/styles.css` and `src/design/tokens.css`.
- Use `cn()` from `@/lib/utils` to merge conditional classes.
- Design tokens (colours, radii, spacing) are defined as CSS variables in `src/design/tokens.css`.

---

## Adding a module

1. **Add the planet** to `src/os/galaxy/planets.ts` — set `status: "soon"` initially.
2. **Create the route file** at `src/routes/<module-name>.tsx` or `src/routes/_authenticated/<module-name>.tsx`.
3. **Create the module directory** at `src/modules/<module-name>/` with:
   - `<module-name>.functions.ts` — server functions
   - `types.ts` — TypeScript types
   - Component files
4. **Add a migration** if the module needs new tables.
5. **Regenerate types** after applying the migration.
6. **Update planet status** to `"ready"` and add `route` once the module is complete.

---

## Troubleshooting

### `ENOSPC: System limit for number of file watchers reached`

Occurs on Replit (low inotify limits). The `server.watch.ignored` block in `vite.config.ts` prevents this by excluding the bun cache. Do not remove it.

### Blank page / 500 on first load

Check the dev server logs (`bun run dev` output). Common causes:
1. Missing environment variables — `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY` not set.
2. SSR error — look for the error in the server logs; `src/server.ts` normalises h3-swallowed errors.

### TypeScript errors after pulling changes

Run `bun install` first — a new dependency may have been added. Then regenerate types if a migration was added.

### `routeTree.gen.ts` is stale

The TanStack Router plugin regenerates this file on file-system changes inside `src/routes/`. If it seems stale, restart the dev server.

### Supabase auth not working locally

Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set in `.env`. The OAuth providers (Google, etc.) also need the correct redirect URIs configured in your Supabase Auth settings — add `http://localhost:5000/auth` for local development.

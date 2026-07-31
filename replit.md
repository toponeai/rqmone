# R.Q.M.1 — Global Interactive Earth & Galaxy OS

A living, interactive planet platform. Every object in the system — businesses, properties,
events, products — is a universal **Entity** placed on a real 3D Earth, wrapped in a
cinematic 3D "Galaxy Operating System" shell where each module is a planet.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR, server functions) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| 3D | three.js, @react-three/fiber, @react-three/drei, react-globe.gl |
| State | Zustand (OS stores), TanStack Query (server state) |
| Backend | Supabase (Postgres + PostGIS, Auth, Realtime, RLS) |
| AI | Lovable AI Gateway (streaming chat, AI Core assistant) |
| Package manager | bun |

## Running the project

```bash
bun install        # install dependencies
bun run dev        # start dev server on port 5000
bun run build      # production build (requires nitro for Cloudflare Workers)
bun run typecheck  # TypeScript type check
bun run lint       # ESLint
```

The dev server runs on **port 5000** (configured in `vite.config.ts` for Replit).

## Environment variables

All required backend values are already in `.env`. See `.env.example` for the full list.

Optional (for AI/privileged features):
- `LOVABLE_API_KEY` — AI Core assistant (streaming chat)
- `SUPABASE_SERVICE_ROLE_KEY` — privileged server-side Supabase access

## Replit setup notes

- `vite.config.ts` uses standard Vite plugins (no Lovable wrapper) for local dev
- `@lovable.dev/*` packages are preserved as dependencies (they provide auth, MCP tools, etc.)
- Production deployment targets Lovable Cloud / Cloudflare Workers (requires nitro)

## Project structure

```
src/
  routes/         file-based routes (api/, _authenticated/, mcp, etc.)
  os/             "Galaxy OS" kernel (galaxy3d, shell, stores, engines, commands, i18n)
  modules/        business modules (entity, maps, messaging, notifications, config)
  integrations/   Supabase + Lovable clients
  lib/mcp/        MCP tool implementations
  design/         design tokens
supabase/
  migrations/     SQL schema migrations
public/
  textures/       Earth globe textures
```

## User preferences

- Do not change application logic when making infrastructure/tooling changes
- Keep Lovable-specific packages where they serve a functional purpose
- Port 5000 is required for Replit webview

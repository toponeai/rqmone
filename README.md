# R.Q.M.1 — Global Interactive Earth & Galaxy OS

A living, interactive planet platform. Every object in the system — businesses, properties,
events, products — is a universal **Entity** placed on a real 3D Earth, wrapped in a
cinematic 3D "Galaxy Operating System" shell where each module is a planet.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR, server functions) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 (`src/styles.css`, `src/design/tokens.css`) + shadcn/ui |
| 3D | three.js, @react-three/fiber, @react-three/drei, react-globe.gl |
| State | Zustand (OS stores), TanStack Query (server state) |
| Backend | Lovable Cloud (Supabase: Postgres + PostGIS, Auth, Realtime, RLS) |
| AI | Lovable AI Gateway (streaming chat, AI Core assistant) |
| Agents | MCP server mounted at `/mcp` (OAuth 2.1 protected) |

## Project structure

```text
src/
  routes/            file-based routes (incl. api/, _authenticated/, mcp)
  os/                the "Galaxy OS" kernel
    galaxy3d/        three.js galaxy scene, planets, sun, starfield
    shell/           AppShell, docks, nav, planet navigator
    stores/          zustand stores (ui, window, command, search, create, notification)
    engines/         motion, particles, sound, themes
    commands/        universal command registry + bus
    i18n/            EN / AR locales (RTL supported)
  modules/           business modules (entity, maps, messaging, notifications, config)
  integrations/      generated Supabase + Lovable clients (do not edit)
  lib/mcp/           MCP tool implementations
  design/            design tokens
supabase/migrations/ SQL migrations (schema, RLS, PostGIS RPCs, triggers)
public/textures/     locally hosted Earth textures
```

## Getting started

```bash
bun install
cp .env.example .env   # fill in your backend values
bun run dev            # http://localhost:8080
```

Scripts: `dev`, `build`, `build:dev`, `preview`, `lint`, `format`.

## Database

All schema lives in `supabase/migrations/` and is applied in filename order.
Core objects:

- `entities` — one table for every object type (`type`, `title`, `description`, `published`,
  PostGIS `location`, `jsonb metadata`, `owner_id`), GIST-indexed
- `profiles` — created by trigger on user signup
- `conversations` / `messages` — realtime messaging
- `notifications` — with a fan-out trigger from new messages
- `ai_core_messages` — AI Core assistant history
- RPCs: viewport search, clustering (`entities_cluster`), `create_entity`

Row Level Security is enabled on every table; grants are issued per migration.

**Adding a new category** = one `entity_type` enum value + one registry entry in
`src/modules/config/entity-types.tsx`. No schema redesign.

## Environment variables

See `.env.example`. Only `VITE_*` values reach the browser; everything else is read inside
server function handlers. Never commit real secrets.

## Deployment

Deployed via Lovable (published at a `.lovable.app` domain). The app targets an edge
runtime (Cloudflare Workers), so avoid Node-only native dependencies in server code.

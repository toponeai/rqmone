# Architecture

R.Q.M.1 is a "living interactive Earth" platform. Every object in the system —
business, property, event, product — is a universal **Entity** placed on a real
3D Earth, wrapped in a cinematic "Galaxy Operating System" shell where each
module is a planet.

## Layers

```text
Browser
  Galaxy OS shell (AppShell, docks, windows, command bus)
    3D layer: Three.js / R3F galaxy  +  react-globe.gl Earth
    Modules: entity, maps, messaging, notifications, config
  TanStack Router (file-based routes, SSR)
Edge runtime (Cloudflare Workers)
  SSR entry, server functions (createServerFn), API routes, MCP server
Lovable Cloud (Supabase)
  Postgres + PostGIS, Auth, Realtime, Storage, RLS
Lovable AI Gateway
  Streaming chat models for AI Core
```

## Source layout

```text
src/
  routes/            file-based routes (api/, _authenticated/, mcp)
  os/                Galaxy OS kernel
    galaxy3d/        Three.js scene, planets, sun, starfield
    galaxy/          planet registry and groupings
    shell/           AppShell, docks, nav, planet navigator
    stores/          zustand stores (ui, window, command, search, create, notification)
    engines/         motion, particles, sound, themes
    commands/        universal command registry + bus
    i18n/            EN / AR locales (RTL supported)
  modules/           business modules
  integrations/      generated Supabase + Lovable clients (do not edit)
  lib/mcp/           MCP tool implementations
  design/            design tokens
```

## Core principles

1. **Everything is an Entity.** One table, one type enum, one registry. Adding a
   category never means new schema.
2. **The kernel owns chrome.** Routes render content; `AppShell` owns nav,
   docks, windows and the command palette.
3. **Client-only 3D.** Three.js and globe code load behind `ClientOnly` +
   `React.lazy`; SSR never evaluates them.
4. **Server boundaries.** Internal logic is typed RPC via `createServerFn`;
   external HTTP callers use file routes under `src/routes/api/`.
5. **Tokens, not hex.** All colour, gradient and shadow values are semantic
   tokens in `src/design/tokens.css` / `src/styles.css`.

## State model

- **Server state** — TanStack Query, hydrated from route loaders using
  `ensureQueryData` + `useSuspenseQuery`.
- **OS state** — Zustand stores, one per concern; selectors must be stable to
  avoid render loops (`useSyncExternalStore` snapshots are cached).
- **Realtime** — Supabase channels for messages and notifications.

## Rendering pipeline

`/` orchestrates a mode machine (`galaxy` | `transition` | `earth`). The galaxy
scene renders the sun (AI Core), orbiting planet modules and a starfield; the
Earth mode renders the marketplace globe with clustered entity pins.

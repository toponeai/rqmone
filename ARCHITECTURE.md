# Architecture

R.Q.M.1 is a full-stack SSR application built on **TanStack Start v1** (React 19, file-based routing, server functions). Every UI layer — from the 3D galaxy to the interactive globe — runs inside a single unified process with shared context.

---

## Table of Contents

1. [Tech stack](#tech-stack)
2. [Folder structure](#folder-structure)
3. [Application flow](#application-flow)
4. [OS kernel (`src/os/`)](#os-kernel-srcos)
5. [Feature modules (`src/modules/`)](#feature-modules-srcmodules)
6. [Routes (`src/routes/`)](#routes-srcroutes)
7. [Integrations (`src/integrations/`)](#integrations-srcintegrations)
8. [Library (`src/lib/`)](#library-srclib)
9. [Database schema](#database-schema)
10. [Auth flow](#auth-flow)
11. [Data flow](#data-flow)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start v1 (SSR, server functions, file-based routes) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| 3D | three.js, @react-three/fiber, @react-three/drei, react-globe.gl |
| State | Zustand (OS/shell state), TanStack Query (server state cache) |
| Backend | Supabase — Postgres + PostGIS, Auth, Realtime, Row Level Security |
| AI | Lovable AI Gateway (OpenAI-compatible, streaming) |
| MCP | @lovable.dev/mcp-js, OAuth 2.1 protected endpoint at `/mcp` |
| Build | Vite 8, bun |
| Language | TypeScript 5 (strict) |

---

## Folder structure

```
/
├── src/
│   ├── routes/               # File-based routing (TanStack Router)
│   │   ├── __root.tsx        # HTML shell, global providers, auth listener
│   │   ├── index.tsx         # / — Galaxy + Earth landing page
│   │   ├── auth.tsx          # /auth — Sign in / sign up
│   │   ├── entity.$id.tsx    # /entity/:id — Public entity detail page
│   │   ├── _authenticated/   # Auth-gated route group
│   │   │   ├── route.tsx     # beforeLoad guard — redirects to /auth if unauthenticated
│   │   │   ├── ai-core.tsx   # /ai-core — AI assistant chat
│   │   │   ├── messages.tsx  # /messages — 1:1 and group chat
│   │   │   └── manage.tsx    # /manage — User's entity dashboard
│   │   ├── api/
│   │   │   └── chat.ts       # POST /api/chat — streaming AI endpoint
│   │   ├── [.mcp]/           # MCP REST protocol routes (auto-generated)
│   │   ├── [.well-known]/    # OAuth protected resource metadata (auto-generated)
│   │   └── mcp.ts            # /mcp — MCP WebSocket/HTTP handler (auto-generated)
│   │
│   ├── os/                   # "Galaxy OS" kernel — shell, navigation, engines
│   │   ├── shell/            # AppShell, docks, top nav
│   │   ├── galaxy/           # Planet registry and Coming Soon UI
│   │   ├── galaxy3d/         # Three.js 3D galaxy scene
│   │   ├── stores/           # Zustand stores (window, ui, command, search, create, notification)
│   │   ├── engines/          # motion, themes, sound, particles
│   │   ├── commands/         # Command palette registry and built-in commands
│   │   ├── i18n/             # EN / AR translations, useT() hook, RTL support
│   │   ├── icons/            # Semantic icon aliases over lucide-react
│   │   └── windows/          # Floating window manager and FloatingWindow component
│   │
│   ├── modules/              # Business feature modules
│   │   ├── entity/           # Universal spatial entity CRUD and querying
│   │   ├── maps/             # 3D globe renderer and viewport geometry
│   │   ├── messaging/        # Conversations, messages, realtime hooks
│   │   ├── notifications/    # Notification list, unread count, realtime hooks
│   │   └── config/           # Static entity-type registry (labels, colours, icons)
│   │
│   ├── integrations/
│   │   ├── supabase/         # Auto-generated client, types, auth middleware
│   │   └── lovable/          # OAuth sign-in via Lovable broker
│   │
│   ├── lib/                  # Shared utilities and server-side helpers
│   │   ├── ai-core.functions.ts   # Server fns: load/clear AI conversation history
│   │   ├── ai-gateway.server.ts   # Lovable AI Gateway provider factory
│   │   ├── error-capture.ts       # Out-of-band error capture for h3 swallowed throws
│   │   ├── error-page.ts          # Static HTML error fallback renderer
│   │   ├── lovable-error-reporting.ts  # window.__lovableEvents shim
│   │   ├── utils.ts               # cn() tailwind class merger
│   │   └── mcp/                   # MCP tool definitions (create-entity, search, etc.)
│   │
│   ├── components/
│   │   ├── ui/               # shadcn/ui component library
│   │   └── ai-elements/      # AI chat UI components (Message, PromptInput, Conversation)
│   │
│   ├── hooks/
│   │   ├── use-session.ts    # Supabase auth session hook
│   │   └── use-mobile.tsx    # Viewport breakpoint hook
│   │
│   ├── design/               # CSS design tokens (colours, spacing, radii)
│   ├── styles.css            # Tailwind CSS v4 entry + global styles
│   ├── router.tsx            # Router factory with QueryClient context
│   ├── server.ts             # SSR entry — normalises catastrophic h3 errors
│   ├── start.ts              # TanStack Start factory — registers global middleware
│   └── routeTree.gen.ts      # Auto-generated route tree (do not edit)
│
├── supabase/
│   └── migrations/           # SQL migrations applied in filename order
│
├── public/
│   └── textures/             # Earth globe WebGL textures (locally hosted)
│
├── docs/                     # Extended documentation
├── vite.config.ts            # Vite + TanStack Start + Tailwind + MCP plugins
├── tsconfig.json             # Strict TypeScript (bundler mode)
└── package.json              # bun workspace, scripts
```

---

## Application flow

### Boot sequence

```
bun run dev
  └─ vite dev
       ├─ tanstackStart plugin  →  discovers src/routes/, generates routeTree.gen.ts
       ├─ mcpPlugin             →  emits src/routes/mcp.ts, [.mcp]/, [.well-known]/
       └─ dev server on :5000

HTTP request arrives
  └─ src/server.ts (SSR entry)
       └─ @tanstack/react-start/server-entry
            └─ src/start.ts (TanStack Start factory)
                 ├─ requestMiddleware: errorMiddleware  (wraps everything in try/catch)
                 └─ functionMiddleware: attachSupabaseAuth  (attaches Bearer token to server fns)
                      └─ TanStack Router  →  matches route, runs loaders, renders to HTML
```

### Request lifecycle

1. **SSR render** — Router matches the URL, runs any `loader` / `beforeLoad` hooks server-side.
2. **Hydration** — Client receives the HTML + serialised loader data; React hydrates in place.
3. **Server functions** — Components call typed server functions (`.functions.ts` files); the client middleware attaches the Supabase session token automatically.
4. **Realtime** — Supabase Realtime subscriptions in `messaging/realtime.ts` and `notifications/realtime.ts` invalidate TanStack Query caches on new events.

### Route guard flow

```
/_authenticated/* routes
  └─ beforeLoad()  →  supabase.auth.getUser()
        ├─ success  →  injects { user } into route context
        └─ failure  →  redirect("/auth?redirect=<current-path>")
```

---

## OS kernel (`src/os/`)

The OS kernel is the permanent UI frame that wraps every route. It is initialised once in `AppShell.tsx` and never unmounts.

### Shell (`src/os/shell/`)

`AppShell.tsx` is the root layout. It renders:
- `TopNav` — search bar, create button, language switcher, auth controls
- `LeftDock` — planet/module navigation icons
- `RightDock` — profile, notifications, messages, settings icons
- `PlanetNavigator` — overlay 2D orbital map of all modules
- `WindowManager` — renders the floating window stack
- `<children>` — current route output inside `CenterWorkspace`

### Galaxy (`src/os/galaxy/`)

`planets.ts` is the single source of truth for the module registry. Each `Planet` entry declares:
- `id`, `labelKey` (i18n key), `icon`, `color`, `size`
- `status: "ready" | "soon"` — controls whether clicking navigates or shows the Coming Soon overlay
- `route` — TanStack Router destination
- `galaxy` — which orbital ring group it belongs to

Both the 2D `PlanetNavigator` and the 3D `GalaxyScene` read from this registry, keeping them in sync.

### Galaxy3D (`src/os/galaxy3d/`)

A lazily-loaded Three.js scene (`GalaxyScene.tsx`) mounted in `src/routes/index.tsx`. Features:
- Orbital rings with planet meshes
- Sun with bloom post-processing
- Particle starfield
- Camera flight animation between galaxy and Earth views
- `useGalaxyStore` Zustand store tracks the current navigation mode (`galaxy` | `earth`)

### Stores (`src/os/stores/`)

| Store | Purpose |
|---|---|
| `window.store` | Floating window positions, sizes, z-index, drag state |
| `ui.store` | Theme, platform detection, dock visibility |
| `command.store` | Command palette open/closed state |
| `search.store` | Global search query and panel visibility |
| `create.store` | Entity creation dialog state |
| `notification.store` | Toast queue for realtime notification popups |

### Engines (`src/os/engines/`)

| Engine | Purpose |
|---|---|
| `motion.ts` | Animation duration and easing constants |
| `themes.ts` | CSS variable theme definitions (Deep Space, Aurora, …) |
| `sound.ts` | `play(soundId)` function for UI sound effects |
| `particles.ts` | Particle effect helpers |

### Commands (`src/os/commands/`)

A singleton `CommandRegistry` lets any module register keyboard-triggerable actions. The command bus decouples UI triggers (keyboard shortcut, palette entry, dock button) from execution.

### i18n (`src/os/i18n/`)

- Two locales: `en` (English) and `ar` (Arabic + RTL)
- `useT()` hook returns a type-safe translation function
- `AppShell` sets `document.lang` and `document.dir` when the locale changes

---

## Feature modules (`src/modules/`)

### Entity (`src/modules/entity/`)

The universal data model. Every object on the map — business, property, event, product — is an `entities` row.

- **Server functions** in `entity.functions.ts`: `getEntitiesInViewport`, `getEntityClusters`, `searchEntities`, `createEntity`, `editEntity`, `deleteEntity`, `getEntityById`
- Spatial queries use PostGIS RPCs (`entities_cluster`, `create_entity`) for clustering and viewport filtering
- `types.ts` defines `EntityPoint`, `EntityCluster`, `EntityType`
- `CreateEntityDialog` / `EditEntityDialog` — form UI using react-hook-form + zod

### Maps (`src/modules/maps/`)

- `InteractiveEarth.tsx` — react-globe.gl wrapper; renders pins and clusters; emits `onCameraChange` for viewport-aware re-querying
- `viewport.ts` — `cameraToBbox()` converts globe altitude + lat/lng to a bounding box for server queries; `altitudeToZoom()` converts WebGL altitude to a zoom level used to switch between raw points and clusters

### Messaging (`src/modules/messaging/`)

- `messaging.functions.ts` — server functions: `listConversations`, `getMessages`, `sendMessage` (rate-limited), `createOrGetConversation`, `markConversationRead`, `searchUsers`
- `realtime.ts` — `useMessagesRealtime` and `useConversationsRealtime` subscribe to Postgres changes and invalidate TanStack Query caches
- All messaging data is RLS-scoped to the authenticated user

### Notifications (`src/modules/notifications/`)

- `notifications.functions.ts` — `listNotifications`, `getUnreadCount`, `archiveNotification`, `markAllRead`
- `realtime.ts` — `useNotificationsRealtime` pushes toast notifications via `notification.store` on new rows
- A Postgres trigger in `supabase/migrations/` fans out a notification row on every new message

### Config (`src/modules/config/`)

`entity-types.tsx` is a static registry mapping each `EntityType` enum value to:
- Display label (i18n-ready)
- Lucide icon component
- Globe pin colour
- Custom metadata field definitions

Adding a new category = one entry here + one `entity_type` enum value in a migration.

---

## Routes (`src/routes/`)

| Path | Auth | Description |
|---|---|---|
| `/` | Public | Galaxy 3D scene + Interactive Earth; entity search and clustering |
| `/auth` | Public | Email/password + OAuth sign in and sign up |
| `/entity/:id` | Public | Entity detail with embedded globe, SEO meta tags |
| `/_authenticated/ai-core` | ✅ | Streaming AI assistant with persisted history |
| `/_authenticated/messages` | ✅ | Real-time 1:1 / group chat |
| `/_authenticated/manage` | ✅ | User's entity management dashboard |
| `/api/chat` | Server | POST — streaming AI response endpoint |
| `/mcp` | OAuth 2.1 | MCP WebSocket/HTTP protocol handler |
| `/.mcp/list-tools` | OAuth 2.1 | MCP REST: tool manifest |
| `/.mcp/invoke-tool/:tool` | OAuth 2.1 | MCP REST: tool invocation |
| `/.well-known/oauth-protected-resource` | Public | OAuth resource metadata |
| `/.lovable.oauth.consent` | Public | OAuth consent screen for MCP clients |

The `_authenticated` prefix creates a layout route that runs a `beforeLoad` guard on every child. If `supabase.auth.getUser()` fails, the user is redirected to `/auth` with a `?redirect=` parameter.

---

## Integrations (`src/integrations/`)

### Supabase

| File | Purpose |
|---|---|
| `client.ts` | Singleton Supabase client using `VITE_SUPABASE_*` env vars (browser) with `process.env.*` fallback (SSR) |
| `auth-attacher.ts` | **Client-side** TanStack Start middleware — attaches `Authorization: Bearer <token>` header to all outgoing server function calls |
| `auth-middleware.ts` | **Server-side** TanStack Start middleware — validates the Bearer token and injects an authenticated `supabase` client + `userId` into the server function context |
| `types.ts` | Auto-generated from `supabase gen types typescript` — do not edit manually |

### Lovable (`src/integrations/lovable/`)

`createLovableAuth()` handles the OAuth popup/redirect flow for Google, Apple, Microsoft, and Lovable providers. After a successful OAuth exchange, it calls `supabase.auth.setSession()` with the returned tokens.

---

## Library (`src/lib/`)

| File | Purpose |
|---|---|
| `utils.ts` | `cn()` — merges Tailwind classes with `clsx` + `tailwind-merge` |
| `ai-gateway.server.ts` | Returns an OpenAI-compatible provider pointed at `ai.gateway.lovable.dev` |
| `ai-core.functions.ts` | Server functions for loading and clearing AI chat history from `ai_core_messages` |
| `error-capture.ts` | Global `error` / `unhandledrejection` listener; stores the last error for `server.ts` to retrieve when h3 swallows an SSR throw |
| `error-page.ts` | Renders a minimal inline HTML error page (no JS dependency) |
| `lovable-error-reporting.ts` | Calls `window.__lovableEvents.captureException` if available (no-op outside Lovable Cloud) |
| `mcp/` | `defineTool` implementations: `search-entities`, `list-my-entities`, `create-entity`, `list-notifications` |

---

## Database schema

All schema lives in `supabase/migrations/` and is applied in filename order.

| Table | Purpose | RLS |
|---|---|---|
| `profiles` | One row per auth user; created by trigger on `auth.users` insert | ✅ |
| `entities` | Universal spatial object store; PostGIS `location`, GIST index, `type` enum, `jsonb metadata` | ✅ |
| `conversations` | Conversation threads | ✅ |
| `conversation_participants` | Many-to-many: users ↔ conversations | ✅ |
| `messages` | Individual chat messages; triggers update `conversations.last_message_at` and fan-out `notifications` | ✅ |
| `notifications` | User notification inbox; message trigger creates rows automatically | ✅ |
| `ai_core_messages` | AI Core conversation history; scoped per user | ✅ |

### Key Postgres objects

- **RPCs**: `entities_cluster(bbox, zoom, limit)` — returns spatially clustered points; `create_entity(...)` — validates and inserts an entity
- **Triggers**: `on_auth_user_created` — creates a `profiles` row; message insert trigger fans out `notifications` rows to all conversation participants
- **Extensions**: `postgis`, `uuid-ossp`

---

## Auth flow

```
Sign in via email/password
  └─ supabase.auth.signInWithPassword()
       └─ session stored in localStorage
            └─ onAuthStateChange event fires
                 └─ router.invalidate() + queryClient.invalidateQueries()

Sign in via OAuth (Google / Apple / Microsoft / Lovable)
  └─ lovable.auth.signInWithOAuth(provider)
       └─ popup/redirect to OAuth broker
            └─ supabase.auth.setSession(tokens)
                 └─ same auth state change flow as above

Server function call (authenticated)
  client: attachSupabaseAuth middleware → adds Authorization: Bearer <token>
  server: requireSupabaseAuth middleware → validates token, injects supabase client
```

---

## Data flow

```
UI component
  └─ useQuery({ queryFn: useServerFn(serverFunction) })
       └─ serverFunction (runs on server)
            └─ supabase RPC / query
                 └─ Postgres with RLS (scoped to authenticated user)

Realtime update
  └─ supabase.channel().on('postgres_changes', …)
       └─ queryClient.invalidateQueries([key])
            └─ React re-render with fresh data
```

# R.Q.M.1 — Milestone 1: Interactive Earth + Universal Entity Core

This first slice builds the foundation every later engine plugs into: one universal entity model, a live 3D Earth as the homepage, geospatial storage/queries, and unified search. Later phases (auth deep-dive, wallet, ads, AI, live streams) attach to this without redesign.

## What you'll get

- A rotating **3D Earth** landing page with glowing entity points, ambient starfield, and a search bar.
- A **universal entities system**: Businesses, Properties, Events, and Products all stored and displayed through one architecture.
- **Click a point on Earth** → entity detail overlay. **Click empty space / search** → filter what's shown.
- A **"Add to Earth"** flow to create entities with a location (map-pick), which appear live on the globe.
- Real backend: PostgreSQL + PostGIS, row-level security, geospatial viewport queries.

## Scope of this milestone

Included: Earth UI, entity data model, create/browse/detail, category filtering, text + geo search, backend with PostGIS.
Deferred to later phases (per the master spec): wallet/payments, ads engine, AI recommendations, live streams, messaging, notifications, mobile app, admin app. The schema and module boundaries are laid out so these attach cleanly.

## Architecture

Adapting the spec's monorepo to this single TanStack Start app: the "packages" become internal modules under `src/` (entity, maps, search, config, types) with clean seams, rather than separate published packages. This keeps the "everything is an entity / plug-in engines" philosophy without the monorepo overhead.

```text
src/
  routes/
    __root.tsx              app shell, meta, auth-state subscriber
    index.tsx               Interactive Earth homepage
    entity.$id.tsx          entity detail (shareable, SSR head)
    _authenticated/         create/manage (gated) — added when auth lands
    api/                    server routes if needed later
  modules/
    entity/                 entity types, DTOs, server fns (CRUD, queries)
    maps/                   globe component, viewport→bbox helpers, point layer
    search/                 search server fn + filter UI
    config/                 entity-type registry (icons, colors, fields)
  integrations/supabase/    generated client/types (via Lovable Cloud)
  components/ui/            shadcn primitives
```

### Universal entity model (matches the spec)

```text
entity_type  enum: business | property | event | product
             (extensible — adding a type = one enum value + registry entry)

entities
  id            uuid pk
  type          entity_type
  owner_id      uuid  (nullable now; wired to auth later)
  title         text
  description   text
  published     boolean default true
  location      geometry(Point, 4326)   -- PostGIS
  metadata      jsonb                    -- type-specific fields
  created_at    timestamptz
  updated_at    timestamptz
```

- GIST index on `location` for fast geospatial/viewport queries.
- `metadata` jsonb holds per-type fields (price, event date, business hours, etc.), so new categories never require schema changes — the spec's core requirement.
- RLS: public can SELECT `published = true`; owner-scoped write policies stubbed now, enforced once auth is added. Full `GRANT`s included in the migration.

### Data flow

- **Homepage load** → server function `getEntitiesInViewport(bbox, types, query)` returns lightweight points (id, type, title, lat, lng) via a PostGIS bbox query, primed through TanStack Query loader.
- **Globe** renders points colored by type; hover shows title, click opens detail.
- **Search bar** updates URL search params (`q`, `types`) → re-queries → globe + a results list update together.
- **Entity detail** (`/entity/$id`) is its own SSR route with per-entity `head()` (title, og:title, og:description) so entities are shareable/indexable — the spec's discoverability goal.

## Rendering

- `react-globe.gl` for the 3D Earth (WebGL, points layer, auto-rotate, atmosphere). Rendered client-only (it needs `window`), with an SSR-safe fallback so the route still server-renders meta.
- Category colors + icons from the `config` entity-type registry.

## Build steps

1. **Enable Lovable Cloud** (database, PostGIS, auth-ready, storage).
2. **Migration**: `entity_type` enum, `entities` table, PostGIS `location` + GIST index, RLS policies, GRANTs, plus a small seed of demo entities across the four types and several cities so the Earth looks alive immediately.
3. **Entity module**: DTOs/types, `getEntitiesInViewport`, `getEntityById`, `createEntity` server functions (public read via publishable client; create stubbed open now, gated at auth phase).
4. **Config registry**: the four entity types with labels, colors, icons, and their metadata field definitions.
5. **Maps module**: client-only `<InteractiveEarth>` (react-globe.gl), viewport→bbox helper, point layer, hover/click handlers.
6. **Homepage** (`index.tsx`): Earth + floating search/filter bar + slide-in results/detail overlay; replaces the placeholder.
7. **Entity detail route** with SSR `head()`.
8. **"Add to Earth"** create form with map location picker + type-specific fields driven by the registry.
9. **Design system**: distinctive dark, space/aurora aesthetic via semantic tokens in `src/styles.css` (no hardcoded colors), a real app title/description/OG meta in `__root.tsx`.
10. **Verify**: build, seed data renders on the globe, search/filter works, create adds a live point, entity detail loads.

## Technical notes

- Backend logic uses TanStack `createServerFn` (not Supabase Edge Functions); public reads use a publishable-key client with narrow `TO anon` SELECT policies; PostGIS bbox filtering keeps payloads small (viewport loading from the spec's Maps Engine).
- Clustering is approximated in this milestone via viewport limiting + point sizing; true server-side clustering can be added later without changing the data model.
- The entity-type registry + jsonb metadata is what delivers the spec's "never redesign to add a category" guarantee.

## Next milestones (not built now)

Auth (email + Google) & ownership → Marketplace/Wallet → AI recommendations & search → Live/messaging → Ads & analytics dashboards → Admin/mobile. Each attaches to the entity engine established here.
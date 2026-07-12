# R.Q.M.1 — Milestone 3: Earth scale-up (Phase 3 finishing)

Prepare the interactive Earth for 10M+ entities. Today the globe fetches up to 2,000 points across the whole planet regardless of what you're looking at — fine for a demo, breaks past ~50k entities. This milestone adds true **viewport-driven loading** and **server-side clustering**, so the Earth stays fluid at any scale.

## What you'll get

- **Server-side clustering** — from space you see aggregated clusters ("2,341 entities in this region") instead of thousands of individual pins.
- **Zoom-to-cluster** — click a cluster and the globe smoothly zooms into that region, revealing its child clusters or individual points.
- **Viewport-driven queries** — the Earth only fetches what's visible in the current camera view, with 300ms debounce as you rotate/zoom.
- **Zoom-adaptive precision** — as you zoom in, the server splits clusters into finer cells automatically. Zoom in far enough and you see individual entities.
- **Same look and feel** — clusters use the existing type colors; the search bar, filters and "Add to Earth" flow all keep working unchanged.

## Architecture

### Backend: grid-hash clustering (PostGIS)

New RPC `entities_cluster(bbox, precision, filter_types, search_query)` that quantizes each entity's coordinates onto a grid whose cell size is derived from `precision` (higher precision = finer cells), groups by cell, and returns:

```text
cluster_key  text           -- deterministic per cell
lat, lng     double         -- centroid of the cell
count        integer        -- number of entities in the cell
type         entity_type?   -- dominant type when the cell is single-type, else null
sample_id    uuid?          -- when count = 1, the actual entity id (so click opens detail directly)
```

Why grid-hash and not `ST_ClusterKMeans`: KMeans is O(N) *per query* and non-deterministic (clusters flicker as the viewport shifts). Grid-hashing is a single indexed `GROUP BY floor(lng/step), floor(lat/step)` — stable, fast, and gets faster as PostGIS narrows the bbox with the existing GIST index. Clusters at the same zoom appear in the same place every time.

Precision → step-size table (roughly one screen ≈ 30 cells across at each zoom):

```text
precision 3   → ~10°     (viewing continents)
precision 5   → ~2.5°    (large countries)
precision 7   → ~0.6°    (metro area)
precision 9   → ~0.15°   (neighborhood)
precision 11+ → return raw points instead of clusters
```

The existing `entities_in_viewport` RPC keeps working for the highest zoom levels; the client picks between them based on camera altitude.

### Frontend: viewport-aware map

- `InteractiveEarth` gains an `onViewChange({ bbox, zoom })` callback fired from `controls`' change event, debounced 300ms.
- New `src/modules/maps/viewport.ts` helpers: derive a lat/lng bbox from the globe camera (lat, lng, altitude), and map altitude → zoom → precision.
- `src/routes/index.tsx` holds viewport state, switches between `getEntityClusters` (low zoom) and `getEntitiesInViewport` (high zoom) via one `useQuery` per view.
- Globe layers:
  - **Points layer** — unchanged, used at high zoom.
  - **Clusters layer** — rendered via globe-gl's `htmlElementsData` (small circular badges showing count, sized by `log10(count)`). Cluster color = dominant type color or neutral primary when mixed.
- Click a cluster → `pointOfView` animates to its centroid with a lower altitude, which triggers a new fetch at higher precision. Click a cluster whose `count === 1` → open the entity directly.
- Search + type filters flow into both RPCs unchanged.

### Data flow at a glance

```text
camera change ──debounce 300ms──▶ derive bbox, zoom, precision
                                   │
                          precision ≤ 10 ?
                          ┌──── yes ────┐        ┌──── no ────┐
                          ▼             ▼        ▼            ▼
                    getEntityClusters              getEntitiesInViewport
                          │                              │
                          ▼                              ▼
                    cluster badges                  individual points
                    (click → zoom in)               (click → detail)
```

## Build steps

1. **Migration**: `entities_cluster` RPC (grid-hash `GROUP BY` on lat/lng cells, sizes derived from `precision`); add a partial GIST index `entities_location_published_gist` on `location` WHERE `published = true` for faster viewport queries at scale.
2. **Server functions**: add `getEntityClusters` in `src/modules/entity/entity.functions.ts`; extend `getEntitiesInViewport` to actually respect the passed bbox (already does — verify).
3. **Viewport helpers** in `src/modules/maps/viewport.ts`: `cameraToBbox({lat, lng, altitude})`, `altitudeToZoom`, `zoomToPrecision`.
4. **`InteractiveEarth`** emits `onViewChange({ bbox, zoom, altitude })` from a debounced `controls('change')` handler, and accepts a new `clusters` prop rendered as `htmlElementsData`.
5. **Homepage** (`src/routes/index.tsx`) tracks viewport, chooses cluster vs point query, wires cluster clicks to zoom-in. Existing search/filter/create UX unchanged.
6. **Seed**: expand demo seed to ~2,000 entities (bulk-inserted across cities world-wide) so clustering is visibly meaningful in the demo. Existing hand-written seeds stay.
7. **Verify**: rotate/zoom the globe — cluster badges appear at low zoom with sensible counts; zooming in splits them; zooming to street level shows individual entities; adding a new entity appears in the correct cluster after invalidation.

## Technical notes

- Grid-hash uses `floor(ST_X(location) / step)` and `floor(ST_Y(location) / step)` grouped, so it benefits from the existing GIST index for the bbox pre-filter but does the grouping on already-filtered rows. Fast even at 10M rows because the bbox is what shrinks the working set.
- Cluster centroid is `AVG(lng), AVG(lat)` within the cell — good enough visually; upgrading to `ST_Centroid(ST_Collect(location))` is a one-line swap later if needed.
- Client debouncing prevents burst queries during rotate; TanStack Query dedupes identical bbox+precision keys, so revisiting the same view is free.
- Search + filters are pushed into the cluster RPC too, so "show only businesses in Europe" clusters correctly.
- No breaking changes to existing routes, RLS, or auth. The manage dashboard, entity detail, create flow, and current point behavior are untouched.

## What this unlocks

Once clusters exist, later phases (AI semantic search, ads, live streams, analytics dashboards) can all render aggregated overlays on the Earth without any additional map work — they just feed their own cluster/point data into the same layers.
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CloseIcon, PinLocationIcon } from "@/os/icons";
import { cn } from "@/lib/utils";

import { InteractiveEarth } from "@/modules/maps/InteractiveEarth";
import {
  getEntitiesInViewport,
  searchEntities,
  getEntityClusters,
} from "@/modules/entity/entity.functions";
import type { EntityCluster, EntityType } from "@/modules/entity/types";
import { ENTITY_TYPE_CONFIG, ENTITY_TYPE_LIST } from "@/modules/config/entity-types";
import {
  altitudeToZoom,
  bboxKey,
  cameraToBbox,
  RAW_POINTS_PRECISION_THRESHOLD,
  zoomToPrecision,
  type GlobeCamera,
} from "@/modules/maps/viewport";
import { useSearchStore } from "@/os/stores/search.store";
import { useCreateStore } from "@/os/stores/create.store";

export const Route = createFileRoute("/")({
  component: EarthHome,
});

function EarthHome() {
  const navigate = useNavigate();

  // Shell-owned search + create state.
  const rawQuery = useSearchStore((s) => s.rawQuery);
  const commitQuery = useSearchStore((s) => s.commitQuery);
  const query = useSearchStore((s) => s.query);
  const activeTypes = useSearchStore((s) => s.activeTypes);
  const toggleType = useSearchStore((s) => s.toggleType);
  const clearTypes = useSearchStore((s) => s.clearTypes);
  const resultsOpen = useSearchStore((s) => s.resultsOpen);
  const setResultsOpen = useSearchStore((s) => s.setResultsOpen);

  const picking = useCreateStore((s) => s.picking);
  const setPickedCoords = useCreateStore((s) => s.setPickedCoords);

  // Camera state: default to the "in space" starting altitude so the first
  // render (before the globe emits onViewChange) still fetches sensibly.
  const [camera, setCamera] = useState<GlobeCamera>({
    lat: 20,
    lng: 0,
    altitude: 2.5,
  });
  // A one-shot camera destination — new object each intent so the globe flies.
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; altitude?: number } | null>(null);

  // Debounce the search input.
  useEffect(() => {
    const t = setTimeout(() => commitQuery(rawQuery), 300);
    return () => clearTimeout(t);
  }, [rawQuery, commitQuery]);

  const typesKey = activeTypes.slice().sort().join(",");
  const bbox = useMemo(() => cameraToBbox(camera), [camera]);
  const zoom = altitudeToZoom(camera.altitude);
  const precision = zoomToPrecision(zoom);
  const showRawPoints = precision >= RAW_POINTS_PRECISION_THRESHOLD;
  const viewportKey = bboxKey(bbox, precision);

  const pointsQuery = useQuery({
    queryKey: ["entities", "points", viewportKey, query, typesKey],
    enabled: showRawPoints,
    queryFn: () =>
      getEntitiesInViewport({
        data: {
          minLng: bbox.minLng,
          minLat: bbox.minLat,
          maxLng: bbox.maxLng,
          maxLat: bbox.maxLat,
          types: activeTypes.length ? activeTypes : undefined,
          q: query || undefined,
        },
      }),
  });

  const clustersQuery = useQuery({
    queryKey: ["entities", "clusters", viewportKey, query, typesKey],
    enabled: !showRawPoints,
    queryFn: () =>
      getEntityClusters({
        data: {
          minLng: bbox.minLng,
          minLat: bbox.minLat,
          maxLng: bbox.maxLng,
          maxLat: bbox.maxLat,
          precision,
          types: activeTypes.length ? activeTypes : undefined,
          q: query || undefined,
        },
      }),
  });

  const listQuery = useQuery({
    queryKey: ["entities", "list", query, typesKey],
    queryFn: () =>
      searchEntities({
        data: {
          q: query || undefined,
          types: activeTypes.length ? activeTypes : undefined,
        },
      }),
    enabled: resultsOpen || query.length > 0,
  });

  const points = useMemo(() => pointsQuery.data ?? [], [pointsQuery.data]);
  const clusters = useMemo(() => clustersQuery.data ?? [], [clustersQuery.data]);
  const results = listQuery.data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    // In cluster mode, sum the counts; in point mode, tally by point type.
    if (showRawPoints) {
      for (const p of points) c[p.type] = (c[p.type] ?? 0) + 1;
    } else {
      for (const cl of clusters) {
        if (cl.type) c[cl.type] = (c[cl.type] ?? 0) + cl.count;
      }
    }
    return c;
  }, [points, clusters, showRawPoints]);

  const handleGlobeClick = (coords: { lat: number; lng: number }) => {
    if (!picking) return;
    setPickedCoords(coords);
  };

  const openDetail = (id: string) => {
    navigate({ to: "/entity/$id", params: { id } });
  };

  const handleClusterClick = (cluster: EntityCluster) => {
    // Single-entity clusters open the entity directly.
    if (cluster.count === 1 && cluster.sampleId) {
      openDetail(cluster.sampleId);
      return;
    }
    // Otherwise, fly in by ~2 levels. Halving altitude ≈ +1 zoom.
    const nextAlt = Math.max(
      0.05,
      cluster.count > 100 ? camera.altitude / 2.5 : camera.altitude / 3,
    );
    setFlyTo({ lat: cluster.lat, lng: cluster.lng, altitude: nextAlt });
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The living Earth — always present behind everything. */}
      <InteractiveEarth
        points={showRawPoints ? points : []}
        clusters={showRawPoints ? [] : clusters}
        onPointClick={openDetail}
        onGlobeClick={handleGlobeClick}
        picking={picking}
        onClusterClick={handleClusterClick}
        onViewChange={setCamera}
        flyTo={flyTo}
      />

      {/* Ambient vignette for legibility of overlays. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/60" />

      {/* Picking banner */}
      {picking && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 animate-pulse rounded-full border border-primary/40 bg-card/90 px-4 py-2 text-sm font-medium text-primary shadow-lg backdrop-blur">
          Click anywhere on Earth to set the location
        </div>
      )}

      {/* Type-filter chips — Earth-specific workspace overlay under the TopNav. */}
      <div
        className="absolute inset-x-0 top-16 z-10 flex justify-center px-4"
      >
        <div className="rqm-glass-1 flex max-w-full flex-wrap items-center gap-2 rounded-full px-2 py-1.5">
            {ENTITY_TYPE_LIST.map((c) => {
              const active = activeTypes.includes(c.type);
              const Icon = c.icon;
              return (
                <button
                  key={c.type}
                  onClick={() => toggleType(c.type)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-transparent text-background"
                      : "border-white/10 bg-white/5 text-foreground hover:bg-white/10",
                  )}
                  style={active ? { backgroundColor: c.color } : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c.plural}
                  {counts[c.type] ? <span className="opacity-70">{counts[c.type]}</span> : null}
                </button>
              );
            })}
            {activeTypes.length > 0 && (
              <button
                onClick={clearTypes}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
        </div>
      </div>

      {/* Results panel */}
      {resultsOpen && (
        <aside className="rqm-glass-2 absolute bottom-4 start-20 top-32 z-10 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold">
              {query ? `Results for "${query}"` : "Discover"}
            </h2>
            <button
              onClick={() => setResultsOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close results"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {listQuery.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nothing found. Try a different search or add something new.
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {results.map((r) => {
                  const c = ENTITY_TYPE_CONFIG[r.type];
                  const Icon = c.icon;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => openDetail(r.id)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                      >
                        <span
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${c.color}22`, color: c.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.description || c.label}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      )}

      {/* Footer hint */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
        <PinLocationIcon className="h-3 w-3" />
        {showRawPoints
          ? `${points.length.toLocaleString()} entities in view`
          : `${clusters
              .reduce((sum, c) => sum + c.count, 0)
              .toLocaleString()} entities in view · ${clusters.length} clusters`}
        {" · scroll to zoom"}
      </div>
    </div>
  );
}

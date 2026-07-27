import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";

import { CloseIcon, PinLocationIcon, EarthIcon, LoaderIcon } from "@/os/icons";
import { cn } from "@/lib/utils";

import { InteractiveEarth } from "@/modules/maps/InteractiveEarth";
import {
  getEntitiesInViewport,
  searchEntities,
  getEntityClusters,
} from "@/modules/entity/entity.functions";
import type { EntityCluster } from "@/modules/entity/types";
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
import { useWindowStore } from "@/os/stores/window.store";
import { useSession } from "@/hooks/use-session";
import { useGalaxyStore } from "@/os/galaxy3d/useGalaxyStore";
import { ComingSoonModule } from "@/os/galaxy/ComingSoonModule";
import { useT } from "@/os/i18n";
import type { en } from "@/os/i18n/locales/en";
import type { Planet } from "@/os/galaxy/planets";
import { play } from "@/os/engines/sound";

const GalaxyScene = lazy(() =>
  import("@/os/galaxy3d/GalaxyScene").then((m) => ({ default: m.GalaxyScene })),
);

type TKey = keyof typeof en;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "R.Q.M.1 — Interactive Galaxy" },
      {
        name: "description",
        content:
          "Explore a living galaxy of modules and dive into an interactive Earth marketplace of businesses, properties, events, and products.",
      },
      { property: "og:title", content: "R.Q.M.1 — Interactive Galaxy" },
      {
        property: "og:description",
        content:
          "A cinematic 3D galaxy operating system. Fly between planet-modules and browse Earth in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <ClientOnly fallback={<GalaxyLoading />}>
      <HomeShell />
    </ClientOnly>
  );
}

function GalaxyLoading() {
  return (
    <div className="grid h-full w-full place-items-center bg-[#02030a] text-white/70">
      <div className="flex items-center gap-3 text-sm">
        <LoaderIcon className="h-5 w-5 animate-spin" />
        Entering the galaxy…
      </div>
    </div>
  );
}

function HomeShell() {
  const mode = useGalaxyStore((s) => s.mode);
  const enterGalaxy = useGalaxyStore((s) => s.enterGalaxy);
  const enterEarth = useGalaxyStore((s) => s.enterEarth);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#02030a]">
      {mode === "earth" ? (
        <EarthMarketplace onBack={enterGalaxy} />
      ) : (
        <GalaxyView onEnterEarth={enterEarth} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Galaxy view                                                                */
/* -------------------------------------------------------------------------- */

function GalaxyView({ onEnterEarth }: { onEnterEarth: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useSession();
  const openWindow = useWindowStore((s) => s.open);

  const handlePlanetClick = (p: Planet) => {
    play("planet-select");
    if (p.id === "earth") {
      play("earth-enter");
      onEnterEarth();
      return;
    }
    if (p.status === "ready" && p.route) {
      const needsAuth =
        p.route.startsWith("/manage") ||
        p.route.startsWith("/ai-core") ||
        p.route.startsWith("/messages");
      if (needsAuth && !user) {
        navigate({ to: "/auth" });
        return;
      }
      navigate({ to: p.route as never });
      return;
    }
    openWindow({
      id: `module:${p.id}`,
      title: t(p.labelKey as TKey),
      render: ComingSoonModule,
      props: { planet: p },
      w: 460,
      h: 380,
    });
  };

  return (
    <>
      <Suspense fallback={<GalaxyLoading />}>
        <GalaxyScene onPlanetClick={handlePlanetClick} />
      </Suspense>

      {/* Overlay HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex flex-col items-center gap-2 px-4 text-center">
        <h1 className="rqm-glass-2 pointer-events-auto rounded-full px-4 py-1.5 text-sm font-semibold tracking-widest text-white/90">
          R.Q.M.1 · GALAXY
        </h1>
        <p className="max-w-md text-xs text-white/60">
          {t("galaxy.core")} — click a planet to open a module. Fly to Earth to browse the marketplace.
        </p>
      </div>

      {/* Enter-earth CTA */}
      <button
        type="button"
        onClick={() => {
          play("earth-enter");
          onEnterEarth();
        }}
        className="rqm-glass-2 pointer-events-auto absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#4fb3ff55] px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_30px_rgba(79,179,255,0.35)] transition hover:scale-105 hover:shadow-[0_0_50px_rgba(79,179,255,0.55)]"
      >
        <EarthIcon className="h-4 w-4" />
        Enter Earth
      </button>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Earth marketplace view                                                     */
/* -------------------------------------------------------------------------- */

function EarthMarketplace({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();

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

  const [camera, setCamera] = useState<GlobeCamera>({ lat: 20, lng: 0, altitude: 2.5 });
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; altitude?: number } | null>(null);

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
        data: { q: query || undefined, types: activeTypes.length ? activeTypes : undefined },
      }),
    enabled: resultsOpen || query.length > 0,
  });

  const points = useMemo(() => pointsQuery.data ?? [], [pointsQuery.data]);
  const clusters = useMemo(() => clustersQuery.data ?? [], [clustersQuery.data]);
  const results = listQuery.data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    if (showRawPoints) {
      for (const p of points) c[p.type] = (c[p.type] ?? 0) + 1;
    } else {
      for (const cl of clusters) if (cl.type) c[cl.type] = (c[cl.type] ?? 0) + cl.count;
    }
    return c;
  }, [points, clusters, showRawPoints]);

  const handleGlobeClick = (coords: { lat: number; lng: number }) => {
    if (!picking) return;
    setPickedCoords(coords);
  };
  const openDetail = (id: string) => {
    play("market-ping");
    navigate({ to: "/entity/$id", params: { id } });
  };
  const handleClusterClick = (cluster: EntityCluster) => {
    if (cluster.count === 1 && cluster.sampleId) {
      openDetail(cluster.sampleId);
      return;
    }
    const nextAlt = Math.max(
      0.05,
      cluster.count > 100 ? camera.altitude / 2.5 : camera.altitude / 3,
    );
    setFlyTo({ lat: cluster.lat, lng: cluster.lng, altitude: nextAlt });
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
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

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/60" />

      {/* Back-to-galaxy */}
      <button
        type="button"
        onClick={() => {
          play("warp-out");
          onBack();
        }}
        className="rqm-glass-2 pointer-events-auto absolute left-4 top-20 z-20 flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-white/90 hover:text-white"
        aria-label="Back to galaxy"
      >
        ← Galaxy
      </button>

      {picking && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 animate-pulse rounded-full border border-primary/40 bg-card/90 px-4 py-2 text-sm font-medium text-primary shadow-lg backdrop-blur">
          <PinLocationIcon className="mr-1 inline h-3.5 w-3.5" />
          Click anywhere on Earth to set the location
        </div>
      )}

      {/* Type-filter chips */}
      <div className="absolute inset-x-0 top-16 z-10 flex justify-center px-4">
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
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.title}</span>
                          {r.description ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {r.description}
                            </span>
                          ) : null}
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
    </div>
  );
}

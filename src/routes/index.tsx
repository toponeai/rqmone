import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Globe2, X, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AuthMenu } from "@/components/auth-menu";
import { useSession } from "@/hooks/use-session";

import { InteractiveEarth } from "@/modules/maps/InteractiveEarth";
import { CreateEntityDialog } from "@/modules/entity/CreateEntityDialog";
import {
  getEntitiesInViewport,
  searchEntities,
} from "@/modules/entity/entity.functions";
import type { EntityType } from "@/modules/entity/types";
import {
  ENTITY_TYPE_CONFIG,
  ENTITY_TYPE_LIST,
} from "@/modules/config/entity-types";


export const Route = createFileRoute("/")({
  component: EarthHome,
});

function EarthHome() {
  const navigate = useNavigate();

  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<EntityType[]>([]);
  const [resultsOpen, setResultsOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Debounce the search input.
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const typesKey = activeTypes.slice().sort().join(",");

  const pointsQuery = useQuery({
    queryKey: ["entities", "points", query, typesKey],
    queryFn: () =>
      getEntitiesInViewport({
        data: {
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

  const points = pointsQuery.data ?? [];
  const results = listQuery.data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of points) c[p.type] = (c[p.type] ?? 0) + 1;
    return c;
  }, [points]);

  const toggleType = (type: EntityType) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleGlobeClick = (coords: { lat: number; lng: number }) => {
    if (!picking) return;
    setPickedCoords(coords);
    setPicking(false);
    setDialogOpen(true);
  };

  const openDetail = (id: string) => {
    navigate({ to: "/entity/$id", params: { id } });
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      {/* The living Earth — always present behind everything. */}
      <InteractiveEarth
        points={points}
        onPointClick={openDetail}
        onGlobeClick={handleGlobeClick}
        picking={picking}
      />

      {/* Ambient vignette for legibility of overlays. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/60" />

      {/* Picking banner */}
      {picking && (
        <div className="absolute left-1/2 top-24 z-30 -translate-x-1/2 animate-pulse rounded-full border border-primary/40 bg-card/90 px-4 py-2 text-sm font-medium text-primary shadow-lg backdrop-blur">
          Click anywhere on Earth to set the location
        </div>
      )}

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-20 p-4 sm:p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-2">
              <Globe2 className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold tracking-tight">
                R.Q.M.<span className="text-primary">1</span>
              </span>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={rawQuery}
                onChange={(e) => {
                  setRawQuery(e.target.value);
                  setResultsOpen(true);
                }}
                onFocus={() => setResultsOpen(true)}
                placeholder="Search the planet — businesses, properties, events, products…"
                className="h-11 border-border/60 bg-card/80 pl-9 backdrop-blur"
              />
            </div>

            <Button
              onClick={() => {
                setPickedCoords(null);
                setDialogOpen(true);
              }}
              className="h-11 gap-2 shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add to Earth</span>
            </Button>
          </div>

          {/* Type filters */}
          <div className="flex flex-wrap items-center gap-2">
            {ENTITY_TYPE_LIST.map((c) => {
              const active = activeTypes.includes(c.type);
              const Icon = c.icon;
              return (
                <button
                  key={c.type}
                  onClick={() => toggleType(c.type)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors",
                    active
                      ? "border-transparent text-background"
                      : "border-border/60 bg-card/70 text-foreground hover:bg-card",
                  )}
                  style={active ? { backgroundColor: c.color } : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c.plural}
                  <span className="opacity-70">{counts[c.type] ?? 0}</span>
                </button>
              );
            })}
            {activeTypes.length > 0 && (
              <button
                onClick={() => setActiveTypes([])}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Results panel */}
      {resultsOpen && (
        <aside className="absolute bottom-4 left-4 top-40 z-20 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/85 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold">
              {query ? `Results for "${query}"` : "Discover"}
            </h2>
            <button
              onClick={() => setResultsOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close results"
            >
              <X className="h-4 w-4" />
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
                          <span className="block truncate text-sm font-medium">
                            {r.title}
                          </span>
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
        <MapPin className="h-3 w-3" />
        {points.length.toLocaleString()} entities on Earth · drag to rotate
      </div>

      <CreateEntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        coords={pickedCoords}
        onRequestPick={() => {
          setDialogOpen(false);
          setPicking(true);
        }}
      />
    </main>
  );
}

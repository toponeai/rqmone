import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useT } from "@/os/i18n";
import type { en } from "@/os/i18n/locales/en";
import { useSession } from "@/hooks/use-session";
import { useWindowStore } from "@/os/stores/window.store";
import { CloseIcon } from "@/os/icons";
import { PLANETS, GALAXIES, type Planet } from "@/os/galaxy/planets";
import { ComingSoonModule } from "@/os/galaxy/ComingSoonModule";

type TKey = keyof typeof en;

/**
 * R.Q.M.1 Planet Navigator — the single expandable central navigation object.
 *
 * Collapsed: a glowing "moon" sphere at the bottom-center. Breathing + aurora.
 * Expanded: fullscreen backdrop; the moon becomes the center and planets
 * appear grouped by galaxy on concentric orbital rings around it.
 *
 * Replaces scattered floating menus. Adding a module = one entry in the
 * planets registry — this component consumes it unchanged.
 */
export function PlanetNavigator() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useSession();
  const openWindow = useWindowStore((s) => s.open);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const groups = useMemo(() => {
    return GALAXIES.map((g) => ({
      ...g,
      planets: PLANETS.filter((p) => p.galaxy === g.id),
    })).filter((g) => g.planets.length > 0);
  }, []);

  const handlePlanet = (p: Planet) => {
    setOpen(false);
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
      w: 440,
      h: 360,
    });
  };

  return (
    <>
      {/* The moon — always visible, floats above Earth. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.planets")}
        aria-expanded={open}
        className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rqm-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={{ zIndex: 40 }}
      >
        <span
          className="rqm-moon relative grid h-16 w-16 place-items-center rounded-full"
          data-open={open ? "true" : "false"}
        >
          <span className="rqm-moon-core" aria-hidden />
          <span className="rqm-moon-aurora" aria-hidden />
          <span className="rqm-moon-highlight" aria-hidden />
        </span>
      </button>

      {/* Expanded solar-system overlay */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("nav.planets")}
          className="pointer-events-auto absolute inset-0 flex items-center justify-center"
          style={{
            zIndex: 55,
            background:
              "radial-gradient(circle at center, rgba(8,10,24,0.72) 0%, rgba(4,6,16,0.9) 60%, rgba(2,3,10,0.96) 100%)",
            backdropFilter: "blur(18px) saturate(140%)",
            animation: "rqm-fade-in 220ms ease-out",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("nav.close")}
            className="rqm-glass-2 absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>

          <div className="relative flex h-full w-full items-center justify-center">
            {/* Central moon */}
            <div
              className="rqm-moon rqm-moon-lg absolute"
              aria-hidden
              style={{ animation: "rqm-scale-in 360ms cubic-bezier(0.2, 0.9, 0.3, 1.4)" }}
            >
              <span className="rqm-moon-core" />
              <span className="rqm-moon-aurora" />
              <span className="rqm-moon-highlight" />
            </div>

            {/* Concentric orbital rings, one per galaxy group */}
            {groups.map((g, gi) => {
              const radius = 130 + gi * 88;
              const planetsInGroup = g.planets;
              const angleStart = -90 + gi * 18;
              return (
                <div
                  key={g.id}
                  className="pointer-events-none absolute rounded-full border border-white/[0.06]"
                  style={{
                    width: radius * 2,
                    height: radius * 2,
                    animation: `rqm-orbit ${60 + gi * 20}s linear infinite`,
                    boxShadow: "inset 0 0 40px rgba(180,200,255,0.02)",
                  }}
                >
                  {/* Group label riding the ring */}
                  <span
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-3 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-white/60 backdrop-blur"
                    style={{ animation: `rqm-orbit ${60 + gi * 20}s linear infinite reverse` }}
                  >
                    {t(g.labelKey as TKey)}
                  </span>

                  {planetsInGroup.map((p, i) => {
                    const step = 360 / Math.max(planetsInGroup.length, 4);
                    const angle = angleStart + i * step;
                    const rad = (angle * Math.PI) / 180;
                    const x = radius + Math.cos(rad) * radius - p.size / 2;
                    const y = radius + Math.sin(rad) * radius - p.size / 2;
                    const Icon = p.icon;
                    const isHover = hovered === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePlanet(p)}
                        onMouseEnter={() => setHovered(p.id)}
                        onMouseLeave={() => setHovered(null)}
                        aria-label={t(p.labelKey as TKey)}
                        className="pointer-events-auto group absolute flex items-center justify-center rounded-full border transition-transform will-change-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rqm-primary)]"
                        style={{
                          left: x,
                          top: y,
                          width: p.size,
                          height: p.size,
                          background: `radial-gradient(circle at 30% 30%, ${p.color}, color-mix(in oklab, ${p.color} 35%, #000) 80%)`,
                          borderColor: `color-mix(in oklab, ${p.color} 60%, white 20%)`,
                          boxShadow: `0 0 18px ${p.color}66, 0 0 3px ${p.color}`,
                          opacity: p.status === "ready" ? 1 : 0.78,
                          animation: `rqm-orbit ${60 + gi * 20}s linear infinite reverse`,
                        }}
                      >
                        <Icon
                          className="text-white drop-shadow"
                          style={{ width: p.size * 0.48, height: p.size * 0.48 }}
                        />
                        {p.status === "soon" ? (
                          <span
                            className="pointer-events-none absolute -top-1 -end-1 rounded-full border border-white/40 bg-black/70 px-1 text-[8px] font-bold uppercase tracking-wider text-[var(--rqm-primary)]"
                            aria-hidden
                          >
                            {t("soon.badge")}
                          </span>
                        ) : null}
                        {isHover ? (
                          <span className="rqm-glass-3 pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] text-white">
                            {t(p.labelKey as TKey)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}

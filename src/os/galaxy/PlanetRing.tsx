import { useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useT } from "@/os/i18n";
import type { en } from "@/os/i18n/locales/en";
import { useSession } from "@/hooks/use-session";
import { useWindowStore } from "@/os/stores/window.store";
import { PLANETS, type Planet } from "./planets";
import { ComingSoonModule } from "./ComingSoonModule";

type TKey = keyof typeof en;

/**
 * Galaxy Planet Ring — orbital overlay showing every top-level module as a
 * clickable planet around the Earth. Presentation-only shell wiring: ready
 * planets navigate; upcoming planets open a floating "coming soon" window.
 *
 * The ring rotates slowly; individual planets counter-rotate so their icons
 * stay upright. Motion is disabled under prefers-reduced-motion via the
 * design tokens.
 */
export function PlanetRing() {
  const t = useT();
  const navigate = useNavigate();
  const routerState = useRouterState({ select: (s) => s.location.pathname });
  const openWindow = useWindowStore((s) => s.open);
  const { user } = useSession();
  const [hovered, setHovered] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const planets = PLANETS;
  const step = 360 / planets.length;

  const handleClick = (p: Planet) => {
    if (p.status === "ready" && p.route) {
      // Auth-gated routes: the shell already redirects, but be explicit.
      const needsAuth = p.route.startsWith("/manage") || p.route.startsWith("/ai-core");
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

  const items = useMemo(
    () =>
      planets.map((p, i) => ({
        planet: p,
        angle: i * step - 90, // start at top
      })),
    [planets, step],
  );

  const activeId =
    routerState === "/"
      ? "earth"
      : routerState.startsWith("/ai-core")
        ? "ai"
        : routerState.startsWith("/manage")
          ? "manage"
          : null;

  return (
    <div
      className="pointer-events-none absolute right-4 top-1/2 z-20 -translate-y-1/2"
      aria-label="Module planet ring"
    >
      <div
        className="rqm-glass-2 pointer-events-auto relative flex flex-col items-center rounded-full p-2"
        style={{
          width: collapsed ? 56 : 220,
          height: collapsed ? 56 : 220,
          transition: "width 300ms ease, height 300ms ease",
        }}
      >
        {/* Center hub / collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand modules" : "Collapse modules"}
          className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white shadow-lg"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, oklch(0.78 0.14 200 / 0.9), oklch(0.35 0.1 264 / 0.9))",
            boxShadow: "0 0 24px oklch(0.78 0.14 200 / 0.5)",
          }}
        >
          {collapsed ? "+" : "·"}
        </button>

        {!collapsed && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent, oklch(0.78 0.14 200 / 0.15), transparent 60%)",
              animation: "rqm-orbit 40s linear infinite",
              maskImage:
                "radial-gradient(circle, transparent 46%, black 48%, black 62%, transparent 64%)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 46%, black 48%, black 62%, transparent 64%)",
            }}
          />
        )}

        {!collapsed &&
          items.map(({ planet, angle }) => {
            const Icon = planet.icon;
            const isActive = activeId === planet.id;
            const isHover = hovered === planet.id;
            const radius = 92;
            const rad = (angle * Math.PI) / 180;
            const x = 110 + Math.cos(rad) * radius - planet.size / 2;
            const y = 110 + Math.sin(rad) * radius - planet.size / 2;
            return (
              <button
                key={planet.id}
                type="button"
                onClick={() => handleClick(planet)}
                onMouseEnter={() => setHovered(planet.id)}
                onMouseLeave={() => setHovered(null)}
                aria-label={t(planet.labelKey as TKey)}
                className="group absolute flex items-center justify-center rounded-full border transition-transform will-change-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                  left: x,
                  top: y,
                  width: planet.size,
                  height: planet.size,
                  background: `radial-gradient(circle at 30% 30%, ${planet.color}, color-mix(in oklab, ${planet.color} 40%, #000) 80%)`,
                  borderColor: isActive
                    ? "rgba(255,255,255,0.9)"
                    : "color-mix(in oklab, " + planet.color + " 60%, white 20%)",
                  boxShadow: isActive
                    ? `0 0 22px ${planet.color}, 0 0 4px rgba(255,255,255,0.8)`
                    : `0 0 14px ${planet.color}66`,
                  opacity: planet.status === "ready" ? 1 : 0.75,
                }}
              >
                <Icon
                  className="text-white drop-shadow"
                  style={{ width: planet.size * 0.48, height: planet.size * 0.48 }}
                />
                {planet.status === "soon" && (
                  <span
                    className="absolute -top-1 -right-1 rounded-full border border-white/40 bg-black/70 px-1 text-[8px] font-bold uppercase tracking-wider text-primary"
                    style={{ fontSize: 8 }}
                  >
                    {t("soon.badge" as TKey)}
                  </span>
                )}
                {isHover && (
                  <span className="rqm-glass-3 pointer-events-none absolute right-full top-1/2 me-2 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs">
                    {t(planet.labelKey as TKey)}
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

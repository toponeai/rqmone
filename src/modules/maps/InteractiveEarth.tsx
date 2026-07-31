import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { EntityPoint, EntityCluster } from "@/modules/entity/types";
import { colorForType } from "@/modules/config/entity-types";
import type { GlobeCamera } from "./viewport";

// react-globe.gl pulls in three.js and touches `window`, so it must only load
// on the client. React.lazy defers the import until first render, and the
// `mounted` gate ensures that render only happens in the browser.
const Globe = lazy(() => import("react-globe.gl"));

/**
 * Build the DOM node used to render a cluster on the globe. globe-gl calls
 * this once per datum and reuses the returned element.
 */
function makeClusterEl(cluster: EntityCluster, color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "rqm-cluster";
  const size = Math.min(64, Math.max(28, 16 + Math.log10(cluster.count + 1) * 20));
  el.style.cssText = [
    `--cluster-color: ${color}`,
    `width: ${size}px`,
    `height: ${size}px`,
    "border-radius: 9999px",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "font-family: 'Space Grotesk', 'Inter', sans-serif",
    "font-weight: 600",
    `font-size: ${Math.max(11, size / 3.2)}px`,
    "color: white",
    "background: color-mix(in oklab, var(--cluster-color) 55%, rgba(6,10,25,0.85))",
    "border: 1.5px solid color-mix(in oklab, var(--cluster-color) 85%, white 15%)",
    "box-shadow: 0 0 24px color-mix(in oklab, var(--cluster-color) 60%, transparent), 0 4px 14px rgba(0,0,0,0.4)",
    "cursor: pointer",
    "backdrop-filter: blur(4px)",
    "transform: translate3d(0,0,0)",
    "transition: transform 120ms ease",
    "pointer-events: auto",
  ].join(";");
  el.textContent =
    cluster.count > 999 ? `${(cluster.count / 1000).toFixed(1)}k` : String(cluster.count);
  el.title = `${cluster.count} entities`;
  el.addEventListener("mouseenter", () => (el.style.transform = "scale(1.1)"));
  el.addEventListener("mouseleave", () => (el.style.transform = "scale(1)"));
  return el;
}

interface InteractiveEarthProps {
  points: EntityPoint[];
  onPointClick?: (id: string) => void;
  onGlobeClick?: (coords: { lat: number; lng: number }) => void;
  picking?: boolean;
  focus?: { lat: number; lng: number } | null;
  clusters?: EntityCluster[];
  onClusterClick?: (cluster: EntityCluster) => void;
  onViewChange?: (camera: GlobeCamera) => void;
  /**
   * A one-shot camera destination. When this reference changes, the globe
   * animates to (lat, lng, altitude). Use a fresh object for each intent —
   * passing the same reference twice will not re-fly.
   */
  flyTo?: { lat: number; lng: number; altitude?: number } | null;
}

export function InteractiveEarth({
  points,
  onPointClick,
  onGlobeClick,
  picking = false,
  focus = null,
  clusters = [],
  onClusterClick,
  onViewChange,
  flyTo = null,
}: InteractiveEarthProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Debounce timer for camera-change → onViewChange notifications.
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCamRef = useRef<GlobeCamera | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);

  const handleReady = () => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = !picking;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = true;
    controls.minDistance = 140;
    controls.maxDistance = 500;
    if (focus) {
      g.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 1.6 }, 1200);
    } else {
      g.pointOfView({ altitude: 2.5 });
    }

    // Emit the initial viewport once the globe settles, then on every
    // subsequent camera change (debounced).
    const notify = () => {
      if (!onViewChange) return;
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
      viewTimerRef.current = setTimeout(() => {
        const cam = g.pointOfView() as GlobeCamera;
        if (
          lastCamRef.current &&
          Math.abs(lastCamRef.current.lat - cam.lat) < 0.5 &&
          Math.abs(lastCamRef.current.lng - cam.lng) < 0.5 &&
          Math.abs(lastCamRef.current.altitude - cam.altitude) < 0.05
        ) {
          return;
        }
        lastCamRef.current = cam;
        onViewChange(cam);
      }, 300);
    };
    controls.addEventListener("change", notify);
    // Kick off with the current camera so the first fetch happens.
    setTimeout(notify, 400);
  };

  // Keep autorotate in sync with picking mode.
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !g.controls) return;
    try {
      g.controls().autoRotate = !picking;
    } catch {
      /* controls not ready yet */
    }
  }, [picking]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g || !focus) return;
    g.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 1.6 }, 1200);
  }, [focus]);

  // Fly to a one-shot destination whenever the prop reference changes.
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !flyTo) return;
    g.pointOfView({ lat: flyTo.lat, lng: flyTo.lng, altitude: flyTo.altitude ?? 1.2 }, 900);
  }, [flyTo]);

  // Clean up the debounce timer.
  useEffect(
    () => () => {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ cursor: picking ? "crosshair" : "grab" }}
    >
      {mounted && size.width > 0 && (
        <Suspense fallback={null}>
          <Globe
            ref={globeRef}
            width={size.width}
            height={size.height}
            onGlobeReady={handleReady}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="/textures/earth-night.jpg"
            bumpImageUrl="/textures/earth-topology.png"
            backgroundImageUrl="/textures/night-sky.png"
            showAtmosphere
            atmosphereColor="#6fd6ff"
            atmosphereAltitude={0.22}
            showGraticules={false}
            pointsData={points}
            pointLat={(d: object) => (d as EntityPoint).lat}
            pointLng={(d: object) => (d as EntityPoint).lng}
            pointColor={(d: object) => colorForType((d as EntityPoint).type)}
            pointAltitude={0.02}
            pointRadius={0.32}
            pointResolution={6}
            pointLabel={(d: object) => (d as EntityPoint).title}
            pointsMerge={points.length > 400}
            onPointClick={(d: object) => onPointClick?.((d as EntityPoint).id)}
            onGlobeClick={(coords: { lat: number; lng: number }) =>
              onGlobeClick?.({ lat: coords.lat, lng: coords.lng })
            }
            htmlElementsData={clusters}
            htmlLat={(d: object) => (d as EntityCluster).lat}
            htmlLng={(d: object) => (d as EntityCluster).lng}
            htmlAltitude={0.01}
            htmlElement={(d: object) => {
              const c = d as EntityCluster;
              const color = c.type ? colorForType(c.type) : "#6fd6ff";
              const el = makeClusterEl(c, color);
              el.addEventListener("click", (ev) => {
                ev.stopPropagation();
                onClusterClick?.(c);
              });
              return el;
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

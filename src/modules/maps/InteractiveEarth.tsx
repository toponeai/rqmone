import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { EntityPoint } from "@/modules/entity/types";
import { colorForType } from "@/modules/config/entity-types";

// react-globe.gl pulls in three.js and touches `window`, so it must only load
// on the client. React.lazy defers the import until first render, and the
// `mounted` gate ensures that render only happens in the browser.
const Globe = lazy(() => import("react-globe.gl"));

interface InteractiveEarthProps {
  points: EntityPoint[];
  onPointClick?: (id: string) => void;
  onGlobeClick?: (coords: { lat: number; lng: number }) => void;
  picking?: boolean;
  focus?: { lat: number; lng: number } | null;
}

export function InteractiveEarth({
  points,
  onPointClick,
  onGlobeClick,
  picking = false,
  focus = null,
}: InteractiveEarthProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
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
            atmosphereColor="#6fd6ff"
            atmosphereAltitude={0.18}
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
          />
        </Suspense>
      )}
    </div>
  );
}

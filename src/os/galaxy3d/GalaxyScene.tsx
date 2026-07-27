import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

import { Planet3D } from "./Planet3D";
import { Sun } from "./Sun";
import { Starfield3D } from "./Starfield3D";
import { layoutGalaxy, type PlacedPlanet } from "./planetLayout";
import { useT } from "@/os/i18n";
import type { en } from "@/os/i18n/locales/en";
import { play } from "@/os/engines/sound";

type TKey = keyof typeof en;

/**
 * The animated 3D galaxy scene. Camera orbits the central sun; module-planets
 * revolve on concentric rings. Clicking a planet fires `onPlanetClick`.
 */
export interface GalaxySceneProps {
  onPlanetClick: (planet: PlacedPlanet) => void;
}

function CameraAutoOrbit() {
  const { camera } = useThree();
  const angle = useRef(0);
  useFrame((_, dt) => {
    angle.current += dt * 0.015;
    const r = 30;
    // Only auto-orbit when user isn't dragging; drei's OrbitControls handles
    // its own updates, so we just gently nudge when idle by lerping y.
    camera.position.y += (Math.sin(angle.current) * 4 - camera.position.y) * 0.002;
  });
  return null;
}

export function GalaxyScene({ onPlanetClick }: GalaxySceneProps) {
  const t = useT();
  const planets = useMemo(() => layoutGalaxy(), []);

  const handleClick = (p: PlacedPlanet) => {
    play("window-open");
    onPlanetClick(p);
  };

  return (
    <Canvas
      camera={{ position: [0, 8, 30], fov: 55, near: 0.1, far: 500 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ background: "radial-gradient(circle at 50% 50%, #0a0d20 0%, #02030a 70%)" }}
    >
      <color attach="background" args={["#02030a"]} />
      <fog attach="fog" args={["#02030a", 55, 120]} />

      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <hemisphereLight args={["#5b7cff", "#100820", 0.3]} />

      <Suspense fallback={null}>
        {/* Background layers */}
        <Stars radius={140} depth={60} count={2500} factor={4} saturation={0} fade speed={0.5} />
        <Starfield3D count={1200} />

        {/* Central sun */}
        <Sun />

        {/* Orbital rings (visual guides) */}
        {Array.from(new Set(planets.map((p) => p.orbitRadius))).map((r) => (
          <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.02, r + 0.02, 128]} />
            <meshBasicMaterial color="#4a5b8f" transparent opacity={0.12} side={THREE.DoubleSide} />
          </mesh>
        ))}

        {/* Planets */}
        {planets.map((p) => (
          <Planet3D
            key={p.id}
            planet={p}
            label={t(p.labelKey as TKey)}
            onClick={handleClick}
          />
        ))}
      </Suspense>

      <CameraAutoOrbit />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={12}
        maxDistance={60}
        autoRotate
        autoRotateSpeed={0.25}
      />

      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.35} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}

export default GalaxyScene;

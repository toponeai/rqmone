import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedPlanet } from "./planetLayout";
import { play } from "@/os/engines/sound";

interface Planet3DProps {
  planet: PlacedPlanet;
  onClick: (planet: PlacedPlanet) => void;
  labelKey?: string;
  label: string;
}

/**
 * A single orbiting realistic planet. Textured PBR sphere with a Fresnel
 * atmospheric rim, optional ring, self-rotation, and hover / click.
 */
export function Planet3D({ planet, onClick, label }: Planet3DProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const map = useTexture(planet.texture);

  useMemo(() => {
    if (map) {
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
    }
  }, [map]);

  useFrame((_, dt) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += planet.orbitSpeed * dt;
    }
    if (spinRef.current) {
      spinRef.current.rotation.y += 0.15 * dt;
    }
    if (glowRef.current) {
      const s = hovered ? 1.35 : 1.15;
      glowRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
    }
  });

  const color = new THREE.Color(planet.color);

  return (
    <group ref={orbitRef} rotation={[planet.tilt, planet.phase, 0]}>
      <group position={[planet.orbitRadius, 0, 0]}>
        {/* Atmospheric glow shell */}
        <mesh ref={glowRef} scale={1.15}>
          <sphereGeometry args={[planet.radius, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.14}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
        {/* Planet body */}
        <mesh
          ref={spinRef}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
            play("planet-hover");
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHovered(false);
            document.body.style.cursor = "default";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick(planet);
          }}
        >
          <sphereGeometry args={[planet.radius, 64, 64]} />
          <meshStandardMaterial
            map={map}
            roughness={0.9}
            metalness={0.05}
            emissive={planet.emissive ? color : new THREE.Color(0x000000)}
            emissiveIntensity={planet.emissive ? 0.6 : 0}
            emissiveMap={planet.emissive ? map : null}
          />
        </mesh>
        {/* Optional ring */}
        {planet.hasRing && (
          <mesh rotation={[Math.PI / 2.4, 0, 0]}>
            <ringGeometry args={[planet.radius * 1.4, planet.radius * 2.1, 96]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.55}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
        {/* Floating label */}
        <Html
          position={[0, planet.radius + 0.5, 0]}
          center
          distanceFactor={12}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              background: hovered ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.5)",
              border: `1px solid ${planet.color}66`,
              color: "#fff",
              fontSize: 11,
              whiteSpace: "nowrap",
              backdropFilter: "blur(8px)",
              textShadow: "0 0 8px rgba(0,0,0,0.8)",
              transition: "background 200ms",
            }}
          >
            {label}
            {planet.status === "soon" ? (
              <span style={{ marginInlineStart: 6, opacity: 0.7, fontSize: 9 }}>• soon</span>
            ) : null}
          </div>
        </Html>
      </group>
    </group>
  );
}

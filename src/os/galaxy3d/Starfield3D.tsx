import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Deep-space background: 3000 procedurally-scattered stars in a large
 * inverted sphere, slowly drifting for parallax.
 */
export function Starfield3D({ count = 3000 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Random point on a large sphere
      const r = 90 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = Math.random() * 1.6 + 0.2;
    }
    return [pos, sz];
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} count={sizes.length} />
      </bufferGeometry>
      <pointsMaterial
        size={0.35}
        sizeAttenuation
        color="#dfe8ff"
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}

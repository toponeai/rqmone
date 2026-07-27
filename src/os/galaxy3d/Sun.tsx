import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The central star of the R.Q.M.1 galaxy — the AI core. Emissive sphere
 * with a soft point light, gently pulsating.
 */
export function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.2) * 0.03;
    if (meshRef.current) meshRef.current.rotation.y += 0.001;
    if (glowRef.current) {
      glowRef.current.scale.setScalar(pulse * 2.2);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + Math.sin(t * 1.5) * 0.05;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 2.2 + Math.sin(t * 1.5) * 0.25;
    }
  });

  return (
    <group>
      <pointLight ref={lightRef} intensity={2.4} distance={80} decay={1.6} color="#ffd7a0" />
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial
          color="#ffb86c"
          transparent
          opacity={0.35}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.4, 64, 64]} />
        <meshBasicMaterial color="#ffe8b8" />
      </mesh>
    </group>
  );
}

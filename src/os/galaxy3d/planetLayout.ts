import { PLANETS, type Planet } from "@/os/galaxy/planets";

/** Static texture map — id → equirectangular color texture path. */
export const PLANET_TEXTURES: Record<string, string> = {
  earth: "/textures/planets/earth_color.jpg",
  ai: "/textures/planets/ai_color.jpg",
  manage: "/textures/planets/mercury_color.jpg",
  messages: "/textures/planets/neptune_color.jpg",
  notifications: "/textures/planets/venus_color.jpg",
  marketplace: "/textures/planets/mars_color.jpg",
  business: "/textures/planets/jupiter_color.jpg",
  jobs: "/textures/planets/saturn_color.jpg",
  wallet: "/textures/planets/saturn_color.jpg",
  analytics: "/textures/planets/neptune_color.jpg",
  live: "/textures/planets/mars_color.jpg",
  community: "/textures/planets/jupiter_color.jpg",
  profile: "/textures/planets/mercury_color.jpg",
  settings: "/textures/planets/mercury_color.jpg",
  admin: "/textures/planets/mars_color.jpg",
};

export interface PlacedPlanet extends Planet {
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  tilt: number;
  radius: number;
  hasRing?: boolean;
  texture: string;
  emissive?: boolean;
}

const GALAXY_ORBIT: Record<string, number> = {
  core: 6,
  comms: 10,
  market: 14,
  economy: 18,
  analytics: 22,
  admin: 26,
};

/**
 * Deterministic orbital placement. Planets in the same galaxy share a ring;
 * their phase is derived from their index so the layout is stable and evenly
 * distributed.
 */
export function layoutGalaxy(): PlacedPlanet[] {
  const byGalaxy = new Map<string, Planet[]>();
  for (const p of PLANETS) {
    if (!byGalaxy.has(p.galaxy)) byGalaxy.set(p.galaxy, []);
    byGalaxy.get(p.galaxy)!.push(p);
  }
  const placed: PlacedPlanet[] = [];
  for (const [gid, planets] of byGalaxy) {
    const radius = GALAXY_ORBIT[gid] ?? 20;
    const speed = 0.02 + (radius - 6) * 0.001;
    planets.forEach((p, i) => {
      const phase = (i / Math.max(planets.length, 1)) * Math.PI * 2;
      // Convert pixel-size (34-44) to world units roughly 0.55-0.9
      const r = 0.5 + (p.size - 32) / 30;
      placed.push({
        ...p,
        orbitRadius: radius,
        orbitSpeed: p.id === "earth" ? 0.05 : speed,
        phase,
        tilt: (i % 3) * 0.15,
        radius: r,
        hasRing: p.id === "wallet" || p.id === "jobs",
        texture: PLANET_TEXTURES[p.id] ?? "/textures/planets/mercury_color.jpg",
        emissive: p.id === "ai",
      });
    });
  }
  return placed;
}

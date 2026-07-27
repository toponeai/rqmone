import { create } from "zustand";

export type GalaxyMode = "galaxy" | "earth" | "transition";

interface GalaxyState {
  mode: GalaxyMode;
  targetPlanet: string | null;
  enterGalaxy: () => void;
  enterEarth: () => void;
  selectPlanet: (id: string | null) => void;
}

/**
 * Central mode store for the R.Q.M.1 3D shell. One truth: are we roaming
 * the galaxy of module-planets, or focused on the interactive Earth
 * marketplace surface?
 */
export const useGalaxyStore = create<GalaxyState>((set) => ({
  mode: "galaxy",
  targetPlanet: null,
  enterGalaxy: () => set({ mode: "galaxy", targetPlanet: null }),
  enterEarth: () => set({ mode: "earth", targetPlanet: "earth" }),
  selectPlanet: (id) => set({ targetPlanet: id }),
}));

import { create } from "zustand";

export type Theme = "dark" | "light" | "high-contrast";
export type Platform = "web" | "desktop-native" | "mobile-native";

interface UIStore {
  theme: Theme;
  platform: Platform;
  leftDockOpen: boolean;
  rightDockOpen: boolean;
  reducedMotion: boolean;
  setTheme: (t: Theme) => void;
  toggleLeftDock: () => void;
  toggleRightDock: () => void;
  setReducedMotion: (v: boolean) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  theme: "dark",
  platform: "web",
  leftDockOpen: true,
  rightDockOpen: true,
  reducedMotion: false,
  setTheme: (t) => set({ theme: t }),
  toggleLeftDock: () => set({ leftDockOpen: !get().leftDockOpen }),
  toggleRightDock: () => set({ rightDockOpen: !get().rightDockOpen }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
}));
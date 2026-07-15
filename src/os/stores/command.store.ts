import { create } from "zustand";

interface CommandStore {
  paletteOpen: boolean;
  recent: string[];
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  pushRecent: (id: string) => void;
}

export const useCommandStore = create<CommandStore>((set, get) => ({
  paletteOpen: false,
  recent: [],
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
  pushRecent: (id) =>
    set({ recent: [id, ...get().recent.filter((r) => r !== id)].slice(0, 8) }),
}));
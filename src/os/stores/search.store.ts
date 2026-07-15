import { create } from "zustand";
import type { EntityType } from "@/modules/entity/types";

interface SearchStore {
  rawQuery: string;
  query: string; // debounced
  activeTypes: EntityType[];
  resultsOpen: boolean;
  setRawQuery: (v: string) => void;
  commitQuery: (v: string) => void;
  toggleType: (t: EntityType) => void;
  clearTypes: () => void;
  setResultsOpen: (v: boolean) => void;
  focus: () => void;
}

/**
 * `focusHandler` is registered by the currently mounted search input so any
 * module can request search focus through the command bus without prop drilling.
 */
let focusHandler: (() => void) | null = null;

export function registerSearchFocusHandler(fn: (() => void) | null) {
  focusHandler = fn;
}

export const useSearchStore = create<SearchStore>((set) => ({
  rawQuery: "",
  query: "",
  activeTypes: [],
  resultsOpen: false,
  setRawQuery: (v) => set({ rawQuery: v, resultsOpen: true }),
  commitQuery: (v) => set({ query: v.trim() }),
  toggleType: (t) =>
    set((s) => ({
      activeTypes: s.activeTypes.includes(t)
        ? s.activeTypes.filter((x) => x !== t)
        : [...s.activeTypes, t],
    })),
  clearTypes: () => set({ activeTypes: [] }),
  setResultsOpen: (v) => set({ resultsOpen: v }),
  focus: () => focusHandler?.(),
}));
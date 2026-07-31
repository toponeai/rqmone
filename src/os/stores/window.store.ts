import { create } from "zustand";
import type { ComponentType, ReactNode } from "react";

export type WindowState = "normal" | "minimized" | "maximized" | "docked";

export interface FloatingWindowDef<P = unknown> {
  id: string;
  title: string;
  render: ComponentType<P>;
  props?: P;
  icon?: ReactNode;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  state: WindowState;
  pinned: boolean;
  dock?: "left" | "right" | null;
}

interface OpenWindowInput<P = unknown> {
  id: string;
  title: string;
  render: ComponentType<P>;
  props?: P;
  icon?: ReactNode;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
  dock?: "left" | "right" | null;
}

interface WindowStore {
  windows: FloatingWindowDef[];
  topZ: number;
  open: <P>(input: OpenWindowInput<P>) => void;
  close: (id: string) => void;
  focus: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number) => void;
  setState: (id: string, state: WindowState) => void;
  togglePin: (id: string) => void;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 1,
  open: (input) =>
    set((s) => {
      const existing = s.windows.find((w) => w.id === input.id);
      const nextZ = s.topZ + 1;
      if (existing) {
        return {
          topZ: nextZ,
          windows: s.windows.map((w) =>
            w.id === input.id ? { ...w, z: nextZ, state: "normal" as WindowState } : w,
          ),
        };
      }
      const w = input.w ?? 520;
      const h = input.h ?? 420;
      const x =
        input.x ??
        (typeof window === "undefined" ? 120 : Math.max(24, (window.innerWidth - w) / 2));
      const y =
        input.y ??
        (typeof window === "undefined" ? 120 : Math.max(80, (window.innerHeight - h) / 2));
      return {
        topZ: nextZ,
        windows: [
          ...s.windows,
          {
            id: input.id,
            title: input.title,
            render: input.render as ComponentType<unknown>,
            props: input.props,
            icon: input.icon,
            x,
            y,
            w,
            h,
            z: nextZ,
            state: "normal",
            pinned: false,
            dock: input.dock ?? null,
          },
        ],
      };
    }),
  close: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
  focus: (id) =>
    set((s) => {
      const nextZ = s.topZ + 1;
      return {
        topZ: nextZ,
        windows: s.windows.map((w) => (w.id === id ? { ...w, z: nextZ } : w)),
      };
    }),
  move: (id, x, y) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })),
  resize: (id, w, h) =>
    set((s) => ({ windows: s.windows.map((win) => (win.id === id ? { ...win, w, h } : win)) })),
  setState: (id, state) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, state } : w)) })),
  togglePin: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, pinned: !w.pinned } : w)),
    })),
}));

export function useOpenWindow() {
  return useWindowStore.getState().open;
}

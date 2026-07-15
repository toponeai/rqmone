import { create } from "zustand";

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  createdAt: number;
  read: boolean;
}

interface NotificationStore {
  items: AppNotification[];
  panelOpen: boolean;
  push: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  togglePanel: () => void;
  setPanelOpen: (v: boolean) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  items: [],
  panelOpen: false,
  push: (n) =>
    set((s) => ({
      items: [
        { id: crypto.randomUUID(), createdAt: Date.now(), read: false, ...n },
        ...s.items,
      ].slice(0, 50),
    })),
  markAllRead: () =>
    set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setPanelOpen: (v) => set({ panelOpen: v }),
  clear: () => set({ items: [] }),
}));
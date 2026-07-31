import { create } from "zustand";
import type { EntityType } from "@/modules/entity/types";

interface CreateStore {
  dialogOpen: boolean;
  picking: boolean;
  pickedCoords: { lat: number; lng: number } | null;
  desiredType: EntityType | null;
  openDialog: (type?: EntityType | null) => void;
  closeDialog: () => void;
  requestPick: () => void;
  setPickedCoords: (c: { lat: number; lng: number } | null) => void;
  cancelPick: () => void;
}

export const useCreateStore = create<CreateStore>((set) => ({
  dialogOpen: false,
  picking: false,
  pickedCoords: null,
  desiredType: null,
  openDialog: (type = null) => set({ dialogOpen: true, desiredType: type, pickedCoords: null }),
  closeDialog: () => set({ dialogOpen: false, picking: false }),
  requestPick: () => set({ dialogOpen: false, picking: true }),
  setPickedCoords: (c) => set({ pickedCoords: c, picking: false, dialogOpen: !!c }),
  cancelPick: () => set({ picking: false }),
}));

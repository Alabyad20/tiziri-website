import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage as platformStorage } from "@/platform";
import type { RoomTemplate } from "@/lib/roomTemplates";

/**
 * Room templates calibrated in-app (photos + masks stored as data URLs).
 * Bundled templates ship with the app; these are the admin's own rooms.
 */
interface TemplatesState {
  custom: RoomTemplate[];
  addTemplate: (t: RoomTemplate) => void;
  removeTemplate: (id: string) => void;
}

export const useTemplates = create<TemplatesState>()(
  persist(
    (set) => ({
      custom: [],
      addTemplate: (t) =>
        set((s) => ({ custom: [t, ...s.custom.filter((c) => c.id !== t.id)] })),
      removeTemplate: (id) =>
        set((s) => ({ custom: s.custom.filter((c) => c.id !== id) })),
    }),
    { name: "tiziri-studio:templates", storage: createJSONStorage(() => platformStorage) },
  ),
);

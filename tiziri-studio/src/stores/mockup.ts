import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage as platformStorage } from "@/platform";
import { temporal } from "zundo";

export interface MockupHistoryEntry {
  id: string;
  at: string;
  sceneName: string;
  rugLabel: string;
  /** Small JPEG of the composite for the history rail. */
  thumb: string;
}

export interface MockupState {
  /** Downscaled data URL of the uploaded rug photo. */
  rugImage: string | null;
  rugAspect: number; // height / width of the source photo
  rugLabel: string;
  sceneId: string;
  widthM: number;
  offsetX: number;
  depth: number;
  rotation: number;
  history: MockupHistoryEntry[];

  setRug: (image: string, aspect: number, label: string) => void;
  clearRug: () => void;
  setRugLabel: (label: string) => void;
  setScene: (id: string) => void;
  setPlacement: (p: Partial<Pick<MockupState, "widthM" | "offsetX" | "depth" | "rotation">>) => void;
  resetPlacement: () => void;
  addHistory: (e: MockupHistoryEntry) => void;
  removeHistory: (id: string) => void;
}

const defaultPlacement = { widthM: 2.4, offsetX: 0, depth: 2.6, rotation: 0 };

export const useMockup = create<MockupState>()(
  temporal(
    persist(
      (set) => ({
        rugImage: null,
        rugAspect: 1.5,
        rugLabel: "",
        sceneId: "living",
        ...defaultPlacement,
        history: [],

        setRug: (rugImage, rugAspect, rugLabel) => set({ rugImage, rugAspect, rugLabel }),
        clearRug: () => set({ rugImage: null, rugLabel: "" }),
        setRugLabel: (rugLabel) => set({ rugLabel }),
        setScene: (sceneId) => set({ sceneId }),
        setPlacement: (p) => set(p),
        resetPlacement: () => set(defaultPlacement),
        addHistory: (e) => set((s) => ({ history: [e, ...s.history].slice(0, 12) })),
        removeHistory: (id) =>
          set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      }),
      { name: "tiziri-studio:mockup", storage: createJSONStorage(() => platformStorage) },
    ),
    {
      // Undo/redo covers design decisions only, not the export history rail.
      partialize: (s) => ({
        rugImage: s.rugImage,
        rugAspect: s.rugAspect,
        rugLabel: s.rugLabel,
        sceneId: s.sceneId,
        widthM: s.widthM,
        offsetX: s.offsetX,
        depth: s.depth,
        rotation: s.rotation,
      }),
      limit: 80,
    },
  ),
);

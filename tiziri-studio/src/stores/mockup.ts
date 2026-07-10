import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage as platformStorage } from "@/platform";
import { temporal } from "zundo";
import type { PileType } from "@/lib/rooms";
import type { RugAnalysis } from "@/lib/rugAnalysis";

export interface MockupHistoryEntry {
  id: string;
  at: string;
  sceneName: string;
  rugLabel: string;
  /** Small JPEG of the composite for the history rail. */
  thumb: string;
}

export interface MockupState {
  /** Downscaled data URL of the prepared (isolated) rug photo. */
  rugImage: string | null;
  rugAspect: number; // height / width of the prepared photo
  rugLabel: string;
  sceneId: string;
  /** Real rug size in meters — width across the room, length into it. */
  widthM: number;
  lengthM: number;
  offsetX: number;
  depth: number;
  rotation: number;
  pile: PileType;
  fringe: boolean;
  /** Export presets selected in the rail — AI recommendations preselect these. */
  exportPresets: string[];
  /** Last analysis of the current rug. Not part of undo history. */
  analysis: RugAnalysis | null;
  history: MockupHistoryEntry[];

  setRug: (image: string, aspect: number, label: string) => void;
  clearRug: () => void;
  setRugLabel: (label: string) => void;
  setScene: (id: string) => void;
  setPlacement: (
    p: Partial<Pick<MockupState, "widthM" | "lengthM" | "offsetX" | "depth" | "rotation">>,
  ) => void;
  setPile: (pile: PileType) => void;
  setFringe: (fringe: boolean) => void;
  setExportPresets: (exportPresets: string[]) => void;
  setAnalysis: (analysis: RugAnalysis | null) => void;
  resetPlacement: () => void;
  addHistory: (e: MockupHistoryEntry) => void;
  removeHistory: (id: string) => void;
}

const defaultPlacement = { offsetX: 0, depth: 2.6, rotation: 0 };

export const useMockup = create<MockupState>()(
  temporal(
    persist(
      (set) => ({
        rugImage: null,
        rugAspect: 1.5,
        rugLabel: "",
        sceneId: "living",
        widthM: 2.4,
        lengthM: 1.6,
        pile: "low",
        fringe: false,
        exportPresets: ["etsy", "instagram"],
        analysis: null,
        ...defaultPlacement,
        history: [],

        setRug: (rugImage, rugAspect, rugLabel) =>
          set((s) => ({
            rugImage,
            rugAspect,
            rugLabel,
            analysis: null, // stale for the previous rug
            // Keep the chosen width; derive length from the photo's true shape.
            lengthM: Math.round(s.widthM * rugAspect * 100) / 100,
          })),
        clearRug: () => set({ rugImage: null, rugLabel: "", analysis: null }),
        setRugLabel: (rugLabel) => set({ rugLabel }),
        setScene: (sceneId) => set({ sceneId }),
        setPlacement: (p) => set(p),
        setPile: (pile) => set({ pile }),
        setFringe: (fringe) => set({ fringe }),
        setExportPresets: (exportPresets) => set({ exportPresets }),
        setAnalysis: (analysis) => set({ analysis }),
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
        lengthM: s.lengthM,
        offsetX: s.offsetX,
        depth: s.depth,
        rotation: s.rotation,
        pile: s.pile,
        fringe: s.fringe,
      }),
      limit: 80,
    },
  ),
);

// Dev-only introspection handle — dynamic import() in the console creates a
// second module instance under Vite HMR, which silently probes a shadow store.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__mockupStore = useMockup;
}

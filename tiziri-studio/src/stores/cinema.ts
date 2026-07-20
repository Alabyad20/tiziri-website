import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage as platformStorage } from "@/platform";

/** Aspect presets for the exported film. */
export type CineAspect = "9:16" | "1:1" | "16:9";

export interface CinemaState {
  /** Downscaled data URL of the source rug photo — the immutable input. */
  rugImage: string | null;
  rugAspect: number; // height / width
  rugLabel: string;
  moveId: string;
  plateId: string;
  elevationDeg: number; // base framing camera elevation
  durationSec: number;
  shadow: boolean;
  aspect: CineAspect;

  setRug: (image: string, aspect: number, label: string) => void;
  clearRug: () => void;
  setRugLabel: (label: string) => void;
  set: (
    p: Partial<
      Pick<
        CinemaState,
        "moveId" | "plateId" | "elevationDeg" | "durationSec" | "shadow" | "aspect"
      >
    >,
  ) => void;
}

export const useCinema = create<CinemaState>()(
  persist(
    (set) => ({
      rugImage: null,
      rugAspect: 1.5,
      rugLabel: "",
      moveId: "push",
      plateId: "plaster",
      elevationDeg: 58,
      durationSec: 8,
      shadow: true,
      aspect: "9:16",

      setRug: (rugImage, rugAspect, rugLabel) => set({ rugImage, rugAspect, rugLabel }),
      clearRug: () => set({ rugImage: null, rugLabel: "" }),
      setRugLabel: (rugLabel) => set({ rugLabel }),
      set: (p) => set(p),
    }),
    { name: "tiziri-studio:cinema", storage: createJSONStorage(() => platformStorage) },
  ),
);

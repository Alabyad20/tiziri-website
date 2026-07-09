import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage as platformStorage } from "@/platform";
import { temporal } from "zundo";
import type { NamingResult } from "@/lib/generators/naming";
import type { Swatch } from "@/lib/palette";

interface NamingState {
  image: string | null;
  palette: Swatch[];
  styleHint: string;
  notes: string;
  result: NamingResult | null;
  source: "ai" | "template" | null;
  setImage: (image: string | null, palette: Swatch[]) => void;
  setStyleHint: (styleHint: string) => void;
  setNotes: (notes: string) => void;
  setResult: (result: NamingResult | null, source?: "ai" | "template" | null) => void;
  patchResult: (patch: Partial<NamingResult>) => void;
}

export const useNaming = create<NamingState>()(
  temporal(
    persist(
      (set) => ({
        image: null,
        palette: [],
        styleHint: "Let the photo decide",
        notes: "",
        result: null,
        source: null,
        setImage: (image, palette) => set({ image, palette }),
        setStyleHint: (styleHint) => set({ styleHint }),
        setNotes: (notes) => set({ notes }),
        setResult: (result, source = null) => set({ result, source }),
        patchResult: (patch) =>
          set((s) => (s.result ? { result: { ...s.result, ...patch } } : s)),
      }),
      { name: "tiziri-studio:naming", storage: createJSONStorage(() => platformStorage) },
    ),
    { limit: 100 },
  ),
);

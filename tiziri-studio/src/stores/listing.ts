import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage as platformStorage } from "@/platform";
import { temporal } from "zundo";
import type { ListingCopy, ListingInputs } from "@/lib/generators/listing";

interface ListingState {
  rugSlug: string | null;
  inputs: ListingInputs;
  copy: ListingCopy | null;
  /** Whether the current copy came from Claude or the built-in template. */
  source: "ai" | "template" | null;
  setRugSlug: (slug: string | null) => void;
  setInputs: (patch: Partial<ListingInputs>) => void;
  setCopy: (copy: ListingCopy | null, source?: "ai" | "template" | null) => void;
  patchCopy: (patch: Partial<ListingCopy>) => void;
}

export const emptyInputs: ListingInputs = {
  name: "",
  style: "Beni Ourain",
  dimensions: "",
  material: "100% wool, cotton warp",
  pile: "Hand-knotted wool pile",
  age: "Contemporary",
  price: 650,
  color: "",
  notes: "",
};

export const useListing = create<ListingState>()(
  temporal(
    persist(
      (set) => ({
        rugSlug: null,
        inputs: emptyInputs,
        copy: null,
        source: null,
        setRugSlug: (rugSlug) => set({ rugSlug }),
        setInputs: (patch) => set((s) => ({ inputs: { ...s.inputs, ...patch } })),
        setCopy: (copy, source = null) => set({ copy, source }),
        patchCopy: (patch) =>
          set((s) => (s.copy ? { copy: { ...s.copy, ...patch } } : s)),
      }),
      { name: "tiziri-studio:listing", storage: createJSONStorage(() => platformStorage) },
    ),
    { limit: 100 },
  ),
);

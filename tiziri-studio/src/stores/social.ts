import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage as platformStorage } from "@/platform";
import { temporal } from "zundo";
import type { SocialCopy } from "@/lib/generators/social";

export type SocialTab = "instagram" | "pinterest" | "facebook" | "email";

interface SocialState {
  rugSlug: string | null;
  notes: string;
  tab: SocialTab;
  copy: SocialCopy | null;
  source: "ai" | "template" | null;
  setRugSlug: (slug: string | null) => void;
  setNotes: (notes: string) => void;
  setTab: (tab: SocialTab) => void;
  setCopy: (copy: SocialCopy | null, source?: "ai" | "template" | null) => void;
  patchCopy: (patch: Partial<SocialCopy>) => void;
}

export const useSocial = create<SocialState>()(
  temporal(
    persist(
      (set) => ({
        rugSlug: null,
        notes: "",
        tab: "instagram",
        copy: null,
        source: null,
        setRugSlug: (rugSlug) => set({ rugSlug }),
        setNotes: (notes) => set({ notes }),
        setTab: (tab) => set({ tab }),
        setCopy: (copy, source = null) => set({ copy, source }),
        patchCopy: (patch) => set((s) => (s.copy ? { copy: { ...s.copy, ...patch } } : s)),
      }),
      { name: "tiziri-studio:social", storage: createJSONStorage(() => platformStorage) },
    ),
    {
      limit: 100,
      // Tab switching shouldn't pollute undo history.
      partialize: (s) => ({ rugSlug: s.rugSlug, notes: s.notes, copy: s.copy }),
    },
  ),
);

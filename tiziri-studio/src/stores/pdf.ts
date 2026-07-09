import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage as platformStorage } from "@/platform";
import { temporal } from "zundo";

interface PdfState {
  rugSlug: string | null;
  /** Story text on the sheet — initialized from the catalog, editable. */
  story: string;
  designerNotes: string;
  showPrice: boolean;
  setRug: (slug: string, story: string) => void;
  setStory: (story: string) => void;
  setDesignerNotes: (designerNotes: string) => void;
  setShowPrice: (showPrice: boolean) => void;
}

export const usePdf = create<PdfState>()(
  temporal(
    persist(
      (set) => ({
        rugSlug: null,
        story: "",
        designerNotes: "",
        showPrice: true,
        setRug: (rugSlug, story) => set({ rugSlug, story }),
        setStory: (story) => set({ story }),
        setDesignerNotes: (designerNotes) => set({ designerNotes }),
        setShowPrice: (showPrice) => set({ showPrice }),
      }),
      { name: "tiziri-studio:pdf", storage: createJSONStorage(() => platformStorage) },
    ),
    { limit: 60 },
  ),
);

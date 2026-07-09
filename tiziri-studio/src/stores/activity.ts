import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StudioId = "mockup" | "listing" | "naming" | "pdf" | "social";

export const studioMeta: Record<StudioId, { label: string; route: string }> = {
  mockup: { label: "Mockup Studio", route: "/mockup" },
  listing: { label: "Listing Studio", route: "/listing" },
  naming: { label: "Naming Studio", route: "/naming" },
  pdf: { label: "Designer PDF", route: "/pdf" },
  social: { label: "Social Studio", route: "/social" },
};

export interface ProjectEntry {
  id: string;
  studio: StudioId;
  title: string;
  subtitle?: string;
  at: string; // ISO
}

export interface ExportEntry {
  id: string;
  studio: StudioId;
  title: string;
  kind: string; // "PNG" | "PDF" | "Copy" ...
  at: string;
}

interface ActivityState {
  projects: ProjectEntry[];
  exports: ExportEntry[];
  /** Upsert by id so re-saving a project moves it to the top instead of duplicating. */
  logProject: (p: Omit<ProjectEntry, "at">) => void;
  logExport: (e: Omit<ExportEntry, "id" | "at">) => void;
  clear: () => void;
}

const CAP = 30;

export const useActivity = create<ActivityState>()(
  persist(
    (set) => ({
      projects: [],
      exports: [],
      logProject: (p) =>
        set((s) => ({
          projects: [
            { ...p, at: new Date().toISOString() },
            ...s.projects.filter((x) => x.id !== p.id),
          ].slice(0, CAP),
        })),
      logExport: (e) =>
        set((s) => ({
          exports: [
            { ...e, id: crypto.randomUUID(), at: new Date().toISOString() },
            ...s.exports,
          ].slice(0, CAP),
        })),
      clear: () => set({ projects: [], exports: [] }),
    }),
    { name: "tiziri-studio:activity" },
  ),
);

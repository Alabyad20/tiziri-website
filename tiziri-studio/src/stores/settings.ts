import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage as platformStorage } from "@/platform";

export type Theme = "light" | "dark" | "system";

interface SettingsState {
  theme: Theme;
  /** Anthropic API key — stored locally only, never leaves this machine except to call the API. */
  apiKey: string;
  brandName: string;
  websiteUrl: string;
  /** Voice notes injected into every generation prompt. */
  brandVoice: string;
  setTheme: (t: Theme) => void;
  setApiKey: (k: string) => void;
  setBrandName: (n: string) => void;
  setWebsiteUrl: (u: string) => void;
  setBrandVoice: (v: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      apiKey: "",
      brandName: "Tiziri",
      websiteUrl: "https://tizirirugs.com",
      brandVoice:
        "Quiet, editorial, confident. Short sentences. Concrete craft details over adjectives. Never salesy, never exclamation marks.",
      setTheme: (theme) => set({ theme }),
      setApiKey: (apiKey) => set({ apiKey }),
      setBrandName: (brandName) => set({ brandName }),
      setWebsiteUrl: (websiteUrl) => set({ websiteUrl }),
      setBrandVoice: (brandVoice) => set({ brandVoice }),
    }),
    { name: "tiziri-studio:settings", storage: createJSONStorage(() => platformStorage) },
  ),
);

export function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

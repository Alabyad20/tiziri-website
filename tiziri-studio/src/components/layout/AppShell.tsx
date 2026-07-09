import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar, navItems } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { Toaster } from "@/components/ui/Toaster";
import { useSettings, applyTheme } from "@/stores/settings";
import { IconMoon, IconSun } from "@/components/icons";

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useSettings();

  // Keep the document theme in sync (and follow OS changes in "system" mode).
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Global shortcuts: ⌘K palette, ⌘1–6 studios, ⌘, settings.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        navigate("/settings");
        return;
      }
      if (mod && !e.shiftKey && !e.altKey) {
        const item = navItems.find((n) => n.shortcut === e.key);
        if (item) {
          e.preventDefault();
          navigate(item.to);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="flex h-full">
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      <div className="relative min-w-0 flex-1 overflow-y-auto">
        {/* Floating theme toggle */}
        <button
          onClick={() => {
            const next = isDark ? "light" : "dark";
            setTheme(next);
            applyTheme(next);
          }}
          className="fixed top-5 right-6 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-2 shadow-soft transition-all hover:text-ink print:hidden"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>

        <main className="mx-auto max-w-6xl px-8 py-10 pb-24">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </div>
  );
}

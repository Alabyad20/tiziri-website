import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar, Wordmark, navItems } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { Toaster } from "@/components/ui/Toaster";
import { useSettings, applyTheme } from "@/stores/settings";
import { IconMoon, IconSearch, IconSun, IconX } from "@/components/icons";

function MenuIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
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

  // Close the mobile drawer on any route change (back button, deep links).
  useEffect(() => setDrawerOpen(false), [location.pathname]);

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
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
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
  }, [navigate, drawerOpen]);

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Mobile / tablet top bar */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line bg-surface/80 px-3 backdrop-blur-sm lg:hidden print:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink"
          aria-label="Open navigation"
        >
          <MenuIcon />
        </button>
        <Wordmark compact />
        <span className="flex-1" />
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink"
          aria-label="Search"
        >
          <IconSearch size={17} />
        </button>
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink"
          aria-label="Toggle dark mode"
        >
          {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>
      </header>

      {/* Desktop sidebar */}
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} className="hidden lg:flex" />

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="animate-overlay-in absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw]">
            <Sidebar
              onOpenPalette={() => setPaletteOpen(true)}
              onNavigate={() => setDrawerOpen(false)}
              className="w-full bg-surface shadow-lift"
            />
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
              aria-label="Close navigation"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="relative min-w-0 flex-1 overflow-y-auto">
        {/* Floating theme toggle — desktop only; the top bar covers small screens */}
        <button
          onClick={toggleTheme}
          className="fixed top-5 right-6 z-20 hidden h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-2 shadow-soft transition-all hover:text-ink lg:flex print:hidden"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>

        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { navItems } from "./Sidebar";
import { catalog } from "@/lib/rugs";
import { useSettings, applyTheme } from "@/stores/settings";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/Kbd";
import { IconArrowRight, IconMoon, IconSearch, IconSun } from "@/components/icons";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { theme, setTheme } = useSettings();

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = navItems.map((n) => ({
      id: `nav:${n.to}`,
      group: "Go to",
      label: n.label,
      run: () => navigate(n.to),
    }));
    nav.push({
      id: "nav:/settings",
      group: "Go to",
      label: "Settings",
      run: () => navigate("/settings"),
    });
    const actions: Command[] = [
      {
        id: "theme",
        group: "Actions",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        run: () => {
          const next = theme === "dark" ? "light" : "dark";
          setTheme(next);
          applyTheme(next);
        },
      },
    ];
    const rugs: Command[] = catalog.map((r) => ({
      id: `rug:${r.slug}`,
      group: "Catalog",
      label: r.name,
      hint: `${r.style} · $${r.price}`,
      run: () => navigate(`/listing?rug=${r.slug}`),
    }));
    return [...nav, ...actions, ...rugs];
  }, [navigate, theme, setTheme]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.filter((c) => c.group !== "Catalog").slice(0, 12);
    return commands
      .filter(
        (c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Wait a frame so the element exists before focusing.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  function runActive(cmd: Command | undefined) {
    if (!cmd) return;
    cmd.run();
    onClose();
  }

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-40 flex items-start justify-center bg-ink/20 px-4 pt-[12vh] backdrop-blur-[2px] sm:pt-[18vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-fade-up w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <IconSearch size={16} className="text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runActive(results[active]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Search studios, rugs, actions…"
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>
        <ul ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-ink-3">Nothing found</li>
          )}
          {results.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                onClick={() => runActive(cmd)}
                onMouseMove={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  i === active ? "bg-surface-2 text-ink" : "text-ink-2",
                )}
              >
                <span className="w-14 shrink-0 text-[11px] font-medium tracking-wide text-ink-3 uppercase">
                  {cmd.group}
                </span>
                <span className="flex-1 truncate font-medium">{cmd.label}</span>
                {cmd.hint && <span className="truncate text-xs text-ink-3">{cmd.hint}</span>}
                {i === active && <IconArrowRight size={14} className="shrink-0 text-ink-3" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-3">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> select
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            {theme === "dark" ? <IconMoon size={12} /> : <IconSun size={12} />}
            Tiziri Studio
          </span>
        </div>
      </div>
    </div>
  );
}

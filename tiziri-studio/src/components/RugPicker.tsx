import { useEffect, useMemo, useRef, useState } from "react";
import { catalog, heroImage, type Rug } from "@/lib/rugs";
import { cn } from "@/lib/utils";
import { IconChevronDown, IconSearch } from "@/components/icons";

/**
 * Searchable catalog combobox. Lists the live tizirirugs.com catalog
 * with thumbnails, style and price.
 */
export function RugPicker({
  value,
  onChange,
  placeholder = "Choose a rug from the catalog",
  className,
}: {
  value: Rug | null;
  onChange: (rug: Rug) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.style.toLowerCase().includes(q) ||
        r.color.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 text-left text-sm transition-colors hover:border-line-strong"
        aria-expanded={open}
      >
        {value ? (
          <>
            <img
              src={heroImage(value)}
              alt=""
              className="h-7 w-7 rounded-lg object-cover"
              loading="lazy"
            />
            <span className="min-w-0 flex-1">
              <span className="font-medium text-ink">{value.name}</span>
              <span className="ml-2 text-ink-3">{value.style}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-ink-3">{placeholder}</span>
        )}
        <IconChevronDown size={15} className="shrink-0 text-ink-3" />
      </button>

      {open && (
        <div className="animate-fade-up absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
            <IconSearch size={15} className="text-ink-3" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, style, or color…"
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto p-1.5" role="listbox">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-[13px] text-ink-3">
                No rugs match “{query}”
              </li>
            )}
            {results.map((rug) => (
              <li key={rug.slug}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(rug);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-2",
                    value?.slug === rug.slug && "bg-surface-2",
                  )}
                  role="option"
                  aria-selected={value?.slug === rug.slug}
                >
                  <img
                    src={heroImage(rug)}
                    alt=""
                    className="h-9 w-9 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{rug.name}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {rug.style} · {rug.age}
                    </span>
                  </span>
                  <span className="text-[13px] font-medium text-ink-2">${rug.price}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

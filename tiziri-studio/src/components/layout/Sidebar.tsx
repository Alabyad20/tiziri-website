import { NavLink } from "react-router-dom";
import { cn, modKey } from "@/lib/utils";
import { Kbd } from "@/components/ui/Kbd";
import {
  IconCinema,
  IconDashboard,
  IconListing,
  IconMockup,
  IconNaming,
  IconPdf,
  IconSearch,
  IconSettings,
  IconSocial,
} from "@/components/icons";
import type { ComponentType } from "react";

export const navItems: Array<{
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  shortcut: string;
}> = [
  { to: "/", label: "Dashboard", icon: IconDashboard, shortcut: "1" },
  { to: "/mockup", label: "Mockup Studio", icon: IconMockup, shortcut: "2" },
  { to: "/cinema", label: "Cinematographer", icon: IconCinema, shortcut: "3" },
  { to: "/listing", label: "Listing Studio", icon: IconListing, shortcut: "4" },
  { to: "/naming", label: "Naming Studio", icon: IconNaming, shortcut: "5" },
  { to: "/pdf", label: "Designer PDF", icon: IconPdf, shortcut: "6" },
  { to: "/social", label: "Social Studio", icon: IconSocial, shortcut: "7" },
];

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-ink">
        <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M16 4l3.6 8.4L28 16l-8.4 3.6L16 28l-3.6-8.4L4 16l8.4-3.6z" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block font-display text-[17px] font-semibold tracking-tight text-ink">
          Tiziri
        </span>
        {!compact && (
          <span className="mt-0.5 block text-[10px] font-medium tracking-[0.18em] text-ink-3 uppercase">
            Studio
          </span>
        )}
      </span>
    </span>
  );
}

export function Sidebar({
  onOpenPalette,
  onNavigate,
  className,
}: {
  onOpenPalette: () => void;
  /** Called after any nav choice — lets the mobile drawer close itself. */
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r border-line bg-surface/60 print:hidden",
        className,
      )}
    >
      {/* Wordmark */}
      <div className="px-5 pt-6 pb-7">
        <Wordmark />
      </div>

      {/* Search / command palette trigger */}
      <div className="px-3 pb-4">
        <button
          onClick={() => {
            onNavigate?.();
            onOpenPalette();
          }}
          className="flex h-9 w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-[13px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
        >
          <IconSearch size={14} />
          <span className="flex-1 text-left">Search…</span>
          <span className="hidden items-center gap-0.5 lg:flex">
            <Kbd>{modKey}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map(({ to, label, icon: Icon, shortcut }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex h-9 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-all",
                isActive
                  ? "bg-surface-2 text-ink shadow-soft"
                  : "text-ink-2 hover:bg-surface-2/60 hover:text-ink",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-accent" : "text-ink-3 group-hover:text-ink-2",
                  )}
                />
                <span className="flex-1">{label}</span>
                <span className="hidden opacity-0 transition-opacity group-hover:opacity-100 lg:inline">
                  <Kbd>
                    {modKey}
                    {shortcut}
                  </Kbd>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Settings pinned to the bottom */}
      <div className="border-t border-line p-3">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex h-9 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-all",
              isActive
                ? "bg-surface-2 text-ink shadow-soft"
                : "text-ink-2 hover:bg-surface-2/60 hover:text-ink",
            )
          }
        >
          <IconSettings size={17} className="text-ink-3 group-hover:text-ink-2" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}

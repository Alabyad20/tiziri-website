import { useToasts } from "@/stores/toast";
import { cn } from "@/lib/utils";
import { IconCheck, IconX } from "@/components/icons";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "animate-fade-up pointer-events-auto flex items-center gap-2.5 rounded-xl border border-line bg-surface py-2.5 pr-2 pl-4 text-sm text-ink shadow-lift",
          )}
        >
          {t.kind === "success" && <IconCheck size={15} className="text-positive" />}
          {t.kind === "error" && <IconX size={15} className="text-danger" />}
          <span>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="ml-1 rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label="Dismiss"
          >
            <IconX size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

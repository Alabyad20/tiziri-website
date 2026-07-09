import { useEffect } from "react";
import type { TemporalState } from "zundo";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";

interface TemporalStore {
  temporal: StoreApi<TemporalState<unknown>>;
}

function isEditableTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return (
    !!t &&
    (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
  );
}

/**
 * Wire ⌘Z / ⌘⇧Z (or Ctrl on Windows) to a zundo temporal store while the
 * calling page is mounted. Text fields keep their native undo.
 * Returns live undo/redo availability for toolbar buttons.
 */
export function useUndoRedo(store: TemporalStore) {
  const { undo, redo, pastStates, futureStates } = useStore(store.temporal, (s) => s);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || isEditableTarget(e)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        store.temporal.getState().undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        store.temporal.getState().redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  return {
    undo: () => undo(),
    redo: () => redo(),
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
  };
}

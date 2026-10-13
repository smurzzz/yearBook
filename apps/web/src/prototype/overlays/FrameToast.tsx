import { Check, ImageOff, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useMockApp } from "@/prototype/store";

const LIFETIME = 4200;

/** In-frame toast: Undo after approve / reject, and success confirmations. */
export const FrameToast = () => {
  const { state, dispatch } = useMockApp();
  const toast = state.toast;
  const key = toast?.key ?? 0;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = window.setTimeout(() => dispatch({ type: "dismissToast" }), LIFETIME);
    return () => window.clearTimeout(timer);
  }, [dispatch, key, paused, toast]);

  if (!toast) return null;

  const isUndo = toast.kind === "undo";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[104px] z-50 flex justify-center px-4">
      <div
        key={key}
        role="status"
        aria-live="polite"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        className="pointer-events-auto flex w-full max-w-[330px] animate-toast-in items-center gap-3 overflow-hidden rounded-2xl border border-onimage-border bg-canvas/95 px-3.5 py-3 text-onimage shadow-sheet backdrop-blur-md"
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            isUndo ? "bg-onimage-surface" : "bg-status-approved/25 text-status-approved",
          )}
        >
          {isUndo ? <Undo2 className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label font-bold">{toast.title}</span>
          {toast.description ? (
            <span className="mt-0.5 block truncate text-caption opacity-80">{toast.description}</span>
          ) : null}
        </span>
        {isUndo ? (
          <button
            type="button"
            onClick={() => dispatch({ type: "undo" })}
            className="shrink-0 rounded-full bg-onimage-surface px-3 py-1.5 text-caption font-bold transition-colors hover:bg-onimage-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60"
          >
            {toast.actionLabel ?? "Undo"}
          </button>
        ) : null}
      </div>
    </div>
  );
};

/** Small helper used by the states page to show a failed-image fallback. */
export const BrokenImageTile = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-tile border border-dashed border-border bg-muted text-muted-foreground",
      className,
    )}
  >
    <ImageOff className="size-5" aria-hidden="true" />
    <span className="text-caption font-semibold">Preview unavailable</span>
  </div>
);

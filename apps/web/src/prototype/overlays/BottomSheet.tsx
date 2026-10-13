import { X } from "lucide-react";
import * as React from "react";
import { useEffect, useId, useState } from "react";

import { IconButton } from "@/components/app/PhoneButton";
import { cn } from "@/lib/utils";

export type SheetSize = "auto" | "tall" | "full";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: SheetSize;
  footer?: React.ReactNode;
  hideClose?: boolean;
  /** Cover-led sheets: no handle, floating close button over the artwork. */
  bare?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

const SIZES: Record<SheetSize, string> = {
  auto: "max-h-[86%] rounded-t-sheet",
  tall: "h-[86%] rounded-t-sheet",
  full: "h-full rounded-none",
};

/**
 * The app's bottom sheet. Rendered *inside* the phone frame — never a document
 * portal — so a sheet can never cover the design canvas around the device.
 * Enter animation on open, short reverse animation on close, Escape and
 * backdrop click both dismiss.
 */
export const BottomSheet = ({
  open,
  onClose,
  title,
  description,
  size = "auto",
  footer,
  hideClose = false,
  bare = false,
  className,
  bodyClassName,
  children,
}: BottomSheetProps) => {
  const [visible, setVisible] = useState(open);
  const titleId = useId();
  const descId = useId();
  const panelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const raf = window.requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      window.cancelAnimationFrame(raf);
    };
  }, [open, onClose]);

  if (!visible) return null;
  const closing = !open;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-canvas/60 backdrop-blur-[2px]",
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col overflow-hidden border-t border-border bg-background shadow-sheet outline-none",
          SIZES[size],
          closing ? "animate-sheet-down" : "animate-sheet-up",
          className,
        )}
      >
        {bare ? null : (
          <div className="flex shrink-0 flex-col items-center pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
          </div>
        )}
        {title ? (
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3">
            <div className="min-w-0">
              <h3 id={titleId} className="text-heading font-bold text-foreground">
                {title}
              </h3>
              {description ? (
                <p id={descId} className="mt-1 text-label text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {hideClose ? null : (
              <IconButton size="iconSm" variant="muted" onClick={onClose} aria-label="Close">
                <X />
              </IconButton>
            )}
          </div>
        ) : !hideClose ? (
          <div className="pointer-events-none absolute right-4 top-4 z-20">
            <IconButton
              size="iconSm"
              variant={bare ? "onPhoto" : "muted"}
              onClick={onClose}
              aria-label="Close"
              className="pointer-events-auto"
            >
              <X />
            </IconButton>
          </div>
        ) : null}
        <div className={cn("no-scrollbar flex-1 overflow-y-auto overscroll-contain", bodyClassName)}>
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border bg-background px-5 pb-6 pt-4 safe-bottom">
            {footer}
          </div>
        ) : (
          <div className="h-5 shrink-0" aria-hidden="true" />
        )}
      </div>
    </div>
  );
};

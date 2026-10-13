import type { ReactNode } from "react";

import { Surface } from "@/components/app/Surface";
import { cn } from "@/lib/utils";
import { PhoneShell } from "@/prototype/PhoneShell";
import type { PrototypeState, Role } from "@/prototype/types";

/** Stage of full-size phone frames. Wraps on wide viewports, scrolls on narrow. */
export const FrameStage = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("no-scrollbar -mx-5 flex flex-wrap gap-10 overflow-x-auto px-5 pb-2", className)}>
    {children}
  </div>
);

export const FrameStageItem = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={cn("shrink-0", className)}>{children}</div>;

/**
 * Scaled-down frame for dense galleries (states, dark mode). The phone still
 * renders at its true 390 × 844 viewport — only the presentation is scaled, so
 * layout inside the device is never distorted.
 */
export const ScaledFrame = ({
  scale = 0.62,
  role,
  initial,
  script,
  forceTheme,
  caption,
  animate,
}: {
  scale?: number;
  role?: Role;
  initial?: Partial<PrototypeState>;
  script?: Parameters<typeof PhoneShell>[0]["script"];
  forceTheme?: "light" | "dark";
  caption?: string;
  animate?: boolean;
}) => (
  <div className="shrink-0" style={{ width: 410 * scale }}>
    <div style={{ height: 864 * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 410 }}>
        <PhoneShell
          role={role}
          initial={initial}
          script={script}
          forceTheme={forceTheme}
          animate={animate}
        />
      </div>
    </div>
    {caption ? (
      <p className="mt-3 text-caption font-semibold leading-[16px] text-muted-foreground">{caption}</p>
    ) : null}
  </div>
);

/** Labelled card that wraps one live component example. */
export const ComponentSpec = ({
  name,
  path,
  note,
  children,
  className,
}: {
  name: string;
  path: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <Surface className={cn("overflow-hidden", className)}>
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/70 bg-muted/40 px-4 py-3">
      <h3 className="text-label font-extrabold text-foreground">{name}</h3>
      <code className="font-mono text-caption text-muted-foreground">{path}</code>
    </div>
    <div className="p-4">{children}</div>
    {note ? (
      <p className="border-t border-border/70 px-4 py-3 text-caption leading-[17px] text-muted-foreground">
        {note}
      </p>
    ) : null}
  </Surface>
);

export const RowLabel = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 text-eyebrow font-bold uppercase text-muted-foreground">{children}</p>
);

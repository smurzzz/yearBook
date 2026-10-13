import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Colour token with its name, raw HSL value and role. */
export const TokenSwatch = ({
  name,
  value,
  role,
  className,
}: {
  name: string;
  value: string;
  role?: string;
  className?: string;
}) => (
  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-tile">
    <div className={cn("h-20 w-full", className)} style={{ background: `hsl(${value})` }} />
    <div className="p-3">
      <p className="font-mono text-caption font-semibold text-foreground">{name}</p>
      <p className="mt-1 font-mono text-caption text-muted-foreground">{value}</p>
      {role ? <p className="mt-1.5 text-caption leading-[16px] text-muted-foreground">{role}</p> : null}
    </div>
  </div>
);

export const SwatchGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("grid gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>{children}</div>
);

/** One row of the type scale. */
export const TypeRow = ({
  token,
  spec,
  sample,
  className,
  usage,
}: {
  token: string;
  spec: string;
  sample: string;
  className?: string;
  usage: string;
}) => (
  <div className="flex flex-col gap-2 border-b border-border/60 py-4 sm:flex-row sm:items-center sm:gap-6">
    <div className="w-[196px] shrink-0">
      <p className="font-mono text-caption font-semibold text-foreground">{token}</p>
      <p className="mt-0.5 font-mono text-caption text-muted-foreground">{spec}</p>
    </div>
    <p className={cn("min-w-0 flex-1 break-words text-foreground", className)}>{sample}</p>
    <p className="w-[210px] shrink-0 text-caption leading-[16px] text-muted-foreground">{usage}</p>
  </div>
);

export const SpacingScale = ({ steps }: { steps: number[] }) => (
  <div className="space-y-2">
    {steps.map((step) => (
      <div key={step} className="flex items-center gap-4">
        <span className="tabular w-12 shrink-0 font-mono text-caption text-muted-foreground">
          {step}
        </span>
        <span className="h-2.5 rounded-full bg-primary/25" style={{ width: `${step * 2}px` }} />
      </div>
    ))}
  </div>
);

export const RadiusRow = ({ items }: { items: { token: string; px: number; use: string }[] }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((item) => (
      <div key={item.token} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
        <span
          className="size-12 shrink-0 border-2 border-primary/50 bg-primary/10"
          style={{ borderRadius: `${item.px}px` }}
        />
        <span className="min-w-0">
          <span className="block font-mono text-caption font-semibold text-foreground">{item.token}</span>
          <span className="mt-0.5 block text-caption text-muted-foreground">
            {item.px}px · {item.use}
          </span>
        </span>
      </div>
    ))}
  </div>
);

export const ElevationRow = ({ items }: { items: { token: string; value: string; use: string }[] }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {items.map((item) => (
      <div key={item.token} className="rounded-2xl bg-card p-4" style={{ boxShadow: item.value }}>
        <p className="font-mono text-caption font-semibold text-foreground">{item.token}</p>
        <p className="mt-1 text-caption text-muted-foreground">{item.use}</p>
      </div>
    ))}
  </div>
);

export const MotionRow = ({
  items,
}: {
  items: { name: string; duration: string; easing: string; use: string }[];
}) => (
  <div className="divide-y divide-border/60">
    {items.map((item) => (
      <div key={item.name} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3">
        <span className="w-[168px] font-mono text-caption font-semibold text-foreground">
          {item.name}
        </span>
        <span className="tabular font-mono text-caption text-muted-foreground">{item.duration}</span>
        <span className="font-mono text-caption text-muted-foreground">{item.easing}</span>
        <span className="flex-1 text-caption text-muted-foreground">{item.use}</span>
      </div>
    ))}
  </div>
);

/** Records the accessibility contract of a token pair. */
export const ContrastRow = ({
  pair,
  ratio,
  className,
}: {
  pair: string;
  ratio: string;
  className?: string;
}) => (
  <div className={cn("flex items-center justify-between gap-4 rounded-xl border border-border/70 px-3.5 py-2.5", className)}>
    <span className="font-mono text-caption text-foreground">{pair}</span>
    <span className="tabular text-caption font-bold text-status-approved-foreground">{ratio}</span>
  </div>
);

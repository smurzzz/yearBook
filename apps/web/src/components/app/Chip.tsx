import * as React from "react";

import { cn } from "@/lib/utils";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  tone?: "brand" | "admin";
  icon?: React.ReactNode;
}

/** Selectable filter / tag chip used in the student event row and admin filters. */
export const Chip = ({ selected, tone = "brand", icon, className, children, ...props }: ChipProps) => (
  <button
    type="button"
    aria-pressed={selected}
    className={cn(
      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-label font-semibold transition-all duration-200 ease-smooth active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:size-4",
      selected
        ? tone === "admin"
          ? "border-transparent bg-admin text-admin-foreground shadow-tile"
          : "border-transparent bg-primary text-primary-foreground shadow-tile"
        : "border-border bg-card text-muted-foreground hover:text-foreground",
      className,
    )}
    {...props}
  >
    {icon}
    {children}
  </button>
);

export const ChipRow = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1", className)}>
    {children}
  </div>
);

/** Read-only chip used for photo metadata inside the viewer and detail sheets. */
export const MetaChip = ({
  icon,
  children,
  className,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-caption font-semibold text-muted-foreground [&_svg]:size-3.5",
      className,
    )}
  >
    {icon}
    {children}
  </span>
);

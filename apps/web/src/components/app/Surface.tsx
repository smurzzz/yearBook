import { ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/** The app's base surface: every card, sheet section and list sits on this. */
export const Surface = ({
  className,
  inset = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) => (
  <div
    className={cn(
      "rounded-[20px] border border-border/70 bg-card shadow-tile",
      inset && "p-4",
      className,
    )}
    {...props}
  />
);

export const Divider = ({ className }: { className?: string }) => (
  <div className={cn("h-px w-full bg-border/70", className)} role="presentation" />
);

export const SectionHeader = ({
  eyebrow,
  title,
  action,
  className,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  className?: string;
  onAction?: () => void;
}) => (
  <div className={cn("flex items-end justify-between gap-3", className)}>
    <div className="min-w-0">
      {eyebrow ? (
        <p className="text-eyebrow font-bold uppercase text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h2 className="truncate text-heading font-bold text-foreground">{title}</h2>
    </div>
    {action ? (
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 text-label font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {action}
      </button>
    ) : null}
  </div>
);

interface ListRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  chevron?: boolean;
  tone?: "default" | "destructive";
}

export const ListRow = ({
  icon,
  label,
  description,
  trailing,
  chevron,
  tone = "default",
  className,
  ...props
}: ListRowProps) => (
  <button
    type="button"
    className={cn(
      "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&_svg]:shrink-0",
      className,
    )}
    {...props}
  >
    {icon ? (
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full [&_svg]:size-[18px]",
          tone === "destructive"
            ? "bg-status-rejected-soft text-status-rejected-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
    ) : null}
    <span className="min-w-0 flex-1">
      <span
        className={cn(
          "block truncate text-body font-semibold",
          tone === "destructive" ? "text-destructive" : "text-foreground",
        )}
      >
        {label}
      </span>
      {description ? (
        <span className="mt-0.5 block truncate text-caption text-muted-foreground">
          {description}
        </span>
      ) : null}
    </span>
    {trailing}
    {chevron ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
  </button>
);

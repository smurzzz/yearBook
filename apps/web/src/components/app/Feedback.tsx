import { CloudOff, Info, RefreshCw, TriangleAlert, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { PhoneButton } from "@/components/app/PhoneButton";
import { cn } from "@/lib/utils";

/* ------------------------------- Skeletons ------------------------------- */

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("skeleton-sheen rounded-lg", className)} aria-hidden="true" />
);

export const SkeletonTile = ({ className }: { className?: string }) => (
  <Skeleton className={cn("aspect-square w-full rounded-tile", className)} />
);

export const SkeletonLine = ({ className }: { className?: string }) => (
  <Skeleton className={cn("h-3 w-full rounded-full", className)} />
);

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("overflow-hidden rounded-[20px] border border-border/70 bg-card", className)}>
    <Skeleton className="h-36 w-full rounded-none" />
    <div className="space-y-2 p-4">
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="h-2.5 w-1/3" />
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 9, className }: { count?: number; className?: string }) => (
  <div className={cn("grid grid-cols-3 gap-1", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonTile key={i} />
    ))}
  </div>
);

/* -------------------------------- Banners -------------------------------- */

interface InlineBannerProps {
  tone?: "info" | "warning" | "error" | "success";
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}

const BANNER_TONES = {
  info: { wrap: "border-primary/25 bg-primary/8 text-foreground", icon: Info, chip: "text-primary" },
  warning: {
    wrap: "border-status-pending/30 bg-status-pending-soft text-status-pending-foreground",
    icon: TriangleAlert,
    chip: "text-status-pending-foreground",
  },
  error: {
    wrap: "border-status-rejected/30 bg-status-rejected-soft text-status-rejected-foreground",
    icon: TriangleAlert,
    chip: "text-status-rejected-foreground",
  },
  success: {
    wrap: "border-status-approved/30 bg-status-approved-soft text-status-approved-foreground",
    icon: Info,
    chip: "text-status-approved-foreground",
  },
} as const;

export const InlineBanner = ({
  tone = "info",
  icon,
  title,
  message,
  action,
  className,
}: InlineBannerProps) => {
  const meta = BANNER_TONES[tone];
  const Icon = icon ?? meta.icon;
  const ActionIcon = action?.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-3.5",
        meta.wrap,
        className,
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className={cn("mt-0.5 size-[18px] shrink-0", meta.chip)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-label font-bold">{title}</p>
        {message ? <p className="mt-1 text-caption leading-[17px] opacity-90">{message}</p> : null}
        {action ? (
          <PhoneButton
            size="sm"
            variant="outline"
            className="mt-2.5"
            onClick={action.onClick}
          >
            {ActionIcon ? <ActionIcon /> : null}
            {action.label}
          </PhoneButton>
        ) : null}
      </div>
    </div>
  );
};

/** Persistent offline strip pinned above the tab bar. */
export const OfflineBanner = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex items-center justify-center gap-2 bg-status-pending-soft px-4 py-2 text-caption font-semibold text-status-pending-foreground",
      className,
    )}
    role="status"
  >
    <CloudOff className="size-4" aria-hidden="true" />
    No connection. Your photos are saved and will retry.
  </div>
);

export const ReconnectedBanner = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex items-center justify-center gap-2 bg-status-approved-soft px-4 py-2 text-caption font-semibold text-status-approved-foreground",
      className,
    )}
    role="status"
  >
    <Wifi className="size-4" aria-hidden="true" />
    Back online. Retrying your uploads.
  </div>
);

/* ------------------------------ Empty states ------------------------------ */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  variant?: "screen" | "inset";
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  message,
  action,
  variant = "screen",
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center text-center",
      variant === "screen" ? "px-6 py-14" : "rounded-2xl border border-dashed border-border px-5 py-8",
      className,
    )}
  >
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
        variant === "screen" ? "size-14" : "size-11",
      )}
    >
      <Icon className={variant === "screen" ? "size-6" : "size-5"} aria-hidden="true" />
    </span>
    <p className="mt-3.5 text-subhead font-bold text-foreground">{title}</p>
    <p className="mt-1 max-w-[15rem] text-label text-muted-foreground">{message}</p>
    {action ? (
      <PhoneButton className="mt-4" onClick={action.onClick}>
        {action.icon ? <action.icon /> : null}
        {action.label}
      </PhoneButton>
    ) : null}
  </div>
);

/** Camera / gallery permission prompt used in the upload states. */
export const PermissionPrompt = ({
  icon: Icon,
  title,
  message,
  allowLabel,
  denyLabel = "Not now",
  onAllow,
  onDeny,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  allowLabel: string;
  denyLabel?: string;
  onAllow: () => void;
  onDeny: () => void;
}) => (
  <div className="flex flex-col items-center px-6 py-8 text-center">
    <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
      <Icon className="size-6" aria-hidden="true" />
    </span>
    <p className="mt-3.5 text-subhead font-bold text-foreground">{title}</p>
    <p className="mt-1.5 max-w-[17rem] text-label text-muted-foreground">{message}</p>
    <div className="mt-5 grid w-full grid-cols-2 gap-2.5">
      <PhoneButton variant="outline" onClick={onDeny}>
        {denyLabel}
      </PhoneButton>
      <PhoneButton onClick={onAllow}>{allowLabel}</PhoneButton>
    </div>
  </div>
);

/** Full-screen takeover for maintenance. */
export const MaintenanceState = ({
  onRetry,
  className,
}: {
  onRetry: () => void;
  className?: string;
}) => (
  <div className={cn("flex h-full flex-col items-center justify-center px-8 text-center", className)}>
    <span className="flex size-14 items-center justify-center rounded-full bg-status-pending-soft text-status-pending-foreground">
      <TriangleAlert className="size-6" aria-hidden="true" />
    </span>
    <p className="mt-4 text-title font-bold text-foreground">Down for maintenance</p>
    <p className="mt-2 text-label text-muted-foreground">
      The yearbook upload service is being updated. Your drafts are safe on this device.
    </p>
    <PhoneButton className="mt-5" onClick={onRetry}>
      <RefreshCw />
      Try again
    </PhoneButton>
  </div>
);

export const Spinner = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-block size-5 animate-spin rounded-full border-2 border-muted border-t-primary",
      className,
    )}
    aria-hidden="true"
  />
);

export const PhotoScrim = ({ className }: { className?: string }) => (
  <span className={cn("photo-scrim pointer-events-none absolute inset-0", className)} aria-hidden="true" />
);

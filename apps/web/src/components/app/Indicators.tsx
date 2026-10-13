import {
  CalendarClock,
  Check,
  Clock3,
  Flag,
  GraduationCap,
  Layers,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { countdown } from "@/prototype/format";
import type { PhotoStatus, Role } from "@/prototype/types";

/* =========================================================================
   Indicators. House rule: status is NEVER color alone — every indicator
   carries an icon AND a text label, so it survives grayscale and print.
   ========================================================================= */

type Tone = "pending" | "approved" | "rejected" | "reported";

const TONES: Record<Tone, { icon: LucideIcon; label: string; soft: string; solid: string }> = {
  pending: {
    icon: Clock3,
    label: "Pending",
    soft: "bg-status-pending-soft text-status-pending-foreground",
    solid: "bg-status-pending text-onimage",
  },
  approved: {
    icon: Check,
    label: "Approved",
    soft: "bg-status-approved-soft text-status-approved-foreground",
    solid: "bg-status-approved text-onimage",
  },
  rejected: {
    icon: X,
    label: "Rejected",
    soft: "bg-status-rejected-soft text-status-rejected-foreground",
    solid: "bg-status-rejected text-onimage",
  },
  reported: {
    icon: Flag,
    label: "Reported",
    soft: "bg-status-reported-soft text-status-reported-foreground",
    solid: "bg-status-reported text-onimage",
  },
};

interface StatusChipProps {
  tone: Tone;
  label?: string;
  size?: "sm" | "md";
  emphasis?: "soft" | "solid";
  className?: string;
}

/** Admin-facing status pill. Never rendered on a student surface. */
export const StatusChip = ({
  tone,
  label,
  size = "sm",
  emphasis = "soft",
  className,
}: StatusChipProps) => {
  const meta = TONES[tone];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        size === "sm" ? "px-2 py-[3px] text-caption" : "px-2.5 py-1 text-label",
        emphasis === "soft" ? meta.soft : cn(meta.solid, "shadow-tile"),
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" />
      {label ?? meta.label}
    </span>
  );
};

interface StatusIconProps {
  status: PhotoStatus | "reported";
  className?: string;
}

/** Compact tile overlay: icon in a filled disc + accessible label. */
export const StatusIcon = ({ status, className }: StatusIconProps) => {
  const meta = TONES[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-[3px] text-caption font-semibold backdrop-blur-sm",
        meta.solid,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
};

export const ReportedBadge = ({ className }: { className?: string }) => (
  <StatusChip tone="reported" className={className} />
);

/** Deadline countdown. Highlighted under 3 days, muted once closed. */
export const CountdownChip = ({
  deadline,
  className,
  withIcon = true,
}: {
  deadline: string;
  className?: string;
  withIcon?: boolean;
}) => {
  const info = countdown(deadline);
  const Icon = info.closed ? CalendarClock : Clock3;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-caption font-semibold",
        info.closed && "bg-muted text-muted-foreground",
        !info.closed && info.urgent && "bg-status-pending-soft text-status-pending-foreground",
        !info.closed && !info.urgent && "bg-primary/10 text-primary",
        className,
      )}
    >
      {withIcon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {info.label}
      {info.urgent ? (
        <span className="ml-0.5 size-1.5 animate-pulse-soft rounded-full bg-status-pending" />
      ) : null}
    </span>
  );
};

export const RoleBadge = ({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) => {
  const admin = role === "admin";
  const Icon = admin ? ShieldCheck : GraduationCap;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold",
        admin ? "bg-admin text-admin-foreground" : "bg-primary/12 text-primary",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {admin ? "Yearbook Committee" : "Student"}
    </span>
  );
};

export const StackBadge = ({ count, className }: { count?: number; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full bg-onimage-surface px-1.5 py-[3px] text-caption font-semibold text-onimage backdrop-blur-sm",
      className,
    )}
  >
    <Layers className="size-3.5" aria-hidden="true" />
    {count && count > 1 ? count : ""}
    <span className="sr-only">Multi-photo batch</span>
  </span>
);

export const UnreadDot = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-block size-2.5 rounded-full bg-primary ring-2 ring-card",
      className,
    )}
    aria-hidden="true"
  />
);

export const ToneDot = ({ tone, className }: { tone: Tone; className?: string }) => (
  <span
    className={cn(
      "inline-block size-2 rounded-full",
      tone === "pending" && "bg-status-pending",
      tone === "approved" && "bg-status-approved",
      tone === "rejected" && "bg-status-rejected",
      tone === "reported" && "bg-status-reported",
      className,
    )}
    aria-hidden="true"
  />
);

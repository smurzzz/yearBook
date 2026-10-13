import { ChevronRight, Images, Lock, Unlock } from "lucide-react";

import { CountdownChip, StatusChip } from "@/components/app/Indicators";
import { PhotoScrim } from "@/components/app/Feedback";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/prototype/format";
import type { EventItem, Role } from "@/prototype/types";

interface EventCardProps {
  event: EventItem;
  role: Role;
  submissionCount?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Student: cover-led card with the countdown chip over the photo.
 * Admin: denser row card that leads with the Open / Closed state instead.
 */
export const EventCard = ({
  event,
  role,
  submissionCount = 0,
  onClick,
  className,
}: EventCardProps) => {
  const closed = !event.open;

  if (role === "admin") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3.5 rounded-[20px] border border-border/70 bg-card p-2.5 text-left shadow-tile transition-transform duration-200 ease-smooth active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span className="relative size-[68px] shrink-0 overflow-hidden rounded-2xl bg-muted">
          <img
            src={event.cover}
            alt=""
            crossOrigin="anonymous"
            loading="lazy"
            className="size-full object-cover"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-subhead font-bold text-foreground">{event.name}</span>
          <span className="mt-1 block text-caption text-muted-foreground">
            Deadline {formatDateTime(event.deadline)}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusChip
              tone={closed ? "rejected" : "approved"}
              label={closed ? "Closed" : "Open"}
            />
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[3px] text-caption font-semibold text-muted-foreground">
              <Images className="size-3.5" aria-hidden="true" />
              {submissionCount} photos
            </span>
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full overflow-hidden rounded-[20px] border border-border/70 bg-card text-left shadow-tile transition-transform duration-200 ease-smooth active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="relative block h-36 w-full overflow-hidden bg-muted">
        <img
          src={event.cover}
          alt=""
          crossOrigin="anonymous"
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.04]"
        />
        <PhotoScrim />
        <span className="absolute left-3 top-3">
          <CountdownChip deadline={event.deadline} />
        </span>
        <span className="absolute inset-x-4 bottom-3 block">
          <span className="block text-subhead font-bold text-onimage drop-shadow-[0_1px_6px_hsl(240_30%_6%/0.5)]">
            {event.name}
          </span>
        </span>
      </span>
      <span className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {closed ? <Lock className="size-3.5" aria-hidden="true" /> : <Unlock className="size-3.5" aria-hidden="true" />}
            {closed ? "Submissions closed" : "Submissions open"}
          </span>
          <span className="mt-1 block truncate text-label text-muted-foreground">
            {formatDateTime(event.deadline)}
          </span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </span>
    </button>
  );
};

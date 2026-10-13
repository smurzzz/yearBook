import { Flag } from "lucide-react";

import { StackBadge, StatusIcon } from "@/components/app/Indicators";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/prototype/types";

interface PhotoTileProps {
  photo: PhotoItem;
  /** Admin surfaces only. Student surfaces must never pass this. */
  showStatus?: boolean;
  /** Number of photos in this photo's batch (2+ gets the stacked icon). */
  batchCount?: number;
  onClick?: () => void;
  className?: string;
}

/** One square tile in a 3-column grid. Newest first, square, no captions. */
export const PhotoTile = ({
  photo,
  showStatus = false,
  batchCount = 1,
  onClick,
  className,
}: PhotoTileProps) => {
  const reported = Boolean(photo.removalRequest && !photo.removalRequest.resolved);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative aspect-square w-full overflow-hidden rounded-tile bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        className,
      )}
    >
      <img
        src={photo.src}
        alt={photo.caption || "Yearbook submission"}
        crossOrigin="anonymous"
        loading="lazy"
        className="size-full object-cover transition-transform duration-500 ease-smooth group-hover:scale-[1.05]"
      />
      {showStatus ? (
        <span className="absolute left-1.5 top-1.5">
          <StatusIcon status={photo.status} />
        </span>
      ) : null}
      {showStatus && reported ? (
        <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-status-reported px-1.5 py-[3px] text-caption font-semibold text-onimage">
          <Flag className="size-3.5" aria-hidden="true" />
          Reported
        </span>
      ) : null}
      {batchCount > 1 ? (
        <span className="absolute bottom-1.5 right-1.5">
          <StackBadge count={batchCount} />
        </span>
      ) : null}
    </button>
  );
};

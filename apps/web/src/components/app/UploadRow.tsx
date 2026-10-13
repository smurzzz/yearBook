import { Check, FileArchive, RefreshCw, TriangleAlert, Upload } from "lucide-react";

import { PhoneButton } from "@/components/app/PhoneButton";
import { cn } from "@/lib/utils";
import type { UploadItem } from "@/prototype/types";

export const Meter = ({
  value,
  tone = "brand",
  className,
}: {
  value: number;
  tone?: "brand" | "admin" | "failed" | "done";
  className?: string;
}) => (
  <span className={cn("block h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
    <span
      className={cn(
        "block h-full rounded-full transition-[width] duration-300 ease-smooth",
        tone === "brand" && "bg-primary",
        tone === "admin" && "bg-admin",
        tone === "failed" && "bg-status-rejected",
        tone === "done" && "bg-status-approved",
      )}
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </span>
);

const LABELS: Record<UploadItem["status"], string> = {
  waiting: "Waiting",
  compressing: "Compressing",
  uploading: "Uploading",
  done: "Done",
  failed: "Failed",
};

const ICONS = {
  waiting: Upload,
  compressing: FileArchive,
  uploading: Upload,
  done: Check,
  failed: TriangleAlert,
} as const;

const TONE_TEXT: Record<UploadItem["status"], string> = {
  waiting: "text-muted-foreground",
  compressing: "text-primary",
  uploading: "text-primary",
  done: "text-status-approved-foreground",
  failed: "text-status-rejected-foreground",
};

/** One row of the Upload Progress sheet: thumb, per-photo bar, status label. */
export const UploadRow = ({
  item,
  index,
  onRetry,
  className,
}: {
  item: UploadItem;
  index: number;
  onRetry?: () => void;
  className?: string;
}) => {
  const Icon = ICONS[item.status];
  const busy = item.status === "compressing" || item.status === "uploading";

  return (
    <div className={cn("flex items-center gap-3 py-2.5", className)}>
      <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
        <img
          src={item.src}
          alt=""
          crossOrigin="anonymous"
          className={cn(
            "size-full object-cover transition-opacity",
            item.status === "failed" && "opacity-55",
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-label font-semibold text-foreground">
            IMG_{4200 + index}.HEIC
          </span>
          <span
            className={cn("flex shrink-0 items-center gap-1 text-caption font-semibold", TONE_TEXT[item.status])}
          >
            <Icon className={cn("size-3.5", busy && "animate-pulse-soft")} aria-hidden="true" />
            {LABELS[item.status]}
          </span>
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <Meter
            value={item.status === "failed" ? 100 : item.status === "done" ? 100 : item.progress}
            tone={
              item.status === "failed"
                ? "failed"
                : item.status === "done"
                  ? "done"
                  : "brand"
            }
            className="flex-1"
          />
          {item.status === "failed" ? (
            <span className="flex shrink-0 items-center gap-2">
              {item.failNote ? (
                <span className="text-caption font-semibold text-status-rejected-foreground">
                  {item.failNote}
                </span>
              ) : null}
              {onRetry ? (
                <PhoneButton size="sm" variant="outline" className="h-7 px-2.5 text-caption" onClick={onRetry}>
                  <RefreshCw />
                  Retry
                </PhoneButton>
              ) : null}
            </span>
          ) : null}
        </span>
      </span>
    </div>
  );
};

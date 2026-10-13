import { Signal, Wifi } from "lucide-react";

import { cn } from "@/lib/utils";

const BatteryIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 26 13" className={cn("h-3 w-[26px]", className)} aria-hidden="true">
    <rect x="0.5" y="0.5" width="22" height="12" rx="3.6" fill="none" stroke="currentColor" strokeOpacity="0.45" />
    <rect x="2" y="2" width="16.5" height="9" rx="2.4" fill="currentColor" />
    <path d="M24.2 4.4v4.2c1-.3 1.5-1 1.5-2.1s-.5-1.8-1.5-2.1Z" fill="currentColor" fillOpacity="0.45" />
  </svg>
);

/** iOS-style status bar drawn inside the device frame. */
export const StatusBar = ({
  time = "9:41",
  tone = "default",
  className,
}: {
  time?: string;
  tone?: "default" | "onImage" | "admin";
  className?: string;
}) => (
  <div
    className={cn(
      "relative z-20 flex h-11 shrink-0 items-center justify-between px-7 pt-1",
      tone === "onImage" && "text-onimage",
      tone === "admin" && "text-admin-foreground",
      tone === "default" && "text-foreground",
      className,
    )}
  >
    <span className="tabular text-[15px] font-bold tracking-[-0.01em]">{time}</span>
    <div className="flex items-center gap-1.5">
      <Signal className="size-[15px]" strokeWidth={2.4} aria-hidden="true" />
      <Wifi className="size-[15px]" strokeWidth={2.4} aria-hidden="true" />
      <BatteryIcon />
    </div>
  </div>
);

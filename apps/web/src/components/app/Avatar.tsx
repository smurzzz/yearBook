import { useState } from "react";

import { cn } from "@/lib/utils";
import { initials } from "@/prototype/format";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-caption",
  md: "size-10 text-label",
  lg: "size-14 text-subhead",
  xl: "size-20 text-heading",
} as const;

export type AvatarSize = keyof typeof SIZES;

interface AvatarProps {
  src?: string;
  name: string;
  size?: AvatarSize;
  tone?: "brand" | "admin";
  className?: string;
}

/** Photo avatar with an initials fallback, used everywhere a person appears. */
export const Avatar = ({ src, name, size = "md", tone = "brand", className }: AvatarProps) => {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        SIZES[size],
        tone === "admin" ? "bg-admin text-admin-foreground" : "bg-primary/12 text-primary",
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={src}
          alt=""
          crossOrigin="anonymous"
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
};

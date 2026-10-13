import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** YearbookHub mark: an aperture iris inside a yearbook page with a folded corner. */
export const LogoMark = ({ size = 32, className }: LogoMarkProps) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    className={cn("shrink-0", className)}
    aria-hidden="true"
  >
    <path
      d="M8.5 2.75h9.9L28 12.35V25.5a3.75 3.75 0 0 1-3.75 3.75H8.5A3.75 3.75 0 0 1 4.75 25.5V6.5A3.75 3.75 0 0 1 8.5 2.75Z"
      fill="currentColor"
      opacity="0.12"
    />
    <path
      d="M8.5 2.75h9.9L28 12.35V25.5a3.75 3.75 0 0 1-3.75 3.75H8.5A3.75 3.75 0 0 1 4.75 25.5V6.5A3.75 3.75 0 0 1 8.5 2.75Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M18.4 2.75V12.35H28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <circle cx="16.2" cy="18.6" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M16.2 13.1 21 15.85 21 21.35 16.2 24.1 11.4 21.35 11.4 15.85Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      opacity="0.85"
    />
  </svg>
);

interface LogoProps {
  size?: number;
  className?: string;
  tagline?: string;
  tone?: "brand" | "onImage" | "admin";
}

/** Full lockup used on Sign In, the docs header and the app bar. */
export const Logo = ({ size = 32, className, tagline, tone = "brand" }: LogoProps) => (
  <div className={cn("flex items-center gap-2.5", className)}>
    <LogoMark
      size={size}
      className={cn(
        tone === "brand" && "text-primary",
        tone === "admin" && "text-admin",
        tone === "onImage" && "text-onimage",
      )}
    />
    <div className="flex flex-col">
      <span className="text-subhead font-extrabold leading-none tracking-[-0.02em]">
        Yearbook
        <span
          className={cn(
            tone === "brand" && "text-primary",
            tone === "admin" && "text-admin",
            tone === "onImage" && "text-onimage",
          )}
        >
          Hub
        </span>
      </span>
      {tagline ? (
        <span
          className={cn(
            "mt-1 text-caption",
            tone === "admin" && "text-admin-foreground/75",
            tone === "onImage" && "text-onimage/80",
            tone === "brand" && "text-muted-foreground",
          )}
        >
          {tagline}
        </span>
      ) : null}
    </div>
  </div>
);

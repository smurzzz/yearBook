import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { DialogHost } from "@/prototype/overlays/FrameDialog";
import { FrameToast } from "@/prototype/overlays/FrameToast";
import { OverlayHost } from "@/prototype/overlays/OverlayHost";
import { OfflineBanner } from "@/components/app/Feedback";
import { EventsScreen } from "@/prototype/screens/EventsScreen";
import { HomeScreen } from "@/prototype/screens/HomeScreen";
import { MyPhotosScreen } from "@/prototype/screens/MyPhotosScreen";
import { ReviewScreen } from "@/prototype/screens/ReviewScreen";
import { SignInScreen } from "@/prototype/screens/SignInScreen";
import { UploadScreen } from "@/prototype/screens/UploadScreen";
import type { Action } from "@/prototype/reducer";
import { PrototypeProvider, useMockApp } from "@/prototype/store";
import { StatusBar } from "@/prototype/StatusBar";
import { TabBar } from "@/prototype/TabBar";
import type { PrototypeState, Role, Screen } from "@/prototype/types";

/** The 6 full screens. Nothing else in the product is a full screen. */
const SCREENS: Record<Screen, () => ReactNode> = {
  signin: SignInScreen,
  home: HomeScreen,
  upload: UploadScreen,
  myPhotos: MyPhotosScreen,
  review: ReviewScreen,
  events: EventsScreen,
};

const DynamicIsland = () => (
  <span
    className="pointer-events-none absolute left-1/2 top-[9px] z-40 h-[27px] w-[104px] -translate-x-1/2 rounded-full bg-canvas"
    aria-hidden="true"
  />
);

const HomeIndicator = () => (
  <span
    className="pointer-events-none absolute bottom-[8px] left-1/2 z-40 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-foreground/35"
    aria-hidden="true"
  />
);

const FrameBody = ({ forceTheme, children }: { forceTheme?: "light" | "dark"; children?: ReactNode }) => {
  const { state } = useMockApp();
  const dark = forceTheme ? forceTheme === "dark" : state.theme === "dark";
  const Active = SCREENS[state.screen];
  const showTabs = state.signedIn && state.screen !== "signin";
  /** Sign In and the committee bar draw their own status bar. */
  const showStatusBar = state.screen !== "signin" && state.role === "student";

  return (
    <div
      className={cn(
        "relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[38px] bg-background text-foreground",
        dark ? "dark" : "light",
      )}
      data-frame-theme={dark ? "dark" : "light"}
      data-frame-role={state.role}
      data-frame-screen={state.screen}
    >
      <DynamicIsland />
      {showStatusBar ? <StatusBar /> : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <Active />
      </div>
      {state.network === "offline" ? <OfflineBanner /> : null}
      {showTabs ? <TabBar /> : null}
      <HomeIndicator />
      <OverlayHost />
      <DialogHost />
      <FrameToast />
      {children}
    </div>
  );
};

export interface PhoneShellProps {
  role?: Role;
  initial?: Partial<PrototypeState>;
  /** Replayed on mount for scripted flow steps. */
  script?: Action[];
  /** Pin the frame to a theme regardless of the in-app preference. */
  forceTheme?: "light" | "dark";
  caption?: string;
  description?: ReactNode;
  animate?: boolean;
  className?: string;
}

/**
 * A complete, interactive YearbookHub app inside a 390 × 844 iPhone frame.
 * Each shell owns its own store instance, so several frames can sit side by
 * side on a docs page without interfering with each other.
 */
export const PhoneShell = ({
  role = "student",
  initial,
  script,
  forceTheme,
  caption,
  description,
  animate = true,
  className,
}: PhoneShellProps) => (
  <figure className={cn("flex flex-col items-center", className)}>
    <div className="relative rounded-[50px] border border-border bg-foreground/[0.9] p-[10px] shadow-elegant">
      <PrototypeProvider initial={{ role, ...initial }} animate={animate} script={script}>
        <FrameBody forceTheme={forceTheme} />
      </PrototypeProvider>
    </div>
    {caption || description ? (
      <figcaption className={cn("mt-4 w-full px-1", "text-center")}>
        {caption ? (
          <span className="block text-label font-bold text-foreground">{caption}</span>
        ) : null}
        {description ? (
          <span className="mt-1 block text-caption leading-[17px] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </figcaption>
    ) : null}
  </figure>
);

import { CalendarDays, ClipboardCheck, Home, Images, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { pendingCount } from "@/prototype/selectors";
import { useMockApp } from "@/prototype/store";
import type { Screen } from "@/prototype/types";

type TabDef = { screen: Screen; label: string; icon: LucideIcon; center?: boolean };

const STUDENT_TABS: TabDef[] = [
  { screen: "home", label: "Home", icon: Home },
  { screen: "upload", label: "Upload", icon: Plus, center: true },
  { screen: "myPhotos", label: "My Photos", icon: Images },
];

const ADMIN_TABS: TabDef[] = [
  { screen: "review", label: "Review", icon: ClipboardCheck },
  { screen: "events", label: "Events", icon: CalendarDays },
];

/**
 * Role-specific navigation. Student: Home · Upload (raised centre action) ·
 * My Photos. Admin: Review · Events, with committee tinting and a live
 * pending count on the Review tab.
 */
export const TabBar = () => {
  const { state, goto } = useMockApp();
  const admin = state.role === "admin";
  const tabs = admin ? ADMIN_TABS : STUDENT_TABS;
  const pending = pendingCount(state);

  return (
    <nav
      aria-label={admin ? "Committee navigation" : "Main navigation"}
      className={cn(
        "relative z-30 shrink-0 border-t bg-background/92 backdrop-blur-xl",
        admin ? "border-admin-border" : "border-border",
      )}
    >
      <div
        className={cn(
          "grid items-end px-3 pt-2 safe-bottom",
          tabs.length === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {tabs.map((tab) => {
          const active = state.screen === tab.screen;
          const Icon = tab.icon;
          const accent = admin ? "text-admin" : "text-primary";
          return (
            <button
              key={tab.screen}
              type="button"
              onClick={() => goto(tab.screen)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex flex-col items-center gap-1 py-1.5 focus-visible:outline-none",
              )}
            >
              {tab.center ? (
                <>
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform duration-200 ease-smooth group-active:scale-95",
                      !active && "opacity-95",
                    )}
                    style={{ height: 52, width: 52 }}
                  >
                    <Icon className="size-6" strokeWidth={2.6} aria-hidden="true" />
                  </span>
                  <span className={cn("text-caption font-bold", active ? accent : "text-muted-foreground")}>
                    {tab.label}
                  </span>
                </>
              ) : (
                <>
                  <span className="relative">
                    <Icon
                      className={cn(
                        "size-[22px] transition-colors",
                        active ? accent : "text-muted-foreground",
                      )}
                      strokeWidth={active ? 2.5 : 2}
                      aria-hidden="true"
                    />
                    {admin && tab.screen === "review" && pending > 0 ? (
                      <span
                        className="absolute -right-3 -top-1.5 min-w-[18px] rounded-full bg-admin px-1 text-center text-[10px] font-bold leading-[18px] text-admin-foreground"
                        aria-label={`${pending} pending photos`}
                      >
                        {pending}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-caption font-bold transition-colors",
                      active ? accent : "text-muted-foreground",
                    )}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

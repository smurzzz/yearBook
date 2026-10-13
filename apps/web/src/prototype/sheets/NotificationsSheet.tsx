import { BellOff, CheckCheck, CalendarClock, ClipboardCheck, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/app/Feedback";
import { UnreadDot } from "@/components/app/Indicators";
import { PhoneButton } from "@/components/app/PhoneButton";
import { Surface } from "@/components/app/Surface";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { relativeTime } from "@/prototype/format";
import { unreadCount } from "@/prototype/selectors";
import { useMockApp } from "@/prototype/store";
import type { NotificationKind } from "@/prototype/types";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  deadline: CalendarClock,
  review: ClipboardCheck,
  removal: Flag,
};

/** Sheet 6 — Notifications list. Unread dot, mark all read, deep link into a photo. */
export const NotificationsSheet = ({ open }: { open: boolean }) => {
  const { state, dispatch, close, open: openOverlay } = useMockApp();
  const unread = unreadCount(state);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size="tall"
      title="Notifications"
      description={unread ? `${unread} unread` : "You are up to date"}
      footer={
        <PhoneButton
          block
          variant="outline"
          disabled={unread === 0}
          onClick={() => dispatch({ type: "markAllRead" })}
        >
          <CheckCheck />
          Mark all as read
        </PhoneButton>
      }
    >
      <div className="px-5 pb-3">
        {state.notifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="You're all caught up"
            message="Deadline reminders and review results will show up here."
          />
        ) : (
          state.notifications.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <Surface key={item.id} className="mb-2.5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "markAllRead" });
                    if (item.photoId) {
                      close();
                      openOverlay("photoViewer", { photoId: item.photoId });
                    }
                  }}
                  className="flex w-full items-start gap-3 p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-[18px]",
                      item.kind === "deadline" && "bg-status-pending-soft text-status-pending-foreground",
                      item.kind === "review" && "bg-primary/12 text-primary",
                      item.kind === "removal" && "bg-status-reported-soft text-status-reported-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="flex-1 text-label font-bold text-foreground">{item.title}</span>
                      {!item.read ? <UnreadDot className="shrink-0" /> : null}
                    </span>
                    <span className="mt-1 block text-caption leading-[17px] text-muted-foreground">
                      {item.body}
                    </span>
                    <span className="mt-1.5 block text-caption text-muted-foreground">
                      {relativeTime(item.at)}
                      {item.photoId ? " · Tap to open the photo" : ""}
                    </span>
                  </span>
                </button>
              </Surface>
            );
          })
        )}
      </div>
    </BottomSheet>
  );
};

import { BellRing, CalendarClock, ClipboardCheck } from "lucide-react";

import { PhoneButton } from "@/components/app/PhoneButton";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { useMockApp } from "@/prototype/store";

/** Sheet 5 — Notification permission. Shown on the first bell tap, once. */
export const NotificationPermissionSheet = ({ open }: { open: boolean }) => {
  const { state, dispatch, close } = useMockApp();

  return (
    <BottomSheet
      open={open}
      onClose={close}
      hideClose
      title="Get deadline reminders and review results"
      description="We only send two kinds of notifications, and you can turn them off any time."
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <PhoneButton
            variant="outline"
            onClick={() => dispatch({ type: "setNotifications", enabled: false })}
          >
            Not now
          </PhoneButton>
          <PhoneButton onClick={() => dispatch({ type: "setNotifications", enabled: true })}>
            Allow
          </PhoneButton>
        </div>
      }
    >
      <div className="px-5 pb-3">
        <div className="flex flex-col items-center pb-2 pt-1">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
            <BellRing className="size-6" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-2 space-y-2.5">
          <div className="flex items-start gap-3 rounded-2xl bg-muted p-3.5">
            <CalendarClock className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-label font-bold text-foreground">Deadline reminders</p>
              <p className="mt-0.5 text-caption leading-[17px] text-muted-foreground">
                Two days before an event stops accepting photos.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-muted p-3.5">
            <ClipboardCheck className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-label font-bold text-foreground">Review results</p>
              <p className="mt-0.5 text-caption leading-[17px] text-muted-foreground">
                When a photo is approved, or when the committee asks for a new one.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-caption text-muted-foreground">
          {state.notificationsEnabled
            ? "You are already receiving both. You can change this in your profile."
            : "Nothing else is ever sent from YearbookHub."}
        </p>
      </div>
    </BottomSheet>
  );
};

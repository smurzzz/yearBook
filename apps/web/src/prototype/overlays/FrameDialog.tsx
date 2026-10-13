import { TriangleAlert, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { PhoneButton } from "@/components/app/PhoneButton";
import { cn } from "@/lib/utils";
import { eventById } from "@/prototype/data";
import { useMockApp } from "@/prototype/store";

interface FrameDialogProps {
  open: boolean;
  icon?: ReactNode;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "destructive" | "brand";
  onConfirm: () => void;
  onCancel: () => void;
}

export const FrameDialog = ({
  open,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "destructive",
  onConfirm,
  onCancel,
}: FrameDialogProps) => {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), 160);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!visible) return null;
  const closing = !open;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-7">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className={cn(
          "absolute inset-0 bg-canvas/65 backdrop-blur-[2px]",
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
        tabIndex={-1}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          "relative w-full rounded-[24px] border border-border bg-background p-5 text-center shadow-sheet",
          closing ? "animate-fade-out" : "animate-scale-in",
        )}
      >
        <span
          className={cn(
            "mx-auto flex size-11 items-center justify-center rounded-full [&_svg]:size-5",
            tone === "destructive"
              ? "bg-status-rejected-soft text-status-rejected-foreground"
              : "bg-primary/12 text-primary",
          )}
        >
          {icon ?? <TriangleAlert aria-hidden="true" />}
        </span>
        <h3 className="mt-3.5 text-subhead font-bold text-foreground">{title}</h3>
        <p className="mt-1.5 text-label leading-[20px] text-muted-foreground">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <PhoneButton variant="outline" onClick={onCancel}>
            {cancelLabel}
          </PhoneButton>
          <PhoneButton variant={tone === "destructive" ? "destructive" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </PhoneButton>
        </div>
      </div>
    </div>
  );
};

/** Routes the active dialog id to its copy and dispatch. */
export const DialogHost = () => {
  const { state, dispatch, closeDialog } = useMockApp();
  const { dialog, dialogPhotoId, dialogEventId } = state;

  const event = dialogEventId ? eventById(dialogEventId) : null;
  const linkedCount = dialogEventId
    ? state.photos.filter((p) => p.eventId === dialogEventId).length
    : 0;

  const config = (() => {
    switch (dialog) {
      case "logout":
        return {
          title: "Log out?",
          message: "You will need to sign in with your school Google account again.",
          confirmLabel: "Log out",
          icon: <X aria-hidden="true" />,
          confirm: () => dispatch({ type: "signOut" }),
        };
      case "deleteAccount":
        return {
          title: "Delete your account?",
          message:
            "Every photo you uploaded is removed, including the ones already approved for the yearbook. This cannot be undone.",
          confirmLabel: "Delete account",
          confirm: () => dispatch({ type: "deleteAccount" }),
        };
      case "deletePhoto":
        return {
          title: "Delete this photo?",
          message:
            "It disappears from your photos and from the committee's review list right away.",
          confirmLabel: "Delete",
          confirm: () =>
            dialogPhotoId ? dispatch({ type: "deletePhoto", photoId: dialogPhotoId }) : closeDialog(),
        };
      case "removePhoto":
        return {
          title: "Remove this photo?",
          message:
            "It comes out of the yearbook selection and the student who reported it is notified.",
          confirmLabel: "Remove photo",
          confirm: () =>
            dialogPhotoId
              ? dispatch({ type: "removeReportedPhoto", photoId: dialogPhotoId })
              : closeDialog(),
        };
      case "deleteEvent":
        return {
          title: event ? `Delete ${event.name}?` : "Delete this event?",
          message: `${linkedCount} photo${linkedCount === 1 ? " is" : "s are"} linked to this event. Deleting the event also removes them from the yearbook.`,
          confirmLabel: "Delete event",
          confirm: () =>
            dialogEventId ? dispatch({ type: "deleteEvent", eventId: dialogEventId }) : closeDialog(),
        };
      default:
        return null;
    }
  })();

  if (!config) return null;

  return (
    <FrameDialog
      open={Boolean(dialog)}
      icon={config.icon}
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel}
      onConfirm={config.confirm}
      onCancel={closeDialog}
    />
  );
};

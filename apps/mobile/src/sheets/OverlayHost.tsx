import React from "react";
import { useMockApp } from "../prototype/store";
import { api } from "../api";
import { Dialog } from "../components/ui/Overlay";
import { eventById } from "../prototype/data";
import type { OverlayId } from "../prototype/types";
import {
  FirstTimeSetupSheet,
  HelpSheet,
  NotificationPermissionSheet,
  NotificationsSheet,
  PrivacyNoticeSheet,
  ProfileSheet,
} from "./ContextSheets";
import { EventDetailSheet, EventFormSheet } from "./EventSheets";
import {
  CameraPermissionSheet,
  GalleryPermissionSheet,
  LibraryPickerSheet,
  SourceChooserSheet,
  UploadProgressSheet,
} from "./UploadSheets";
import { PhotoViewerOverlay, RequestRemovalSheet } from "./PhotoSheets";
import {
  AdminPhotoDetailSheet,
  FilterSheet,
  RejectReasonSheet,
  UploaderGridSheet,
} from "./AdminSheets";

/**
 * Renders every overlay inside the device screen — the later an overlay sits
 * in this list, the higher it paints. Presence (not "is top") drives `open`,
 * so a sheet stacked on top of another keeps it alive. Each sheet is keyed on
 * its open instance + param, so every open starts from fresh local state
 * (chosen reason, draft caption, multi-select…) without reset effects.
 */
export const OverlayHost = () => {
  const { state } = useMockApp();
  const item = (id: OverlayId) => state.overlays.find((o) => o.id === id);
  const present = (id: OverlayId) => Boolean(item(id));
  const key = (id: OverlayId, param?: string) =>
    present(id) ? `${id}:${param ?? ""}` : `${id}:closed`;

  return (
    <>
      <FirstTimeSetupSheet key={key("firstTimeSetup")} open={present("firstTimeSetup")} />
      <ProfileSheet key={key("profile")} open={present("profile")} />
      <PrivacyNoticeSheet key={key("privacy")} open={present("privacy")} />
      <HelpSheet key={key("help")} open={present("help")} />
      <NotificationPermissionSheet key={key("notifPermission")} open={present("notifPermission")} />
      <NotificationsSheet key={key("notifications")} open={present("notifications")} />
      <EventDetailSheet
        key={key("eventDetail", item("eventDetail")?.eventId)}
        open={present("eventDetail")}
        eventId={item("eventDetail")?.eventId}
      />
      <SourceChooserSheet key={key("sourceChooser")} open={present("sourceChooser")} />
      <CameraPermissionSheet key={key("cameraPermission")} open={present("cameraPermission")} />
      <GalleryPermissionSheet key={key("galleryPermission")} open={present("galleryPermission")} />
      <LibraryPickerSheet key={key("libraryPicker")} open={present("libraryPicker")} />
      <UploadProgressSheet key={key("uploadProgress")} open={present("uploadProgress")} />
      <FilterSheet key={key("filter")} open={present("filter")} />
      <EventFormSheet
        key={key("eventForm", item("eventForm")?.eventId)}
        open={present("eventForm")}
        eventId={item("eventForm")?.eventId}
      />
      <PhotoViewerOverlay
        key={key("photoViewer", item("photoViewer")?.photoId)}
        open={present("photoViewer")}
        photoId={item("photoViewer")?.photoId}
      />
      <AdminPhotoDetailSheet
        key={key("adminPhotoDetail", item("adminPhotoDetail")?.photoId)}
        open={present("adminPhotoDetail")}
        photoId={item("adminPhotoDetail")?.photoId}
      />
      <RejectReasonSheet
        key={key("rejectReason", item("rejectReason")?.photoId)}
        open={present("rejectReason")}
        photoId={item("rejectReason")?.photoId}
      />
      <RequestRemovalSheet
        key={key("requestRemoval", item("requestRemoval")?.photoId)}
        open={present("requestRemoval")}
        photoId={item("requestRemoval")?.photoId}
      />
      <UploaderGridSheet
        key={key("uploaderGrid", item("uploaderGrid")?.uploaderId)}
        open={present("uploaderGrid")}
        uploaderId={item("uploaderGrid")?.uploaderId}
      />
    </>
  );
};

/** Routes the active dialog id to its copy and dispatch (spec §7). */
export const DialogHost = () => {
  const { state, dispatch, closeDialog } = useMockApp();
  const { dialog, dialogPhotoId, dialogEventId } = state;

  const event = dialogEventId ? eventById(dialogEventId) : null;
  // api.md: the dialog shows the count from EventDTO.photo_count when the
  // catalog was hydrated from the API; fixtures only have the local pool.
  const linkedCount = dialogEventId
    ? (event?.photoCount ?? state.photos.filter((p) => p.eventId === dialogEventId).length)
    : 0;

  const config = (() => {
    switch (dialog) {
      case "logout":
        return {
          title: "Log out?",
          message: "You will need to sign in with your school Google account again.",
          confirmLabel: "Log out",
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
          message: "It disappears from your photos and from the committee's review list right away.",
          confirmLabel: "Delete",
          confirm: async () => {
            if (!dialogPhotoId) {
              closeDialog();
              return;
            }
            try {
              // P6: storage-first delete on the server (BR-08); role picks the route.
              if (state.role === "admin") await api.deleteAdminPhoto(dialogPhotoId);
              else await api.deleteMyPhoto(dialogPhotoId);
            } catch {
              /* P8 polish: surface the failure; the local state stays for now */
            }
            dispatch({ type: "deletePhoto", photoId: dialogPhotoId });
          },
        };
      case "removePhoto":
        return {
          title: "Remove this photo?",
          message:
            "It comes out of the yearbook selection and the student who reported it is notified.",
          confirmLabel: "Remove photo",
          confirm: async () => {
            if (!dialogPhotoId) {
              closeDialog();
              return;
            }
            const reportId =
              state.photos.find((p) => p.id === dialogPhotoId)?.removalRequest?.id ??
              `report-${dialogPhotoId}`;
            try {
              await api.resolveReport(reportId, { action: "remove" });
            } catch {
              /* P8 polish */
            }
            dispatch({ type: "removeReportedPhoto", photoId: dialogPhotoId });
          },
        };
      case "deleteEvent":
        return {
          title: event ? `Delete ${event.name}?` : "Delete this event?",
          message: `${linkedCount} photo${linkedCount === 1 ? " is" : "s are"} linked to this event. Deleting the event also removes them from the yearbook.`,
          confirmLabel: "Delete event",
          confirm: async () => {
            if (!dialogEventId) {
              closeDialog();
              return;
            }
            try {
              await api.deleteEvent(dialogEventId);
            } catch {
              /* P8 polish */
            }
            dispatch({ type: "deleteEvent", eventId: dialogEventId });
          },
        };
      default:
        return null;
    }
  })();

  if (!config) return null;

  return (
    <Dialog
      open={Boolean(dialog)}
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel}
      onConfirm={config.confirm}
      onCancel={closeDialog}
    />
  );
};

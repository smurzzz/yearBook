import { FirstTimeSetupSheet } from "@/prototype/sheets/FirstTimeSetupSheet";
import { ProfileSheet } from "@/prototype/sheets/ProfileSheet";
import { PrivacyNoticeSheet } from "@/prototype/sheets/PrivacyNoticeSheet";
import { HelpSheet } from "@/prototype/sheets/HelpSheet";
import { NotificationPermissionSheet } from "@/prototype/sheets/NotificationPermissionSheet";
import { NotificationsSheet } from "@/prototype/sheets/NotificationsSheet";
import { EventDetailSheet } from "@/prototype/sheets/EventDetailSheet";
import { UploadProgressSheet } from "@/prototype/sheets/UploadProgressSheet";
import { PhotoViewerOverlay } from "@/prototype/sheets/PhotoViewerOverlay";
import { RequestRemovalSheet } from "@/prototype/sheets/RequestRemovalSheet";
import { AdminPhotoDetailSheet } from "@/prototype/sheets/AdminPhotoDetailSheet";
import { RejectReasonSheet } from "@/prototype/sheets/RejectReasonSheet";
import { FilterSheet } from "@/prototype/sheets/FilterSheet";
import { EventFormSheet } from "@/prototype/sheets/EventFormSheet";
import { UploaderGridSheet } from "@/prototype/sheets/UploaderGridSheet";
import {
  CameraPermissionSheet,
  GalleryPermissionSheet,
  LibraryPickerSheet,
  SourceChooserSheet,
} from "@/prototype/sheets/PickerOverlays";
import { useMockApp } from "@/prototype/store";
import type { OverlayId } from "@/prototype/types";

/**
 * Renders every overlay inside the phone frame, in stacking order — the later
 * an overlay sits in this list, the higher it paints. Presence (not "is top")
 * drives `open`, so a sheet stacked on top of another keeps it alive.
 */
export const OverlayHost = () => {
  const { state } = useMockApp();
  const present = (id: OverlayId) => state.overlays.some((o) => o.id === id);
  const param = (id: OverlayId, key: "photoId" | "eventId" | "uploaderId") =>
    state.overlays.find((o) => o.id === id)?.[key];

  return (
    <>
      <FirstTimeSetupSheet open={present("firstTimeSetup")} />
      <ProfileSheet open={present("profile")} />
      <PrivacyNoticeSheet open={present("privacy")} />
      <HelpSheet open={present("help")} />
      <NotificationPermissionSheet open={present("notifPermission")} />
      <NotificationsSheet open={present("notifications")} />
      <EventDetailSheet open={present("eventDetail")} eventId={param("eventDetail", "eventId")} />
      <SourceChooserSheet open={present("sourceChooser")} />
      <CameraPermissionSheet open={present("cameraPermission")} />
      <GalleryPermissionSheet open={present("galleryPermission")} />
      <LibraryPickerSheet open={present("libraryPicker")} />
      <UploadProgressSheet open={present("uploadProgress")} />
      <FilterSheet open={present("filter")} />
      <EventFormSheet open={present("eventForm")} eventId={param("eventForm", "eventId")} />
      <PhotoViewerOverlay open={present("photoViewer")} photoId={param("photoViewer", "photoId")} />
      <AdminPhotoDetailSheet
        open={present("adminPhotoDetail")}
        photoId={param("adminPhotoDetail", "photoId")}
      />
      <RejectReasonSheet open={present("rejectReason")} photoId={param("rejectReason", "photoId")} />
      <RequestRemovalSheet
        open={present("requestRemoval")}
        photoId={param("requestRemoval", "photoId")}
      />
      <UploaderGridSheet
        open={present("uploaderGrid")}
        uploaderId={param("uploaderGrid", "uploaderId")}
      />
    </>
  );
};

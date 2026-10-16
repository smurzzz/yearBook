import { EVENTS, NOTIFICATIONS, PHOTOS, STUDENT_ID } from "./data";
import { USE_MOCK } from "../api";
import { MAX_BATCH, clampReviewIndex, emptyFilter, uploadGuard } from "./selectors";
import type {
  Category,
  Club,
  DialogId,
  EventItem,
  FilterState,
  NotificationItem,
  OverlayId,
  OverlayStackItem,
  PhotoItem,
  PrototypeState,
  Role,
  Screen,
  ToastState,
} from "./types";

/* =========================================================================
   Pure reducer for one phone frame. Kept free of JSX so the prototype can be
   scripted deterministically (see flows.ts) and deep-linked for verification.
   ========================================================================= */

export type Action =
  | { type: "hydrate"; patch: Partial<PrototypeState> }
  | { type: "mergePhotos"; photos: PhotoItem[] }
  | { type: "setRole"; role: Role }
  | { type: "goto"; screen: Screen }
  | { type: "setConsent"; value: boolean }
  | { type: "googleSignIn" }
  | { type: "googleCancel" }
  | { type: "authIssue"; issue: PrototypeState["authIssue"] }
  | { type: "sessionExpired" }
  | { type: "openOverlay"; overlay: OverlayStackItem }
  | { type: "closeOverlay" }
  | { type: "closeOverlays" }
  | { type: "openDialog"; dialog: DialogId; photoId?: string; eventId?: string }
  | { type: "closeDialog" }
  | { type: "toast"; toast: Omit<ToastState, "key"> }
  | { type: "dismissToast" }
  | { type: "approve"; photoId: string }
  | { type: "reject"; photoId: string; reason: string }
  | { type: "backToPending"; photoId: string }
  | { type: "undo" }
  | { type: "deletePhoto"; photoId: string }
  | { type: "removeReportedPhoto"; photoId: string }
  | { type: "dismissRemoval"; photoId: string }
  | { type: "requestRemoval"; photoId: string; reason: string; notes?: string }
  | { type: "markAllRead" }
  | { type: "updatePhoto"; photoId: string; patch: Partial<PhotoItem> }
  | { type: "saveEvent"; event: EventItem }
  | { type: "deleteEvent"; eventId: string }
  | { type: "setAllPhotosMode"; mode: "review" | "all" }
  | { type: "setReviewIndex"; index: number }
  | { type: "reviewStep"; delta: number }
  | { type: "setReviewEventFilter"; eventId: string | "all" }
  | { type: "applyFilter"; filter?: FilterState }
  | { type: "patchFilterDraft"; patch: Partial<FilterState> }
  | { type: "resetFilter" }
  | { type: "addUploadItems"; srcs: string[] }
  | { type: "removeUploadItem"; id: string }
  | { type: "setUploadCaption"; id: string; caption: string }
  | { type: "setCaptionForSrc"; src: string; caption: string }
  | { type: "setUploadField"; field: "eventId" | "category" | "club"; value: string | null }
  | { type: "toggleUploadConsent" }
  | { type: "startUpload" }
  | { type: "uploadTick" }
  | { type: "retryFailed" }
  | { type: "resetUpload" }
  | { type: "setNetwork"; network: "online" | "offline" }
  | { type: "setLoadError"; value: boolean }
  | { type: "setSlowNetwork"; value: boolean }
  | { type: "setForceUploadFailure"; value: boolean }
  | { type: "setUploadError"; error: PrototypeState["uploadError"] }
  | { type: "setLoading"; value: boolean }
  | { type: "setRefreshing"; value: boolean }
  | { type: "setTheme"; theme: "light" | "dark" }
  | { type: "toggleTheme" }
  | { type: "finishSetup"; name: string; club: Club | null }
  | { type: "notificationsAsked" }
  | { type: "setNotifications"; enabled: boolean }
  | { type: "togglePreference"; key: "deadlineReminders" | "reviewResults" }
  | { type: "deleteAccount" }
  | { type: "signOut" };

export const createInitialState = (patch: Partial<PrototypeState> = {}): PrototypeState => ({
  role: "student",
  screen: "signin",
  signedIn: false,
  consentChecked: false,
  authIssue: "none",
  firstTimeSetupDone: true,
  theme: "light",
  overlays: [],
  dialog: null,
  network: "online",
  loadError: false,
  slowNetwork: false,
  forceUploadFailure: false,
  loading: false,
  refreshing: false,
  photos: USE_MOCK ? PHOTOS : [],
  events: USE_MOCK ? EVENTS : [],
  notifications: USE_MOCK ? NOTIFICATIONS : [],
  allPhotosMode: "review",
  reviewIndex: 0,
  reviewEventFilter: "all",
  filter: emptyFilter,
  filterDraft: emptyFilter,
  undo: null,
  toast: null,
  upload: { eventId: null, category: null, club: null, consent: false, items: [] },
  uploadPhase: "idle",
  uploadError: null,
  batchMessage: null,
  storageUsedMb: 24,
  studentName: "Mikaela Reyes",
  studentClub: "Robotics Club",
  notificationsAsked: false,
  notificationsEnabled: false,
  deadlineReminders: true,
  reviewResults: true,
  ...patch,
});

const withToast = (state: PrototypeState, toast: Omit<ToastState, "key">): ToastState => ({
  ...toast,
  key: (state.toast?.key ?? 0) + 1,
});

const push = (overlays: OverlayStackItem[], item: OverlayStackItem) =>
  overlays.some((o) => o.id === item.id) ? overlays : [...overlays, item];

const ensure = (overlays: OverlayStackItem[], id: OverlayId, item?: Partial<OverlayStackItem>) =>
  push(overlays, { id, ...item });

const drop = (overlays: OverlayStackItem[], id: OverlayId) =>
  overlays.filter((o) => o.id !== id);

const patchPhoto = (
  photos: PhotoItem[],
  photoId: string,
  patch: Partial<PhotoItem>,
): PhotoItem[] => photos.map((p) => (p.id === photoId ? { ...p, ...patch } : p));

const removePhotos = (photos: PhotoItem[], ids: string[]) =>
  photos.filter((p) => !ids.includes(p.id));

const screensForRole = (role: Role): Screen => (role === "student" ? "home" : "review");

/* ------------------------------ Upload model ----------------------------- */

const commitUploads = (state: PrototypeState): PrototypeState => {
  const batchId = `batch-${Date.now()}`;
  const eventId = state.upload.eventId ?? state.events[0]?.id ?? "";
  const created: PhotoItem[] = state.upload.items
    .filter((item) => item.status === "done")
    .map((item) => ({
      id: `p-upload-${item.id}`,
      src: item.src,
      caption: item.caption,
      eventId,
      category: (state.upload.category ?? "Other") as Category,
      club: state.upload.club ?? undefined,
      uploaderId: STUDENT_ID,
      status: "pending" as const,
      uploadedAt: new Date().toISOString(),
      batchId,
      consentConfirmed: true,
    }));
  return {
    ...state,
    photos: [...created, ...state.photos],
    storageUsedMb: Math.min(200, state.storageUsedMb + created.length * 8),
    upload: { ...state.upload, items: state.upload.items },
  };
};

/* --------------------------------- Reducer -------------------------------- */

export const reducer = (state: PrototypeState, action: Action): PrototypeState => {
  switch (action.type) {
    case "mergePhotos": {
      /* P6: list syncs (review queue, browse, uploader grid) hydrate into the
         shared admin photo pool without dropping what another screen loaded;
         later rows win by id. */
      const byId = new Map(action.photos.map((photo) => [photo.id, photo]));
      return {
        ...state,
        photos: [...action.photos, ...state.photos.filter((photo) => !byId.has(photo.id))],
      };
    }
    case "hydrate":
      return { ...state, ...action.patch };

    case "setRole":
      return {
        ...state,
        role: action.role,
        screen: screensForRole(action.role),
        signedIn: true,
        overlays: [],
        dialog: null,
      };

    case "goto":
      return { ...state, screen: action.screen, overlays: [] };

    case "setConsent":
      return { ...state, consentChecked: action.value };

    case "googleSignIn": {
      const base: PrototypeState = {
        ...state,
        signedIn: true,
        authIssue: "none",
        screen: screensForRole(state.role),
      };
      return base.firstTimeSetupDone
        ? base
        : { ...base, overlays: [{ id: "firstTimeSetup" }] };
    }

    case "googleCancel":
      return { ...state, authIssue: "cancelled" };

    case "authIssue":
      return { ...state, authIssue: action.issue };

    case "sessionExpired":
      return { ...state, signedIn: false, authIssue: "expired", overlays: [], dialog: null };

    case "openOverlay":
      return { ...state, overlays: push(state.overlays, action.overlay) };

    case "closeOverlay":
      return { ...state, overlays: state.overlays.slice(0, -1) };

    case "closeOverlays":
      return { ...state, overlays: [] };

    case "openDialog":
      return { ...state, dialog: action.dialog, dialogPhotoId: action.photoId, dialogEventId: action.eventId };

    case "closeDialog":
      return { ...state, dialog: null, dialogPhotoId: undefined, dialogEventId: undefined };

    case "toast":
      return { ...state, toast: withToast(state, action.toast) };

    case "dismissToast":
      return { ...state, toast: null };

    case "approve": {
      const prev = state.photos.find((p) => p.id === action.photoId);
      if (!prev) return state;
      const photos = patchPhoto(state.photos, action.photoId, {
        status: "approved",
        rejectReason: undefined,
      });
      const remaining = photos.filter(
        (p) =>
          p.status === "pending" &&
          (state.reviewEventFilter === "all" || p.eventId === state.reviewEventFilter),
      ).length;
      return {
        ...state,
        photos,
        overlays: drop(state.overlays, "adminPhotoDetail"),
        undo: { photoId: action.photoId, prevStatus: prev.status, prevReason: prev.rejectReason },
        reviewIndex: clampReviewIndex(state.reviewIndex, remaining),
        toast: withToast(state, {
          kind: "undo",
          title: "Approved",
          description: "Added to the yearbook selection.",
          actionLabel: "Undo",
        }),
      };
    }

    case "reject": {
      const prev = state.photos.find((p) => p.id === action.photoId);
      if (!prev) return state;
      const photos = patchPhoto(state.photos, action.photoId, {
        status: "rejected",
        rejectReason: action.reason,
      });
      const remaining = photos.filter(
        (p) =>
          p.status === "pending" &&
          (state.reviewEventFilter === "all" || p.eventId === state.reviewEventFilter),
      ).length;
      return {
        ...state,
        photos,
        overlays: drop(drop(state.overlays, "rejectReason"), "adminPhotoDetail"),
        undo: { photoId: action.photoId, prevStatus: prev.status, prevReason: prev.rejectReason },
        reviewIndex: clampReviewIndex(state.reviewIndex, remaining),
        toast: withToast(state, {
          kind: "undo",
          title: `Rejected · ${action.reason}`,
          description: "The uploader is notified with this reason.",
          actionLabel: "Undo",
        }),
      };
    }

    case "backToPending": {
      const photos = patchPhoto(state.photos, action.photoId, {
        status: "pending",
        rejectReason: undefined,
      });
      return {
        ...state,
        photos,
        undo: null,
        toast: withToast(state, {
          kind: "success",
          title: "Back to pending",
          description: "This photo is in the review queue again.",
        }),
      };
    }

    case "undo": {
      if (!state.undo) return state;
      const { photoId, prevStatus, prevReason } = state.undo;
      return {
        ...state,
        photos: patchPhoto(state.photos, photoId, {
          status: prevStatus,
          rejectReason: prevReason,
        }),
        undo: null,
        toast: {
          ...withToast(state, { kind: "success", title: "Undone", description: "Previous status restored." }),
        },
      };
    }

    case "deletePhoto":
      return {
        ...state,
        photos: removePhotos(state.photos, [action.photoId]),
        overlays: drop(drop(state.overlays, "photoViewer"), "adminPhotoDetail"),
        dialog: null,
        toast: withToast(state, { kind: "success", title: "Photo deleted" }),
      };

    case "removeReportedPhoto":
      return {
        ...state,
        photos: removePhotos(state.photos, [action.photoId]),
        overlays: drop(drop(state.overlays, "adminPhotoDetail"), "photoViewer"),
        dialog: null,
        toast: withToast(state, {
          kind: "success",
          title: "Photo removed",
          description: "It is out of the yearbook selection and the reporter is notified.",
        }),
      };

    case "dismissRemoval":
      return {
        ...state,
        photos: patchPhoto(state.photos, action.photoId, { removalRequest: undefined }),
        toast: withToast(state, {
          kind: "success",
          title: "Removal request dismissed",
          description: "The photo stays in the selection.",
        }),
      };

    case "requestRemoval":
      return {
        ...state,
        photos: patchPhoto(state.photos, action.photoId, {
          removalRequest: {
            reporterId: STUDENT_ID,
            reason: action.reason,
            notes: action.notes,
            requestedAt: new Date().toISOString(),
          },
        }),
        overlays: drop(state.overlays, "requestRemoval"),
        toast: withToast(state, {
          kind: "success",
          title: "Removal request sent",
          description: "The yearbook committee will review it.",
        }),
      };

    case "markAllRead":
      return {
        ...state,
        notifications: state.notifications.map((n): NotificationItem => ({ ...n, read: true })),
      };

    case "updatePhoto":
      return {
        ...state,
        photos: patchPhoto(state.photos, action.photoId, action.patch),
        toast: withToast(state, {
          kind: "success",
          title: "Changes saved",
          description: "The committee sees the updated caption and tags.",
        }),
      };

    case "saveEvent": {
      const exists = state.events.some((e) => e.id === action.event.id);
      return {
        ...state,
        events: exists
          ? state.events.map((e) => (e.id === action.event.id ? action.event : e))
          : [...state.events, action.event],
        overlays: drop(state.overlays, "eventForm"),
        toast: withToast(state, {
          kind: "success",
          title: exists ? "Event updated" : "Event created",
          description: `${action.event.name} is live for students.`,
        }),
      };
    }

    case "deleteEvent": {
      const linked = state.photos.filter((p) => p.eventId === action.eventId).map((p) => p.id);
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.eventId),
        photos: removePhotos(state.photos, linked),
        overlays: drop(state.overlays, "eventForm"),
        dialog: null,
        toast: withToast(state, {
          kind: "success",
          title: "Event deleted",
          description: `${linked.length} linked photo${linked.length === 1 ? "" : "s"} removed with it.`,
        }),
      };
    }

    case "setAllPhotosMode":
      return { ...state, allPhotosMode: action.mode };

    case "setReviewIndex":
      return { ...state, reviewIndex: Math.max(0, action.index) };

    case "reviewStep":
      return { ...state, reviewIndex: Math.max(0, state.reviewIndex + action.delta) };

    case "setReviewEventFilter":
      return { ...state, reviewEventFilter: action.eventId, reviewIndex: 0 };

    case "applyFilter":
      return {
        ...state,
        filter: action.filter ?? state.filterDraft,
        overlays: drop(state.overlays, "filter"),
      };

    case "patchFilterDraft":
      return { ...state, filterDraft: { ...state.filterDraft, ...action.patch } };

    case "resetFilter":
      return { ...state, filterDraft: emptyFilter, filter: emptyFilter, overlays: drop(state.overlays, "filter") };

    case "addUploadItems": {
      const room = Math.max(0, MAX_BATCH - state.upload.items.length);
      const srcs = action.srcs.slice(0, room);
      if (!srcs.length) {
        return {
          ...state,
          batchMessage: `A batch holds up to ${MAX_BATCH} photos. Submit these first, then add more.`,
        };
      }
      return {
        ...state,
        overlays: drop(drop(drop(state.overlays, "libraryPicker"), "sourceChooser"), "galleryPermission"),
        batchMessage: `${srcs.length} photo${srcs.length === 1 ? "" : "s"} added. Large files are resized automatically before upload.`,
        upload: {
          ...state.upload,
          items: [
            ...state.upload.items,
            ...srcs.map((src, i) => ({
              id: `u-${Date.now()}-${state.upload.items.length + i}`,
              src,
              caption: "",
              status: "waiting" as const,
              progress: 0,
            })),
          ],
        },
      };
    }

    case "removeUploadItem":
      return {
        ...state,
        upload: { ...state.upload, items: state.upload.items.filter((i) => i.id !== action.id) },
      };

    case "setUploadCaption":
      return {
        ...state,
        upload: {
          ...state.upload,
          items: state.upload.items.map((i) =>
            i.id === action.id ? { ...i, caption: action.caption } : i,
          ),
        },
      };

    case "setCaptionForSrc":
      return {
        ...state,
        upload: {
          ...state.upload,
          items: state.upload.items.map((i) =>
            i.src === action.src ? { ...i, caption: action.caption } : i,
          ),
        },
      };

    case "setUploadField": {
      if (action.field === "eventId") {
        return {
          ...state,
          upload: { ...state.upload, eventId: action.value },
          batchMessage: null,
        };
      }
      if (action.field === "category") {
        return { ...state, upload: { ...state.upload, category: action.value as Category | null } };
      }
      return { ...state, upload: { ...state.upload, club: action.value as Club | null } };
    }

    case "toggleUploadConsent":
      return { ...state, upload: { ...state.upload, consent: !state.upload.consent } };

    case "startUpload": {
      const guard = uploadGuard(state);
      if (!guard.ok) return { ...state, batchMessage: guard.message };
      if (state.network === "offline") {
        return {
          ...state,
          uploadError: "offline",
          overlays: ensure(state.overlays, "uploadProgress"),
        };
      }
      return {
        ...state,
        uploadError: null,
        batchMessage: null,
        uploadPhase: "running",
        upload: {
          ...state.upload,
          items: state.upload.items.map((item, i) => ({
            ...item,
            status: "waiting" as const,
            progress: 0,
          failNote: undefined,
          willFail: state.forceUploadFailure || i === 1,
          })),
        },
        overlays: ensure(state.overlays, "uploadProgress"),
      };
    }

    case "uploadTick": {
      if (state.uploadPhase !== "running") return state;
      let changed = false;
      const items = state.upload.items.map((item) => {
        if (changed || item.status === "done" || item.status === "failed") return item;
        changed = true;
        if (item.status === "waiting") return { ...item, status: "compressing" as const, progress: 14 };
        if (item.status === "compressing") return { ...item, status: "uploading" as const, progress: 30 };
        const progress = Math.min(100, item.progress + 18);
        if (progress >= 60 && item.willFail) {
          return { ...item, status: "failed" as const, progress: 60, failNote: "Interrupted", willFail: false };
        }
        if (progress >= 100) return { ...item, status: "done" as const, progress: 100 };
        return { ...item, progress };
      });
      const next: PrototypeState = { ...state, upload: { ...state.upload, items } };
      const finished = items.length > 0 && items.every((i) => i.status === "done");
      if (finished) {
        return { ...commitUploads(next), uploadPhase: "success" };
      }
      return next;
    }

    case "retryFailed": {
      if (state.network === "offline") return { ...state, uploadError: "offline" };
      const items = state.upload.items.map((item) =>
        item.status === "failed"
          ? { ...item, status: "waiting" as const, progress: 0, failNote: undefined, willFail: false }
          : item,
      );
      return { ...state, uploadError: null, uploadPhase: "running", upload: { ...state.upload, items } };
    }

    case "resetUpload":
      return {
        ...state,
        uploadPhase: "idle",
        uploadError: null,
        batchMessage: null,
        upload: { eventId: null, category: null, club: null, consent: false, items: [] },
        overlays: drop(state.overlays, "uploadProgress"),
      };

    case "setNetwork":
      return { ...state, network: action.network };

    case "setLoadError":
      return { ...state, loadError: action.value };

    case "setSlowNetwork":
      return { ...state, slowNetwork: action.value };

    case "setForceUploadFailure":
      return { ...state, forceUploadFailure: action.value };

    /** Dev-forced upload errors (spec §10: too large / storage full). Opens the
     *  progress sheet so the banner is visible where the user would see it. */
    case "setUploadError":
      return {
        ...state,
        uploadError: action.error,
        overlays: action.error ? ensure(state.overlays, "uploadProgress") : drop(state.overlays, "uploadProgress"),
      };

    case "setLoading":
      return { ...state, loading: action.value };

    case "setRefreshing":
      return { ...state, refreshing: action.value };

    case "setTheme":
      return { ...state, theme: action.theme };

    case "toggleTheme":
      return { ...state, theme: state.theme === "dark" ? "light" : "dark" };

    case "finishSetup":
      return {
        ...state,
        firstTimeSetupDone: true,
        studentName: action.name,
        studentClub: action.club,
        overlays: drop(state.overlays, "firstTimeSetup"),
      };

    case "notificationsAsked":
      return { ...state, notificationsAsked: true };

    case "setNotifications":
      return {
        ...state,
        notificationsAsked: true,
        notificationsEnabled: action.enabled,
        overlays: drop(state.overlays, "notifPermission"),
      };

    case "togglePreference":
      return { ...state, [action.key]: !state[action.key] };

    case "deleteAccount":
      return {
        ...createInitialState({ role: state.role }),
        authIssue: "none",
        toast: withToast(state, {
          kind: "success",
          title: "Account deleted",
          description: "Your photos were removed from the yearbook.",
        }),
      };

    case "signOut":
      return { ...createInitialState({ role: state.role }), screen: "signin" };

    default:
      return state;
  }
};

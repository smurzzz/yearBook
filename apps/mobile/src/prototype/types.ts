/* =========================================================================
   YearbookHub — prototype domain types
   Two roles only. Photo status is internal and admin-facing; student
   surfaces never receive or render it.
   ========================================================================= */

export type Role = "student" | "admin";

/** The only 6 full screens in the product. */
export type Screen = "signin" | "home" | "upload" | "myPhotos" | "review" | "events";

export type PhotoStatus = "pending" | "approved" | "rejected";

export type Category =
  | "Sports"
  | "Academics"
  | "Candid"
  | "Graduation"
  | "Clubs"
  | "Culture"
  | "Other";

export type Club = "Drama Club" | "Robotics Club" | "Photography Club";

export interface Person {
  id: string;
  name: string;
  email: string;
  avatar: string;
  club?: Club;
  role: Role;
}

export interface RemovalRequest {
  reporterId: string;
  reason: string;
  notes?: string;
  requestedAt: string;
  resolved?: "removed" | "dismissed";
}

export interface PhotoItem {
  id: string;
  src: string;
  caption: string;
  eventId: string;
  category: Category;
  club?: Club;
  uploaderId: string;
  status: PhotoStatus;
  /** Present only when status is "rejected" — shown to admins, and to the
   *  owner as a single quiet note inside the photo viewer. */
  rejectReason?: string;
  uploadedAt: string;
  /** Photos submitted together in one batch: only the top tile gets a stack icon. */
  batchId?: string;
  consentConfirmed: boolean;
  removalRequest?: RemovalRequest;
}

export interface EventItem {
  id: string;
  name: string;
  description: string;
  cover: string;
  /** ISO deadline. */
  deadline: string;
  open: boolean;
  maxPhotosPerUser: number;
  rules: string[];
}

export type NotificationKind = "deadline" | "review" | "removal";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  photoId?: string;
}

/* ------------------------------- Overlays ------------------------------- */

/** The 14 numbered bottom sheets, plus system-style overlays and the
 *  read-only uploader grid described in the All-photos spec. */
export type OverlayId =
  | "firstTimeSetup"
  | "profile"
  | "privacy"
  | "help"
  | "notifPermission"
  | "notifications"
  | "eventDetail"
  | "uploadProgress"
  | "photoViewer"
  | "requestRemoval"
  | "adminPhotoDetail"
  | "rejectReason"
  | "filter"
  | "eventForm"
  | "uploaderGrid"
  | "sourceChooser"
  | "libraryPicker"
  | "cameraPermission"
  | "galleryPermission";

export interface OverlayStackItem {
  id: OverlayId;
  photoId?: string;
  eventId?: string;
  uploaderId?: string;
}

export type DialogId =
  | "logout"
  | "deleteAccount"
  | "deletePhoto"
  | "removePhoto"
  | "deleteEvent";

export type ToastKind = "undo" | "success";

export interface ToastState {
  kind: ToastKind;
  title: string;
  description?: string;
  actionLabel?: string;
  /** Bumped on every toast so the component can restart its timer. */
  key: number;
}

/* --------------------------------- Upload -------------------------------- */

export type UploadItemStatus = "waiting" | "compressing" | "uploading" | "done" | "failed";

export interface UploadItem {
  id: string;
  src: string;
  caption: string;
  status: UploadItemStatus;
  progress: number;
  failNote?: string;
  /** Prototype-only: this item fails once at 60%, then succeeds on Retry. */
  willFail?: boolean;
}

export interface UploadDraft {
  eventId: string | null;
  category: Category | null;
  club: Club | null;
  consent: boolean;
  items: UploadItem[];
}

/* -------------------------------- Filters -------------------------------- */

export interface FilterState {
  status: PhotoStatus | "any";
  eventId: string | "any";
  category: Category | "any";
  club: Club | "any";
  uploaderId: string | "any";
  from: string | null;
  to: string | null;
  reportedOnly: boolean;
}

export type AuthIssue = "none" | "cancelled" | "nonSchool" | "expired" | "maintenance" | "denied";

/* ------------------------------ Frame state ------------------------------ */

export interface PrototypeState {
  role: Role;
  screen: Screen;

  /* Auth */
  signedIn: boolean;
  consentChecked: boolean;
  authIssue: AuthIssue;
  firstTimeSetupDone: boolean;

  /* Chrome */
  theme: "light" | "dark";
  overlays: OverlayStackItem[];
  dialog: DialogId | null;
  dialogPhotoId?: string;
  dialogEventId?: string;
  network: "online" | "offline";
  loading: boolean;
  refreshing: boolean;

  /* Data */
  photos: PhotoItem[];
  events: EventItem[];
  notifications: NotificationItem[];

  /* Admin review / all photos */
  allPhotosMode: "review" | "all";
  reviewIndex: number;
  reviewEventFilter: string | "all";
  filter: FilterState;
  filterDraft: FilterState;

  /* Feedback */
  undo: { photoId: string; prevStatus: PhotoStatus; prevReason?: string } | null;
  toast: ToastState | null;

  /* Student upload */
  upload: UploadDraft;
  uploadPhase: "idle" | "running" | "success";
  uploadError: null | "offline" | "tooLarge" | "storage";
  batchMessage: string | null;
  storageUsedMb: number;

  /* Profile / preferences */
  studentName: string;
  studentClub: Club | null;
  notificationsAsked: boolean;
  notificationsEnabled: boolean;
  deadlineReminders: boolean;
  reviewResults: boolean;
}

export interface CountdownInfo {
  days: number;
  closed: boolean;
  urgent: boolean;
  label: string;
  short: string;
}

export const CATEGORIES: Category[] = [
  "Sports",
  "Academics",
  "Candid",
  "Graduation",
  "Clubs",
  "Culture",
  "Other",
];

export const CLUBS: Club[] = ["Drama Club", "Robotics Club", "Photography Club"];

export const REJECT_PRESETS = [
  "Blurry",
  "Too dark",
  "Inappropriate",
  "Duplicate",
  "Wrong event",
  "Low resolution",
  "Other",
] as const;

export const REMOVAL_REASONS = [
  "I'm in this photo and want it removed",
  "Inappropriate content",
  "Wrong event or tag",
  "Copyright",
  "Other",
] as const;

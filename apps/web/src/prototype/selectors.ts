import { EVENTS, STUDENT_ID, personById } from "./data";
import { countdown } from "./format";
import type {
  Category,
  Club,
  FilterState,
  PhotoItem,
  PhotoStatus,
  PrototypeState,
} from "./types";

export const MAX_BATCH = 20;
export const STORAGE_QUOTA_MB = 200;
export const MB_PER_PHOTO = 8;

export const emptyFilter: FilterState = {
  status: "any",
  eventId: "any",
  category: "any",
  club: "any",
  uploaderId: "any",
  from: null,
  to: null,
  reportedOnly: false,
};

/* ------------------------------- Identity -------------------------------- */

export const currentUserId = (state: PrototypeState) =>
  state.role === "student" ? STUDENT_ID : "daniel";

export const currentUser = (state: PrototypeState) => personById(currentUserId(state));

/* -------------------------------- Photos --------------------------------- */

const newestFirst = (photos: PhotoItem[]) =>
  [...photos].sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));

/** A student only ever sees their own photos. */
export const myPhotos = (state: PrototypeState) =>
  newestFirst(state.photos.filter((p) => p.uploaderId === STUDENT_ID));

export const photosByUploader = (state: PrototypeState, uploaderId: string) =>
  newestFirst(state.photos.filter((p) => p.uploaderId === uploaderId));

export const photosByEvent = (state: PrototypeState, eventId: string) =>
  newestFirst(state.photos.filter((p) => p.eventId === eventId));

/** Admin review queue: pending photos, newest first, optionally per event. */
export const pendingPhotos = (state: PrototypeState) =>
  newestFirst(
    state.photos.filter(
      (p) =>
        p.status === "pending" &&
        (state.reviewEventFilter === "all" || p.eventId === state.reviewEventFilter),
    ),
  );

export const pendingCount = (state: PrototypeState) => pendingPhotos(state).length;

export const reportedPhotos = (state: PrototypeState) =>
  state.photos.filter((p) => p.removalRequest && !p.removalRequest.resolved);

export const filterPhotos = (photos: PhotoItem[], f: FilterState) =>
  photos.filter((p) => {
    if (f.status !== "any" && p.status !== f.status) return false;
    if (f.eventId !== "any" && p.eventId !== f.eventId) return false;
    if (f.category !== "any" && p.category !== f.category) return false;
    if (f.club !== "any" && p.club !== f.club) return false;
    if (f.uploaderId !== "any" && p.uploaderId !== f.uploaderId) return false;
    if (f.reportedOnly && !(p.removalRequest && !p.removalRequest.resolved)) return false;
    if (f.from && new Date(p.uploadedAt) < new Date(`${f.from}T00:00:00`)) return false;
    if (f.to && new Date(p.uploadedAt) > new Date(`${f.to}T23:59:59`)) return false;
    return true;
  });

export const filteredPhotos = (state: PrototypeState) =>
  newestFirst(filterPhotos(state.photos, state.filter));

export const statusCounts = (photos: PhotoItem[]) => ({
  pending: photos.filter((p) => p.status === "pending").length,
  approved: photos.filter((p) => p.status === "approved").length,
  rejected: photos.filter((p) => p.status === "rejected").length,
});

/** batchId → number of photos submitted together. 2+ gets the stacked icon. */
export const batchCounts = (photos: PhotoItem[]) => {
  const counts = new Map<string, number>();
  photos.forEach((photo) => {
    if (!photo.batchId) return;
    counts.set(photo.batchId, (counts.get(photo.batchId) ?? 0) + 1);
  });
  return counts;
};

export const batchCountFor = (counts: Map<string, number>, photo: PhotoItem) =>
  photo.batchId ? counts.get(photo.batchId) ?? 1 : 1;

/* ------------------------------- Student -------------------------------- */

export const studentStats = (state: PrototypeState) => {
  const mine = myPhotos(state);
  return { photos: mine.length, events: new Set(mine.map((p) => p.eventId)).size };
};

export const eventsForStudent = (state: PrototypeState) =>
  [...state.events].sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));

export const openEvents = (state: PrototypeState) =>
  eventsForStudent(state).filter((e) => e.open && !countdown(e.deadline).closed);

export const userEventCount = (state: PrototypeState, eventId: string, userId = STUDENT_ID) =>
  state.photos.filter((p) => p.eventId === eventId && p.uploaderId === userId).length;

export const eventSubmissionCount = (state: PrototypeState, eventId: string) =>
  state.photos.filter((p) => p.eventId === eventId).length;

export const unreadCount = (state: PrototypeState) =>
  state.notifications.filter((n) => !n.read).length;

/* -------------------------------- Upload -------------------------------- */

export type UploadGuardReason =
  | "no-photos"
  | "no-event"
  | "no-category"
  | "deadline"
  | "limit"
  | "consent"
  | "storage";

export interface UploadGuard {
  ok: boolean;
  reason: UploadGuardReason | null;
  title: string;
  message: string;
  remaining: number;
}

export const uploadSummary = (state: PrototypeState) => {
  const items = state.upload.items;
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const percent = items.length
    ? Math.round(items.reduce((sum, i) => sum + (i.status === "done" ? 100 : i.progress), 0) / items.length)
    : 0;
  return { total: items.length, done, failed, percent, allDone: items.length > 0 && done + failed === items.length && failed === 0 };
};

export const uploadGuard = (state: PrototypeState): UploadGuard => {
  const { upload } = state;
  const count = upload.items.length;
  const event = state.events.find((e) => e.id === upload.eventId) ?? null;
  const used = event ? userEventCount(state, event.id) : 0;
  const remaining = event ? Math.max(0, event.maxPhotosPerUser - used) : 0;

  const fail = (reason: UploadGuardReason, title: string, message: string): UploadGuard => ({
    ok: false,
    reason,
    title,
    message,
    remaining,
  });

  if (!count) {
    return fail(
      "no-photos",
      "Add photos first",
      `Pick from your camera or gallery — up to ${MAX_BATCH} at a time.`,
    );
  }
  if (!event) {
    return fail(
      "no-event",
      "Select an event",
      "Every submission belongs to an event so it lands in the right chapter of the yearbook.",
    );
  }
  if (!upload.category) {
    return fail(
      "no-category",
      "Select a category",
      "Categories are how the layout team finds your photo later.",
    );
  }
  if (!event.open || countdown(event.deadline).closed) {
    return fail(
      "deadline",
      "Submissions are closed",
      `${event.name} stopped accepting photos on its deadline. You can still browse what you already uploaded.`,
    );
  }
  if (used + count > event.maxPhotosPerUser) {
    return fail(
      "limit",
      "Photo limit reached",
      `You already have ${used} of ${event.maxPhotosPerUser} photos for ${event.name}. Pick another event or remove some photos.`,
    );
  }
  if (state.storageUsedMb + count * MB_PER_PHOTO > STORAGE_QUOTA_MB) {
    return fail(
      "storage",
      "Storage limit reached",
      `Your uploads use ${state.storageUsedMb} MB of your ${STORAGE_QUOTA_MB} MB allowance. Delete a few photos to free up space.`,
    );
  }
  if (!upload.consent) {
    return fail(
      "consent",
      "Confirm permission",
      "Please confirm that you have permission to share these photos and that the people in them agree to be published.",
    );
  }
  return { ok: true, reason: null, title: "", message: "", remaining };
};

/* -------------------------------- Filters -------------------------------- */

export const activeFilterCount = (f: FilterState) => {
  let n = 0;
  if (f.status !== "any") n++;
  if (f.eventId !== "any") n++;
  if (f.category !== "any") n++;
  if (f.club !== "any") n++;
  if (f.uploaderId !== "any") n++;
  if (f.from) n++;
  if (f.to) n++;
  if (f.reportedOnly) n++;
  return n;
};

export const filterChips = (f: FilterState, label: (id: string) => string) => {
  const chips: string[] = [];
  if (f.status !== "any") chips.push(f.status[0].toUpperCase() + f.status.slice(1));
  if (f.eventId !== "any") chips.push(label(f.eventId));
  if (f.category !== "any") chips.push(f.category);
  if (f.club !== "any") chips.push(f.club);
  if (f.uploaderId !== "any") chips.push(label(f.uploaderId));
  if (f.reportedOnly) chips.push("Reported");
  if (f.from && f.to) chips.push("Date range");
  else if (f.from) chips.push(`From ${f.from}`);
  else if (f.to) chips.push(`Until ${f.to}`);
  return chips;
};

/* --------------------------- Review navigation --------------------------- */

export const clampReviewIndex = (index: number, total: number) =>
  Math.max(0, Math.min(index, Math.max(0, total - 1)));

export const EVENT_NAMES = EVENTS.map((e) => e.name);

export const emptyStateFor = (
  kind: "photos" | "notifications" | "events" | "review" | "reports",
  state?: PrototypeState,
) => {
  switch (kind) {
    case "photos":
      return { title: "No photos yet", body: "Tap + to upload your first one." };
    case "notifications":
      return { title: "You're all caught up", body: "Deadline reminders and review results will show up here." };
    case "events":
      return { title: "No events yet", body: "Create an event and it appears on every student's Home screen." };
    case "review":
      return { title: "All caught up!", body: "Nothing is waiting for review right now." };
    case "reports":
      return {
        title: "No removal requests",
        body: state
          ? "Photos students ask to remove will appear under the Reported filter."
          : "Nothing to resolve right now.",
      };
  }
};

export const CATEGORY_TINT: Record<Category, string> = {
  Sports: "bg-primary/10 text-primary",
  Academics: "bg-status-reported-soft text-status-reported-foreground",
  Candid: "bg-status-approved-soft text-status-approved-foreground",
  Graduation: "bg-status-pending-soft text-status-pending-foreground",
  Clubs: "bg-admin-surface text-admin-ink",
  Culture: "bg-status-rejected-soft text-status-rejected-foreground",
  Other: "bg-muted text-muted-foreground",
};

export const statusMeta: Record<PhotoStatus, { label: string }> = {
  pending: { label: "Pending" },
  approved: { label: "Approved" },
  rejected: { label: "Rejected" },
};

export const clubLabel = (club: Club | null | undefined) => club ?? "No club";

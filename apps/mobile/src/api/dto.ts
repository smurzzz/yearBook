/* P6 mapping layer — shared DTOs → the prototype view models.
   Both builds go through here: the HTTP client returns DTOs, and the demo
   adapter (mock.ts) projects the live store back into DTOs, so the exact same
   mappers hydrate the screens either way (phases.md P6 step 5).

   Rules that live in this file:
   - cover keys → the bundled fixture paths img() resolves;
   - signed/mock URLs → the view-model `src` (fixture keys pass through);
   - identity: /photos/mine is always "me", so tiles carry the viewer id the
     prototype selectors filter on (currentUserId(state));
   - students never receive status: a rejected student photo is expressed by
     `rejectReason` (needs_replacement), everything else reads detail DTOs;
   - tag names from the API are matched against the prototype's seeded
     unions (the seeds are identical — CATEGORIES_SEED / CLUBS_SEED). */

import type {
  AdminPhotoDTO,
  AdminTileDTO,
  AdminUploaderRef,
  EventDTO,
  NotificationDTO,
  ReportDTO,
  StudentPhotoDTO,
  TileDTO,
} from "@yearbookhub/shared";
import { CATEGORIES_SEED, CLUBS_SEED, REJECTION_LABELS, REPORT_LABELS } from "@yearbookhub/shared";
import { registerEvents, registerPeople } from "../prototype/data";
import type {
  Category,
  Club,
  EventItem,
  NotificationItem,
  NotificationKind,
  Person,
  PhotoItem,
  RemovalRequest,
} from "../prototype/types";

/* --------------------------------- helpers -------------------------------- */

/** API cover keys → fixture paths (the 4 bundled covers). */
export const COVER_FROM_KEY: Record<string, string> = {
  sports: "/photos/cover-intramurals.jpg",
  festival: "/photos/cover-foundation-day.jpg",
  graduation: "/photos/cover-graduation.jpg",
  science: "/photos/cover-science-fair.jpg",
};

/** Fixture cover path → API cover key (the Event Form's save path). */
export const coverKeyOf = (coverPath: string): EventDTO["cover_key"] => {
  const hit = Object.entries(COVER_FROM_KEY).find(([, path]) => path === coverPath);
  return (hit?.[0] ?? "sports") as EventDTO["cover_key"];
};

/** Absolute URLs (signed storage, mock hosts) and local files keep their
 *  scheme so img() renders them via `{ uri }`; fixture keys pass through. */
export const srcFromUrl = (url: string): string => {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  const at = url.indexOf("/photos/");
  return at >= 0 ? url.slice(at) : url;
};

const CATEGORIES = new Set<string>(CATEGORIES_SEED);
const CLUBS = new Set<string>(CLUBS_SEED);

export const asCategory = (name: string): Category =>
  CATEGORIES.has(name) ? (name as Category) : "Other";

export const asClub = (name: string | null | undefined): Club | null =>
  name && CLUBS.has(name) ? (name as Club) : null;

/** UI copy → API codes. The prototype screens speak display labels
 *  (REJECT_PRESETS, REMOVAL_REASONS); the API contract speaks codes. */
const REJECTION_CODE_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(REJECTION_LABELS).map(([code, label]) => [label, code]),
);

const REPORT_CODE_BY_LABEL: Record<string, string> = {
  ...Object.fromEntries(Object.entries(REPORT_LABELS).map(([code, label]) => [label, code])),
  "Wrong event or tag": "wrong_tag", // prototype copy variant (types.ts REMOVAL_REASONS)
};

export const rejectionCodeOf = (label: string): string =>
  REJECTION_CODE_BY_LABEL[label] ?? "other";

export const reportCodeOf = (label: string): string =>
  REPORT_CODE_BY_LABEL[label] ?? "other";

/* --------------------------------- people --------------------------------- */

export const personFromUploader = (u: AdminUploaderRef): Person => ({
  id: u.id,
  name: u.full_name,
  email: u.email,
  avatar: u.avatar_url ? srcFromUrl(u.avatar_url) : "",
  club: u.club ? asClub(u.club.name) ?? undefined : undefined,
  role: "student",
});

/* --------------------------------- events --------------------------------- */

export const toEventItem = (e: EventDTO): EventItem => ({
  id: e.id,
  name: e.name,
  description: e.description,
  cover: COVER_FROM_KEY[e.cover_key] ?? COVER_FROM_KEY.sports,
  deadline: e.deadline,
  /** `status` is the effective status (data-model.md §6). */
  open: e.status === "open",
  maxPhotosPerUser: e.max_photos,
  rules: e.rules,
  photoCount: e.photo_count,
});

/* --------------------------------- photos --------------------------------- */

const reportToRemoval = (r: ReportDTO): RemovalRequest => ({
  id: r.id,
  reporterId: r.reporter.id,
  reason: r.reason_label,
  notes: r.notes ?? undefined,
  requestedAt: r.created_at,
  resolved:
    r.status === "open" ? undefined : r.status === "removed" ? "removed" : "dismissed",
});

/** GET /photos/mine tile → grid PhotoItem. Detail (caption, tags, rejection)
 *  hydrates through getMyPhoto when the viewer opens the photo. */
export const toMyPhoto = (tile: TileDTO, viewerId: string): PhotoItem => ({
  id: tile.id,
  src: srcFromUrl(tile.thumb_url),
  caption: "",
  eventId: tile.event.id,
  category: "Other", // detail-only; the viewer refetches on open
  club: undefined,
  uploaderId: viewerId, // mine == me — selectors filter on the viewer id
  status: "pending", // never rendered on student surfaces
  uploadedAt: tile.created_at,
  batchId: tile.batch_id,
  consentConfirmed: true, // completed uploads carry consent (consent_confirmed_at)
});

/** GET /admin/photos tile → grid PhotoItem (facets intact for client filters). */
export const toAdminPhotoFromTile = (tile: AdminTileDTO): PhotoItem => ({
  id: tile.id,
  src: srcFromUrl(tile.thumb_url),
  caption: tile.caption,
  eventId: tile.event.id,
  category: asCategory(tile.category.name),
  club: asClub(tile.club?.name) ?? undefined,
  uploaderId: tile.uploader.id,
  status: tile.status,
  uploadedAt: tile.created_at,
  batchId: tile.batch_id,
  consentConfirmed: true,
  /** The tile only knows *that* a report is open; the detail hydrates the
   *  reporter/reason when the admin opens the photo (api.md admin notes). */
  removalRequest: tile.reported
    ? { reporterId: "", reason: "", requestedAt: tile.created_at }
    : undefined,
});

/** GET /admin/photos/:id, review queue, approve/reject/reset responses. */
export const toAdminPhoto = (dto: AdminPhotoDTO): PhotoItem => ({
  id: dto.id,
  src: srcFromUrl(dto.thumb_url),
  caption: dto.caption,
  eventId: dto.event.id,
  category: asCategory(dto.category.name),
  club: asClub(dto.club?.name) ?? undefined,
  uploaderId: dto.uploader.id,
  status: dto.status,
  rejectReason: dto.rejection?.label,
  uploadedAt: dto.created_at,
  batchId: dto.batch_id,
  consentConfirmed: Boolean(dto.consent_confirmed_at),
  removalRequest: dto.open_report ? reportToRemoval(dto.open_report) : undefined,
});

/** GET /photos/:id (viewer detail — also the photo's pager identity). */
export const toStudentPhoto = (dto: StudentPhotoDTO, viewerId: string): PhotoItem => ({
  id: dto.id,
  src: srcFromUrl(dto.thumb_url),
  caption: dto.caption,
  eventId: dto.event.id,
  category: asCategory(dto.category.name),
  club: asClub(dto.club?.name) ?? undefined,
  uploaderId: viewerId,
  /** The student contract has no status; needs_replacement IS the reject
   *  state, and surfaces gate on `rejectReason` (PhotoSheets wasRejected). */
  status: dto.needs_replacement ? "rejected" : "pending",
  rejectReason: dto.rejection?.label,
  uploadedAt: dto.created_at,
  batchId: dto.batch_id,
  consentConfirmed: true,
});

/* ------------------------------ notifications ------------------------------ */

const NOTIFICATION_KIND: Record<string, NotificationKind> = {
  deadline_reminder: "deadline",
  photo_needs_replacement: "review",
  report_resolved: "removal",
};

export const toNotification = (n: NotificationDTO): NotificationItem => ({
  id: n.id,
  kind: NOTIFICATION_KIND[n.type] ?? "deadline",
  title: n.title,
  body: n.body,
  at: n.created_at,
  read: n.read,
  photoId: n.data.photo_id,
});

/* --------------------------- registrations (sync) -------------------------- */

/** Hydration registers the entities screens look up by id through
 *  personById/eventById (data.ts registry). Mock mode registers its own
 *  fixtures back — a no-op for lookups. */
export const registerPeopleFrom = (people: (AdminUploaderRef | Person)[]): void => {
  registerPeople(people.map((p) => ("full_name" in p ? personFromUploader(p) : p)));
};

export const registerEventsFrom = (events: EventItem[]): void => {
  registerEvents(events);
};

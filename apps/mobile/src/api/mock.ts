/* Demo adapter — phases.md P2A/T-211 (mock side of the contract tests).

   Implements the SAME ApiClient as http.ts, projecting the LIVE prototype
   store into shared-DTO responses. Two consumers:
   - mutation call sites run flag-free in both builds: the mock method is a
     resolving no-op and the reducer (dispatched right after, in both modes)
     is what actually applies the demo rules — BR-05, one open report per
     photo/reporter, event limits;
   - apps/mobile/src/api/mock.contract.test.ts parses every response with the
     shared zod schemas, so the demo data can never drift from api.md (T-211).

   Screen READS do not call this adapter: in the mock build the store IS the
   server response (fixtures are already hydrated), so the sync hooks skip
   their fetch behind USE_MOCK. Fixtures never carried image dimensions, so
   tiles emit the grid's nominal 1080×1080 — nothing in the view models
   consumes width/height (the real API returns the true values). */

import type {
  AdminPhotoDTO,
  AdminReportDTO,
  AdminTileDTO,
  EventDTO,
  NotificationDTO,
  ReportDTO,
  ReportReason,
  StudentPhotoDTO,
  TileDTO,
  UserDTO,
} from "@yearbookhub/shared";
import { CATEGORIES_SEED, CLUBS_SEED, REPORT_LABELS } from "@yearbookhub/shared";
import type {
  AdminUserSummary,
  ApiClient,
  BrowseMeta,
  CreateEventInput,
  CreateReportInput,
  Lookups,
  List,
  MyPhotosMeta,
  RejectInput,
  ResolveReportInput,
} from "./endpoints";
import { ApiError } from "./errors";
import type { EventItem, NotificationItem, Person, PhotoItem, PrototypeState } from "../prototype/types";
import {
  currentUserId,
  eventSubmissionCount,
  myPhotos,
  pendingPhotos,
  photosByUploader,
  userEventCount,
  unreadCount,
} from "../prototype/selectors";
import { ADMIN_ID, eventById, personById } from "../prototype/data";
import { COVER_FROM_KEY, coverKeyOf, rejectionCodeOf, reportCodeOf } from "./dto";

const MOCK_ORIGIN = "https://mock.yearbook.local";
const NOMINAL = 1080;
/** Stable "now" for fields the fixtures don't model (created_at on events). */
const BOOT = new Date().toISOString();

const abs = (path: string): string =>
  path.startsWith("/") ? `${MOCK_ORIGIN}${path}` : path;

const eventRef = (id: string) => ({ id, name: eventById(id).name });

const uploaderRef = (state: PrototypeState, uploaderId: string) => {
  const person = personById(uploaderId);
  return {
    id: person.id,
    full_name: person.name,
    email: person.email,
    avatar_url: person.avatar ? abs(person.avatar) : null,
    club: person.club ? { id: person.club, name: person.club } : null,
  };
};

const batchCountOf = (state: PrototypeState, photo: PhotoItem): number =>
  photo.batchId
    ? state.photos.filter((p) => p.batchId === photo.batchId).length
    : 1;

const toTileDto = (state: PrototypeState, p: PhotoItem): TileDTO => ({
  id: p.id,
  thumb_url: abs(p.src),
  width: NOMINAL,
  height: NOMINAL,
  batch_size: batchCountOf(state, p),
  batch_id: p.batchId ?? p.id,
  event: eventRef(p.eventId),
  created_at: p.uploadedAt,
});

const toAdminTileDto = (state: PrototypeState, p: PhotoItem): AdminTileDTO => ({
  ...toTileDto(state, p),
  status: p.status,
  reported: Boolean(p.removalRequest && !p.removalRequest.resolved),
  caption: p.caption,
  category: { id: p.category, name: p.category },
  club: p.club ? { id: p.club, name: p.club } : null,
  uploader: uploaderRef(state, p.uploaderId),
});

const openReportDto = (p: PhotoItem): ReportDTO | null => {
  const request = p.removalRequest;
  if (!request || request.resolved) return null;
  return {
    id: request.id ?? `report-${p.id}`,
    photo_id: p.id,
    reporter: { id: request.reporterId, full_name: personById(request.reporterId).name },
    reason: reportCodeOf(request.reason) as ReportReason,
    reason_label: request.reason,
    notes: request.notes ?? null,
    status: "open",
    created_at: request.requestedAt,
    resolved_at: null,
  };
};

const toAdminPhotoDto = (state: PrototypeState, p: PhotoItem): AdminPhotoDTO => ({
  id: p.id,
  status: p.status,
  uploader: uploaderRef(state, p.uploaderId),
  event: eventRef(p.eventId),
  category: { id: p.category, name: p.category },
  club: p.club ? { id: p.club, name: p.club } : null,
  caption: p.caption,
  created_at: p.uploadedAt,
  reviewed_at: p.status === "pending" ? null : p.uploadedAt,
  reviewed_by:
    p.status === "pending"
      ? null
      : { id: ADMIN_ID, full_name: personById(ADMIN_ID).name },
  rejection:
    p.status === "rejected" && p.rejectReason
      ? { reason: rejectionCodeOf(p.rejectReason) as never, label: p.rejectReason, note: null }
      : null,
  consent_confirmed_at: p.consentConfirmed ? p.uploadedAt : BOOT,
  width: NOMINAL,
  height: NOMINAL,
  batch_size: batchCountOf(state, p),
  batch_id: p.batchId ?? p.id,
  thumb_url: abs(p.src),
  original_url: abs(p.src),
  open_report: openReportDto(p),
});

const toStudentPhotoDto = (state: PrototypeState, p: PhotoItem): StudentPhotoDTO => ({
  id: p.id,
  event: eventRef(p.eventId),
  category: { id: p.category, name: p.category },
  club: p.club ? { id: p.club, name: p.club } : null,
  caption: p.caption,
  created_at: p.uploadedAt,
  width: NOMINAL,
  height: NOMINAL,
  batch_size: batchCountOf(state, p),
  batch_id: p.batchId ?? p.id,
  thumb_url: abs(p.src),
  original_url: abs(p.src),
  needs_replacement: p.status === "rejected",
  rejection:
    p.status === "rejected" && p.rejectReason
      ? { reason: rejectionCodeOf(p.rejectReason) as never, label: p.rejectReason, note: null }
      : null,
});

const toEventDto = (state: PrototypeState, e: EventItem): EventDTO => ({
  id: e.id,
  name: e.name,
  description: e.description,
  cover_key: coverKeyOf(e.cover),
  deadline: e.deadline,
  max_photos: e.maxPhotosPerUser,
  is_open: e.open,
  /** Same effective-status rule as the API (data-model.md §6). */
  status: e.open && Date.parse(e.deadline) > Date.now() ? "open" : "closed",
  my_photo_count: userEventCount(state, e.id),
  photo_count: eventSubmissionCount(state, e.id),
  rules: e.rules,
  created_at: BOOT,
});

const NOTIFICATION_TYPE: Record<NotificationItem["kind"], string> = {
  deadline: "deadline_reminder",
  review: "photo_needs_replacement",
  removal: "report_resolved",
};

const toNotificationDto = (n: NotificationItem): NotificationDTO => ({
  id: n.id,
  type: NOTIFICATION_TYPE[n.kind] as NotificationDTO["type"],
  title: n.title,
  body: n.body,
  data: n.photoId ? { photo_id: n.photoId } : {},
  read: n.read,
  created_at: n.at,
});

const meDto = (state: PrototypeState): UserDTO => {
  const person = personById(currentUserId(state));
  return {
    id: person.id,
    email: person.email,
    full_name: state.studentName,
    avatar_url: person.avatar ? abs(person.avatar) : null,
    role: state.role,
    club: state.studentClub ? { id: state.studentClub, name: state.studentClub } : null,
    notify_deadlines: state.deadlineReminders,
    notify_reviews: state.reviewResults,
    consented_at: BOOT,
  };
};

const defaultRules = (maxPhotos: number): string[] => [
  `Up to ${maxPhotos} photos per student`,
  "Photos must be taken at this event",
  "Get permission from everyone in the photo",
];

/** The demo adapter is only constructed by the provider (and the contract
 *  test) with a live snapshot getter — it never touches React. */
export const createMockApiClient = (getState: () => PrototypeState): ApiClient => {
  const findPhoto = (id: string): PhotoItem => {
    const photo = getState().photos.find((p) => p.id === id);
    if (!photo) throw new ApiError("NOT_FOUND", 404, "Photo not found.");
    return photo;
  };

  const page = <T, M = undefined>(data: T[], meta?: M) =>
    ({
      data,
      next_cursor: null,
      ...(meta === undefined ? {} : { meta }),
    }) as List<T, M>;

  const client: ApiClient = {
    health: async () => ({ ok: true }),

    /* ------------------------------ account ------------------------------ */
    getMe: async () => meDto(getState()),
    createMe: async () => meDto(getState()),
    patchMe: async () => meDto(getState()),
    deleteMe: async () => undefined,
    putPushToken: async () => undefined,
    deletePushToken: async () => undefined,

    /* --------------------------- lookups & events ------------------------ */
    lookups: async (): Promise<Lookups> => ({
      categories: CATEGORIES_SEED.map((name) => ({ id: name, name })),
      clubs: CLUBS_SEED.map((name) => ({ id: name, name })),
    }),
    listEvents: async () => {
      const state = getState();
      const events = [...state.events].sort(
        (a, b) => Date.parse(a.deadline) - Date.parse(b.deadline),
      );
      return page(
        events.map((e) => toEventDto(state, e)),
        { total: events.length, accepting: events.filter((e) => e.open).length },
      );
    },
    getEvent: async (id) => {
      const state = getState();
      const event = state.events.find((e) => e.id === id);
      if (!event) throw new ApiError("NOT_FOUND", 404, "Event not found.");
      return toEventDto(state, event);
    },
    createEvent: async (input: CreateEventInput) => {
      const state = getState();
      const draft: EventItem = {
        id: `event-${Date.now()}`,
        name: input.name,
        description: input.description,
        cover: COVER_FROM_KEY[input.cover_key] ?? COVER_FROM_KEY.sports,
        deadline: input.deadline,
        open: input.is_open,
        maxPhotosPerUser: input.max_photos,
        rules: defaultRules(input.max_photos),
      };
      return toEventDto(state, draft);
    },
    updateEvent: async (id, input) => {
      const state = getState();
      const existing = state.events.find((e) => e.id === id);
      if (!existing) throw new ApiError("NOT_FOUND", 404, "Event not found.");
      const draft: EventItem = {
        ...existing,
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        cover: input.cover_key
          ? COVER_FROM_KEY[input.cover_key] ?? existing.cover
          : existing.cover,
        deadline: input.deadline ?? existing.deadline,
        open: input.is_open ?? existing.open,
        maxPhotosPerUser: input.max_photos ?? existing.maxPhotosPerUser,
      };
      return toEventDto(state, draft);
    },
    deleteEvent: async () => undefined,

    /* ------------------------------- upload ------------------------------ */
    uploadIntents: async () => {
      throw new ApiError(
        "MOCK_UNSUPPORTED",
        500,
        "The demo build simulates uploads in the reducer (startUpload), not through the API.",
      );
    },
    completeUploads: async () => {
      throw new ApiError("MOCK_UNSUPPORTED", 500, "Demo-only flow (see uploadIntents).");
    },
    photoUploadUrl: async () => {
      throw new ApiError("MOCK_UNSUPPORTED", 500, "Demo-only flow (see uploadIntents).");
    },
    replacePhoto: async () => {
      throw new ApiError("MOCK_UNSUPPORTED", 500, "Demo-only flow (see uploadIntents).");
    },

    /* --------------------------- student photos -------------------------- */
    myPhotos: async (params) => {
      const state = getState();
      const mine = myPhotos(state).filter(
        (p) => !params?.event_id || p.eventId === params.event_id,
      );
      const chips = [...new Set(mine.map((p) => p.eventId))].map(eventRef);
      const meta: MyPhotosMeta = {
        photos: mine.length,
        events: chips.length,
        event_chips: chips,
      };
      return page(mine.map((p) => toTileDto(state, p)), meta);
    },
    getMyPhoto: async (id) => toStudentPhotoDto(getState(), findPhoto(id)),
    patchMyPhoto: async (id) => toStudentPhotoDto(getState(), findPhoto(id)),
    deleteMyPhoto: async () => undefined,
    createReport: async (photoId, input: CreateReportInput): Promise<ReportDTO> => {
      const state = getState();
      const photo = findPhoto(photoId);
      const me = personById(currentUserId(state));
      return {
        id: `report-${photo.id}`,
        photo_id: photo.id,
        reporter: { id: me.id, full_name: me.name },
        reason: input.reason,
        reason_label: REPORT_LABELS[input.reason],
        notes: input.notes ?? null,
        status: "open",
        created_at: new Date().toISOString(),
        resolved_at: null,
      };
    },

    /* ----------------------------- notifications ------------------------- */
    notifications: async () => {
      const state = getState();
      return page(
        state.notifications.map(toNotificationDto),
        { unread: unreadCount(state) },
      );
    },
    markAllNotificationsRead: async () => undefined,
    markNotificationRead: async () => undefined,

    /* --------------------------- admin: review --------------------------- */
    reviewQueue: async () => {
      const state = getState();
      const queue = pendingPhotos(state);
      return page(
        queue.map((p) => toAdminPhotoDto(state, p)),
        { total_pending: state.photos.filter((p) => p.status === "pending").length },
      );
    },
    reviewCount: async () => ({
      pending: getState().photos.filter((p) => p.status === "pending").length,
    }),
    approvePhoto: async (id) => toAdminPhotoDto(getState(), findPhoto(id)),
    rejectPhoto: async (id, _input: RejectInput) =>
      toAdminPhotoDto(getState(), findPhoto(id)),
    resetPhoto: async (id) => toAdminPhotoDto(getState(), findPhoto(id)),

    /* --------------------------- admin: browse --------------------------- */
    adminPhotos: async () => {
      const state = getState();
      const meta: BrowseMeta = {
        total: state.photos.length,
        summary: {
          pending: state.photos.filter((p) => p.status === "pending").length,
          approved: state.photos.filter((p) => p.status === "approved").length,
          rejected: state.photos.filter((p) => p.status === "rejected").length,
        },
      };
      // Screens hydrate the full set and filter client-side over the richer
      // tiles (api.md GET /admin/photos client note).
      return page(state.photos.map((p) => toAdminTileDto(state, p)), meta);
    },
    adminPhoto: async (id) => toAdminPhotoDto(getState(), findPhoto(id)),
    patchAdminPhoto: async (id) => toAdminPhotoDto(getState(), findPhoto(id)),
    deleteAdminPhoto: async () => undefined,
    adminUser: async (id): Promise<AdminUserSummary> => {
      const state = getState();
      const person: Person = personById(id);
      const photos = photosByUploader(state, id);
      return {
        id: person.id,
        full_name: person.name,
        email: person.email,
        avatar_url: person.avatar ? abs(person.avatar) : null,
        club: person.club ? { id: person.club, name: person.club } : null,
        photo_count: photos.length,
        event_count: new Set(photos.map((p) => p.eventId)).size,
      };
    },
    adminUserPhotos: async (id) => {
      const state = getState();
      const photos = photosByUploader(state, id);
      const meta: BrowseMeta = {
        total: photos.length,
        summary: {
          pending: photos.filter((p) => p.status === "pending").length,
          approved: photos.filter((p) => p.status === "approved").length,
          rejected: photos.filter((p) => p.status === "rejected").length,
        },
      };
      return page(photos.map((p) => toAdminTileDto(state, p)), meta);
    },

    /* ------------------------ admin: removal requests -------------------- */
    adminReports: async (params) => {
      const state = getState();
      const reports: AdminReportDTO[] = [];
      for (const photo of state.photos) {
        const report = openReportDto(photo);
        if (!report) continue;
        const resolved = photo.removalRequest?.resolved;
        if (params?.status === "resolved" && !resolved) continue;
        if ((!params || params.status === "open") && resolved) continue;
        reports.push({ ...report, photo: toTileDto(state, photo) });
      }
      reports.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      return page(reports);
    },
    resolveReport: async (id, input: ResolveReportInput) => {
      const state = getState();
      const photo = state.photos.find(
        (p) => (p.removalRequest?.id ?? (p.removalRequest ? `report-${p.id}` : "")) === id,
      );
      if (!photo) throw new ApiError("NOT_FOUND", 404, "Report not found.");
      const report = openReportDto(photo);
      if (!report) {
        throw new ApiError("REPORT_ALREADY_RESOLVED", 409, "This request is already resolved.");
      }
      return {
        ...report,
        status: input.action === "remove" ? ("removed" as const) : ("dismissed" as const),
        photo: toTileDto(state, photo),
      };
    },
  };

  return client;
};

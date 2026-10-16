/* HTTP implementation of ApiClient — paths from docs/technical/api.md §2/§3.
   Nothing here knows about envelopes beyond unwrapping `{ data }`; every rule
   about tokens, retries and error states lives in client.ts.

   Payload types are spelled out on purpose: this file is where the documented
   contract meets TypeScript, so a wrong shape shows up here first. */

import type {
  AdminPhotoDTO,
  AdminReportDTO,
  AdminTileDTO,
  EventDTO,
  NotificationDTO,
  ReportDTO,
  StudentPhotoDTO,
  TileDTO,
  UserDTO,
} from "@yearbookhub/shared";
import type { HttpClient } from "./client";
import type {
  AdminUserSummary,
  ApiClient,
  BrowseMeta,
  CompleteResultItem,
  List,
  Lookups,
  MyPhotosMeta,
  UploadIntentItem,
  UploadIntentsResult,
} from "./endpoints";

interface Envelope<T> {
  data: T;
}
const unwrap = <T>(body: Envelope<T>): T => body.data;

export const createHttpApiClient = (http: HttpClient): ApiClient => ({
  health: () => http.request<Envelope<{ ok: boolean }>>("GET", "/health").then(unwrap),

  /* ------------------------------- account ------------------------------ */
  getMe: () => http.request<Envelope<UserDTO>>("GET", "/me").then(unwrap),
  createMe: (input) => http.request<Envelope<UserDTO>>("POST", "/me", { body: input }).then(unwrap),
  patchMe: (input) => http.request<Envelope<UserDTO>>("PATCH", "/me", { body: input }).then(unwrap),
  deleteMe: () => http.request<void>("DELETE", "/me"),
  putPushToken: (input) => http.request<void>("PUT", "/me/push-token", { body: input }),
  deletePushToken: (input) => http.request<void>("DELETE", "/me/push-token", { body: input }),

  /* --------------------------- lookups & events -------------------------- */
  lookups: () => http.request<Envelope<Lookups>>("GET", "/lookups").then(unwrap),
  listEvents: (params) =>
    http.request<List<EventDTO, { total?: number; accepting?: number }>>("GET", "/events", {
      query: { q: params?.q },
    }),
  getEvent: (id) => http.request<Envelope<EventDTO>>("GET", `/events/${id}`).then(unwrap),
  createEvent: (input) =>
    http.request<Envelope<EventDTO>>("POST", "/events", { body: input }).then(unwrap),
  updateEvent: (id, input) =>
    http.request<Envelope<EventDTO>>("PATCH", `/events/${id}`, { body: input }).then(unwrap),
  deleteEvent: (id) => http.request<void>("DELETE", `/events/${id}`),

  /* -------------------------------- upload ------------------------------- */
  uploadIntents: (input) =>
    http.request<Envelope<UploadIntentsResult>>("POST", "/photos/upload-intents", {
      body: input,
    }).then(unwrap),
  completeUploads: (photoIds) =>
    http
      .request<Envelope<{ results: CompleteResultItem[] }>>("POST", "/photos/complete", {
        body: { photo_ids: photoIds },
      })
      .then(unwrap),
  photoUploadUrl: (photoId) =>
    http
      .request<Envelope<{ original: UploadIntentItem["original"]; thumb: UploadIntentItem["thumb"] }>>(
        "POST",
        `/photos/${photoId}/upload-url`,
      )
      .then(unwrap),

  /* --------------------------- student photos ---------------------------- */
  myPhotos: (params) =>
    http.request<List<TileDTO, MyPhotosMeta>>("GET", "/photos/mine", {
      query: { event_id: params?.event_id, limit: params?.limit, cursor: params?.cursor },
    }),
  getMyPhoto: (id) => http.request<Envelope<StudentPhotoDTO>>("GET", `/photos/${id}`).then(unwrap),
  patchMyPhoto: (id, input) =>
    http.request<Envelope<StudentPhotoDTO>>("PATCH", `/photos/${id}`, { body: input }).then(unwrap),
  deleteMyPhoto: (id) => http.request<void>("DELETE", `/photos/${id}`),
  replacePhoto: (id, file) =>
    http.request<Envelope<UploadIntentsResult>>("POST", `/photos/${id}/replace`, {
      body: { file },
    }).then(unwrap),
  createReport: (photoId, input) =>
    http.request<Envelope<ReportDTO>>("POST", `/photos/${photoId}/reports`, { body: input }).then(unwrap),

  /* ---------------------------- notifications ---------------------------- */
  notifications: (params) =>
    http.request<List<NotificationDTO, { unread: number }>>("GET", "/notifications", {
      query: { limit: params?.limit, cursor: params?.cursor },
    }),
  markAllNotificationsRead: () => http.request<void>("POST", "/notifications/read-all"),
  markNotificationRead: (id) => http.request<void>("POST", `/notifications/${id}/read`),

  /* --------------------------- admin: review ----------------------------- */
  reviewQueue: (params) =>
    http.request<List<AdminPhotoDTO, { total_pending: number }>>("GET", "/admin/review/queue", {
      query: { event_id: params?.event_id, limit: params?.limit, cursor: params?.cursor },
    }),
  reviewCount: () =>
    http.request<Envelope<{ pending: number }>>("GET", "/admin/review/count").then(unwrap),
  approvePhoto: (id) =>
    http.request<Envelope<AdminPhotoDTO>>("POST", `/admin/photos/${id}/approve`).then(unwrap),
  rejectPhoto: (id, input) =>
    http.request<Envelope<AdminPhotoDTO>>("POST", `/admin/photos/${id}/reject`, {
      body: input,
    }).then(unwrap),
  resetPhoto: (id) =>
    http.request<Envelope<AdminPhotoDTO>>("POST", `/admin/photos/${id}/reset`).then(unwrap),

  /* ---------------------------- admin: browse ---------------------------- */
  adminPhotos: (params) =>
    http.request<List<AdminTileDTO, BrowseMeta>>("GET", "/admin/photos", {
      query: {
        status: params?.status,
        event_id: params?.event_id,
        category_id: params?.category_id,
        club_id: params?.club_id,
        uploader_id: params?.uploader_id,
        q: params?.q,
        from: params?.from,
        to: params?.to,
        reported: params?.reported ? "true" : undefined,
        count_only: params?.count_only ? "true" : undefined,
        limit: params?.limit,
        cursor: params?.cursor,
      },
    }),
  adminPhoto: (id) => http.request<Envelope<AdminPhotoDTO>>("GET", `/admin/photos/${id}`).then(unwrap),
  patchAdminPhoto: (id, input) =>
    http.request<Envelope<AdminPhotoDTO>>("PATCH", `/admin/photos/${id}`, { body: input }).then(unwrap),
  deleteAdminPhoto: (id) => http.request<void>("DELETE", `/admin/photos/${id}`),
  adminUser: (id) =>
    http.request<Envelope<AdminUserSummary>>("GET", `/admin/users/${id}`).then(unwrap),
  adminUserPhotos: (id, params) =>
    http.request<List<AdminTileDTO, BrowseMeta>>("GET", `/admin/users/${id}/photos`, {
      query: { limit: params?.limit, cursor: params?.cursor },
    }),

  /* ------------------------ admin: removal requests ----------------------- */
  adminReports: (params) =>
    http.request<List<AdminReportDTO>>("GET", "/admin/reports", {
      query: { status: params?.status, limit: params?.limit, cursor: params?.cursor },
    }),
  resolveReport: (id, input) =>
    http.request<Envelope<AdminReportDTO>>("POST", `/admin/reports/${id}/resolve`, {
      body: input,
    }).then(unwrap),
});

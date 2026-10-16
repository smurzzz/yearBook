/* The app-facing API surface — one method per endpoint in
   docs/technical/api.md §2, typed with the shared DTOs (packages/shared).

   Screens never see URLs or envelopes: they call these methods and get DTOs
   or an ApiError. The HTTP adapter (http.ts) and the demo adapter (mock.ts)
   both implement this interface, which is what makes the flag swap a
   one-line change — and what makes the contract testable on both sides. */

import type {
  AdminPhotoDTO,
  AdminReportDTO,
  AdminTileDTO,
  EventDTO,
  NotificationDTO,
  ReportReason,
  ReportDTO,
  RejectionReason,
  Ref,
  StudentPhotoDTO,
  TileDTO,
  UserDTO,
} from "@yearbookhub/shared";

/* ------------------------------- envelopes ------------------------------ */

export interface List<T, M = Record<string, never>> {
  data: T[];
  next_cursor: string | null;
  meta?: M;
}

export interface SignedTarget {
  path: string;
  upload_url: string;
  token: string;
}

export interface UploadIntentItem {
  client_id: string;
  photo_id: string;
  original: SignedTarget;
  thumb: SignedTarget;
}

export interface UploadIntentsResult {
  batch_id: string;
  items: UploadIntentItem[];
}

export interface CompleteResultItem {
  photo_id: string;
  ok: boolean;
  /** e.g. UPLOAD_NOT_FOUND when the object never landed. */
  code?: string;
}

export interface Lookups {
  categories: Ref[];
  clubs: Ref[];
}

export interface MyPhotosMeta {
  photos: number;
  events: number;
  event_chips: Ref[];
}

export interface BrowseSummary {
  pending: number;
  approved: number;
  rejected: number;
}

export interface BrowseMeta {
  total: number;
  summary: BrowseSummary;
}

export interface AdminUserSummary {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  club: Ref | null;
  photo_count: number;
  event_count: number;
}

/* -------------------------------- inputs -------------------------------- */

export interface CreateMeInput {
  full_name: string;
  club_id?: string | null;
  consent: true;
  consent_version: string;
}

export interface PatchMeInput {
  full_name?: string;
  club_id?: string | null;
  notify_deadlines?: boolean;
  notify_reviews?: boolean;
}

export interface PushTokenInput {
  expo_token: string;
  platform: "android" | "ios";
}

export interface CreateEventInput {
  name: string;
  description: string;
  cover_key: string;
  deadline: string;
  max_photos: number;
  is_open: boolean;
}

export interface UploadFileInput {
  client_id: string;
  caption?: string;
  width: number;
  height: number;
  original_bytes: number;
  thumb_bytes: number;
}

export interface UploadIntentsInput {
  event_id: string;
  category_id: string;
  club_id?: string | null;
  consent: true;
  files: UploadFileInput[];
}

export interface PatchPhotoInput {
  caption?: string;
  category_id?: string;
  club_id?: string | null;
}

export interface CreateReportInput {
  reason: ReportReason;
  notes?: string;
}

export interface RejectInput {
  reason: RejectionReason;
  note?: string;
}

export interface PatchAdminPhotoInput {
  event_id?: string;
  category_id?: string;
  club_id?: string | null;
  caption?: string;
}

export interface ResolveReportInput {
  action: "remove" | "dismiss";
  note?: string;
}

/* -------------------------------- params -------------------------------- */

export interface PageParams {
  limit?: number;
  cursor?: string;
}

export interface MyPhotosParams extends PageParams {
  event_id?: string;
}

export interface ReviewQueueParams extends PageParams {
  event_id?: string;
}

export interface BrowseParams extends PageParams {
  status?: "pending" | "approved" | "rejected";
  event_id?: string;
  category_id?: string;
  club_id?: string;
  uploader_id?: string;
  q?: string;
  from?: string;
  to?: string;
  reported?: boolean;
  /** Filter-sheet live count: returns meta only. */
  count_only?: boolean;
}

export interface ReportsParams extends PageParams {
  status?: "open" | "resolved" | "all";
}

/* ------------------------------- interface ------------------------------ */

export interface ApiClient {
  health(): Promise<{ ok: boolean }>;

  /* account */
  getMe(): Promise<UserDTO>;
  createMe(input: CreateMeInput): Promise<UserDTO>;
  patchMe(input: PatchMeInput): Promise<UserDTO>;
  deleteMe(): Promise<void>;
  putPushToken(input: PushTokenInput): Promise<void>;
  deletePushToken(input: PushTokenInput): Promise<void>;

  /* lookups & events */
  lookups(): Promise<Lookups>;
  listEvents(params?: { q?: string }): Promise<List<EventDTO, { total?: number; accepting?: number }>>;
  getEvent(id: string): Promise<EventDTO>;
  createEvent(input: CreateEventInput): Promise<EventDTO>;
  updateEvent(id: string, input: Partial<CreateEventInput>): Promise<EventDTO>;
  deleteEvent(id: string): Promise<void>;

  /* upload */
  uploadIntents(input: UploadIntentsInput): Promise<UploadIntentsResult>;
  completeUploads(photoIds: string[]): Promise<{ results: CompleteResultItem[] }>;
  photoUploadUrl(photoId: string): Promise<{ original: SignedTarget; thumb: SignedTarget }>;

  /* student photos */
  myPhotos(params?: MyPhotosParams): Promise<List<TileDTO, MyPhotosMeta>>;
  getMyPhoto(id: string): Promise<StudentPhotoDTO>;
  patchMyPhoto(id: string, input: PatchPhotoInput): Promise<StudentPhotoDTO>;
  deleteMyPhoto(id: string): Promise<void>;
  replacePhoto(
    id: string,
    file: UploadFileInput,
  ): Promise<UploadIntentsResult>;
  createReport(photoId: string, input: CreateReportInput): Promise<ReportDTO>;

  /* notifications */
  notifications(params?: PageParams): Promise<List<NotificationDTO, { unread: number }>>;
  markAllNotificationsRead(): Promise<void>;
  markNotificationRead(id: string): Promise<void>;

  /* admin: review */
  reviewQueue(params?: ReviewQueueParams): Promise<List<AdminPhotoDTO, { total_pending: number }>>;
  reviewCount(): Promise<{ pending: number }>;
  approvePhoto(id: string): Promise<AdminPhotoDTO>;
  rejectPhoto(id: string, input: RejectInput): Promise<AdminPhotoDTO>;
  resetPhoto(id: string): Promise<AdminPhotoDTO>;

  /* admin: browse */
  adminPhotos(params?: BrowseParams): Promise<List<AdminTileDTO, BrowseMeta>>;
  adminPhoto(id: string): Promise<AdminPhotoDTO>;
  patchAdminPhoto(id: string, input: PatchAdminPhotoInput): Promise<AdminPhotoDTO>;
  deleteAdminPhoto(id: string): Promise<void>;
  adminUser(id: string): Promise<AdminUserSummary>;
  adminUserPhotos(id: string, params?: PageParams): Promise<List<AdminTileDTO, BrowseMeta>>;

  /* admin: removal requests */
  adminReports(params?: ReportsParams): Promise<List<AdminReportDTO>>;
  resolveReport(id: string, input: ResolveReportInput): Promise<AdminReportDTO>;
}

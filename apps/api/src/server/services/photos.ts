/* Student photos service (features/my-photos.md). Hard rules:
   - student DTOs NEVER include status (TC-AUTHZ-04);
   - ownership in SQL WHERE → foreign ids 404;
   - approved photos are locked (409 PHOTO_LOCKED);
   - deletes are storage-first (BR-08). */

import { LIMITS, REPORT_LABELS, REJECTION_LABELS } from "@yearbookhub/shared";
import type {
  AdminPhotoDTO,
  AdminTileDTO,
  Ref,
  StudentPhotoDTO,
  TileDTO,
} from "@yearbookhub/shared";
import { getDb, type Db } from "@/server/lib/db";
import { AppError, notFound } from "@/server/lib/errors";
import { decodeCursor, encodeCursor } from "@/server/lib/pagination";
import { deleteObjects, signDownloadUrl } from "@/server/lib/storage";
import {
  deletePhotoRow,
  selectAdminPhotoById,
  selectAdminSummary,
  selectAdminTiles,
  selectEventChips,
  selectMineTiles,
  selectOwnedPhoto,
  selectStudentDetail,
  selectStudentStats,
  updateAdminTags,
  updatePhotoTags,
  type AdminFilter,
} from "@/server/sql/photos";
import { resolveReport, selectOpenReportsForPhoto } from "@/server/sql/reports";
import { notifyReportResolved } from "./notifications";
import { createUploadIntents, type IntentFile, type UploadDeps } from "./uploads";

export interface StudentPhotoRow {
  id: string;
  caption: string;
  status: string;
  rejection_reason: string | null;
  rejection_note: string | null;
  width: number;
  height: number;
  thumb_path: string;
  original_path: string;
  created_at: string;
  event_id: string;
  event_name: string;
  category_id: string;
  category_name: string;
  club_id: string | null;
  club_name: string | null;
  batch_size: number;
  batch_id: string;
}

export interface TileRow {
  id: string;
  width: number;
  height: number;
  thumb_path: string;
  batch_id: string;
  created_at: string;
  event_id: string;
  event_name: string;
  batch_size: number;
}

const ref = (id: string, name: string): Ref => ({ id, name });

/** rejection label per spec BR-05 / REJECTION_LABELS; null unless rejected. */
export const toStudentDto = (
  row: StudentPhotoRow,
  urls: { thumb_url: string; original_url: string },
): StudentPhotoDTO => ({
  id: row.id,
  event: ref(row.event_id, row.event_name),
  category: ref(row.category_id, row.category_name),
  club: row.club_id ? ref(row.club_id, row.club_name ?? "") : null,
  caption: row.caption,
  created_at: row.created_at,
  width: Number(row.width),
  height: Number(row.height),
  batch_size: Number(row.batch_size),
  batch_id: row.batch_id,
  thumb_url: urls.thumb_url,
  original_url: urls.original_url,
  needs_replacement: row.status === "rejected",
  rejection:
    row.status === "rejected" && row.rejection_reason
      ? {
          reason: row.rejection_reason as keyof typeof REJECTION_LABELS,
          label: REJECTION_LABELS[row.rejection_reason as keyof typeof REJECTION_LABELS],
          note: row.rejection_note,
        }
      : null,
});

export const toTileDto = (row: TileRow, thumbUrl: string): TileDTO => ({
  id: row.id,
  thumb_url: thumbUrl,
  width: Number(row.width),
  height: Number(row.height),
  batch_size: Number(row.batch_size),
  batch_id: row.batch_id,
  event: ref(row.event_id, row.event_name),
  created_at: row.created_at,
});

export interface PhotoDeps extends UploadDeps {
  signDownloadUrl?: (path: string) => Promise<string>;
}

const signedOrUnavailable = async (sign: (path: string) => Promise<string>, path: string) => {
  try {
    return await sign(path);
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE", 503, "We couldn't reach storage. Please try again.");
  }
};

export interface MineResult {
  tiles: TileDTO[];
  nextCursor: string | null;
  meta: { photos: number; events: number; event_chips: Ref[] };
}

export async function listMine(
  uploaderId: string,
  query: { eventId: string | null; limit: number; cursor: string | null },
  deps: PhotoDeps = {},
): Promise<MineResult> {
  const db = deps.db ?? getDb();
  const sign = deps.signDownloadUrl ?? signDownloadUrl;

  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const parsedCursor =
    cursor && typeof cursor.t === "string" && typeof cursor.id === "string"
      ? { t: cursor.t, id: cursor.id }
      : null;

  const rows = (await selectMineTiles(db, {
    uploaderId,
    eventId: query.eventId,
    limit: query.limit + 1,
    cursor: parsedCursor,
  })) as unknown as TileRow[];

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const tiles: TileDTO[] = [];
  for (const row of page) tiles.push(toTileDto(row, await signedOrUnavailable(sign, row.thumb_path)));

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ t: last.created_at, id: last.id }) : null;

  const stats = (await selectStudentStats(db, uploaderId))[0] as
    | { photos: number; events: number }
    | undefined;
  const chips = (await selectEventChips(db, uploaderId)) as unknown as Array<{ id: string; name: string }>;

  return {
    tiles,
    nextCursor,
    meta: {
      photos: Number(stats?.photos ?? 0),
      events: Number(stats?.events ?? 0),
      event_chips: chips.map((c) => ref(c.id, c.name)),
    },
  };
}

export async function getStudentPhoto(
  uploaderId: string,
  photoId: string,
  deps: PhotoDeps = {},
): Promise<StudentPhotoDTO> {
  const db = deps.db ?? getDb();
  const sign = deps.signDownloadUrl ?? signDownloadUrl;
  const rows = (await selectStudentDetail(db, uploaderId, photoId)) as unknown as StudentPhotoRow[];
  const row = rows[0];
  if (!row) throw notFound();
  return toStudentDto(row, {
    thumb_url: await signedOrUnavailable(sign, row.thumb_path),
    original_url: await signedOrUnavailable(sign, row.original_path),
  });
}

/** Own-photo lookup for edit/delete: completed only, then the lock rule. */
async function requireEditable(
  uploaderId: string,
  photoId: string,
  db: Db,
): Promise<{ id: string; status: string; original_path: string; thumb_path: string }> {
  const rows = (await selectOwnedPhoto(db, uploaderId, photoId)) as unknown as Array<{
    id: string;
    status: string;
    completed: boolean;
    original_path: string;
    thumb_path: string;
  }>;
  const row = rows[0];
  if (!row || !row.completed) throw notFound();
  if (row.status === "approved") {
    throw new AppError("PHOTO_LOCKED", 409, "Approved photos can't be changed.");
  }
  return row;
}

/** PATCH /photos/:id — caption/category/club only (BR-12: never the event). */
export async function updateStudentPhoto(
  uploaderId: string,
  photoId: string,
  patch: { caption?: string; category_id?: string; club_id?: string | null },
  deps: PhotoDeps = {},
): Promise<StudentPhotoDTO> {
  const db = deps.db ?? getDb();
  await requireEditable(uploaderId, photoId, db);
  try {
    await updatePhotoTags(db, photoId, patch);
  } catch (err) {
    if ((err as { code?: string }).code === "23503") {
      throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
        fields: { category_id: "Unknown tag" },
      });
    }
    throw err;
  }
  return getStudentPhoto(uploaderId, photoId, deps);
}

/** DELETE /photos/:id — storage first (BR-08), then the row (reports keep snapshots). */
export async function deleteStudentPhoto(
  uploaderId: string,
  photoId: string,
  deps: PhotoDeps = {},
): Promise<void> {
  const db = deps.db ?? getDb();
  const removeObjects = deps.deleteObjects ?? deleteObjects;
  const row = await requireEditable(uploaderId, photoId, db);
  try {
    await removeObjects([row.original_path, row.thumb_path]);
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE", 503, "We couldn't delete the photo. Please try again.");
  }
  await deletePhotoRow(db, row.id);
}

/** POST /photos/:id/replace — only rejected photos (409 NOT_REPLACEABLE).
 *  New incomplete photo inherits event/category/club; old one dies on complete. */
export async function replacePhoto(
  uploaderId: string,
  photoId: string,
  file: IntentFile,
  deps: PhotoDeps = {},
): Promise<Awaited<ReturnType<typeof createUploadIntents>>> {
  const db = deps.db ?? getDb();
  const rows = (await selectOwnedPhoto(db, uploaderId, photoId)) as unknown as Array<{
    id: string;
    status: string;
    completed: boolean;
    event_id: string;
    category_id: string;
    club_id: string | null;
  }>;
  const row = rows[0];
  if (!row || !row.completed) throw notFound();
  if (row.status !== "rejected") {
    throw new AppError("NOT_REPLACEABLE", 409, "Only rejected photos can be replaced.");
  }
  // BR-01/BR-02(excluding this photo)/BR-09 run inside createUploadIntents.
  return createUploadIntents(
    {
      uploaderId,
      eventId: row.event_id,
      categoryId: row.category_id,
      clubId: row.club_id,
      files: [file],
      requireConsent: false,
      replacesPhotoId: row.id,
    },
    deps,
  );
}

export const MAX_MINE_LIMIT = LIMITS.PAGE_SIZE_MAX;

export interface AdminPhotoDeps {
  db?: Db;
  signDownloadUrl?: (path: string) => Promise<string>;
}

const signBoth = async (
  sign: (path: string) => Promise<string>,
  row: { thumb_path: string; original_path: string },
): Promise<{ thumb_url: string; original_url: string }> => {
  try {
    return { thumb_url: await sign(row.thumb_path), original_url: await sign(row.original_path) };
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE", 503, "We couldn't reach storage. Please try again.");
  }
};

export const toAdminPhotoDto = async (
  row: AdminPhotoRow,
  deps: AdminPhotoDeps = {},
): Promise<AdminPhotoDTO> =>
  toAdminDto(row, await signBoth(deps.signDownloadUrl ?? signDownloadUrl, row));

/** Full admin photo detail (with open_report) — review + browse share this. */
export async function getAdminPhoto(
  photoId: string,
  deps: AdminPhotoDeps = {},
): Promise<AdminPhotoDTO> {
  const db = deps.db ?? getDb();
  const rows = (await selectAdminPhotoById(db, photoId)) as unknown as AdminPhotoRow[];
  const row = rows[0];
  if (!row) throw notFound();
  return toAdminPhotoDto(row, deps);
}

/* ---------- Browse (admin all-photos, features/browse-and-filter.md) ---------- */

export interface AdminTileRow {
  id: string;
  width: number;
  height: number;
  thumb_path: string;
  status: string;
  caption: string;
  batch_id: string;
  batch_size: number;
  reported: boolean;
  created_at: string;
  uploader_id: string;
  uploader_name: string;
  uploader_email: string;
  uploader_avatar: string | null;
  uploader_club_id: string | null;
  uploader_club_name: string | null;
  event_id: string;
  event_name: string;
  category_id: string;
  category_name: string;
  club_id: string | null;
  club_name: string | null;
}

export const toAdminTileDto = (row: AdminTileRow, thumbUrl: string): AdminTileDTO => ({
  id: row.id,
  thumb_url: thumbUrl,
  width: Number(row.width),
  height: Number(row.height),
  batch_size: Number(row.batch_size),
  batch_id: row.batch_id,
  event: ref(row.event_id, row.event_name),
  created_at: row.created_at,
  status: row.status as AdminTileDTO["status"],
  reported: Boolean(row.reported),
  caption: row.caption,
  category: ref(row.category_id, row.category_name),
  club: row.club_id ? ref(row.club_id, row.club_name ?? "") : null,
  uploader: {
    id: row.uploader_id,
    full_name: row.uploader_name,
    email: row.uploader_email,
    avatar_url: row.uploader_avatar,
    club: row.uploader_club_id
      ? ref(row.uploader_club_id, row.uploader_club_name ?? "")
      : null,
  },
});

export type BrowseMeta = {
  total: number;
  summary: { pending: number; approved: number; rejected: number };
};

export interface BrowseResult {
  tiles: AdminTileDTO[];
  nextCursor: string | null;
  meta: BrowseMeta;
}

const toSummary = (rows: Array<{ status: string; n: number }>): BrowseMeta["summary"] => ({
  pending: Number(rows.find((r) => r.status === "pending")?.n ?? 0),
  approved: Number(rows.find((r) => r.status === "approved")?.n ?? 0),
  rejected: Number(rows.find((r) => r.status === "rejected")?.n ?? 0),
});

/** GET /admin/photos — filters AND-combined; `countOnly` skips the tile page. */
export async function listAdminPhotos(
  filter: AdminFilter,
  page: { limit: number; cursor: string | null },
  countOnly: boolean,
  deps: AdminPhotoDeps = {},
): Promise<BrowseResult> {
  const db = deps.db ?? getDb();
  const sign = deps.signDownloadUrl ?? signDownloadUrl;

  const cursor = page.cursor ? decodeCursor(page.cursor) : null;
  const parsedCursor =
    cursor && typeof cursor.t === "string" && typeof cursor.id === "string"
      ? { t: cursor.t, id: cursor.id }
      : null;

  const tiles: AdminTileDTO[] = [];
  let nextCursor: string | null = null;

  if (!countOnly) {
    const rows = (await selectAdminTiles(db, {
      ...filter,
      limit: page.limit + 1,
      cursor: parsedCursor,
    })) as unknown as AdminTileRow[];
    const hasMore = rows.length > page.limit;
    const batch = hasMore ? rows.slice(0, page.limit) : rows;
    for (const row of batch) {
      tiles.push(toAdminTileDto(row, await signedOrUnavailable(sign, row.thumb_path)));
    }
    const last = batch[batch.length - 1];
    nextCursor = hasMore && last ? encodeCursor({ t: last.created_at, id: last.id }) : null;
  }

  const summaryRows = (await selectAdminSummary(db, filter)) as unknown as Array<{
    status: string;
    n: number;
  }>;
  const summary = toSummary(summaryRows);
  return { tiles, nextCursor, meta: { total: summary.pending + summary.approved + summary.rejected, summary } };
}

/** PATCH /admin/photos/:id — admins may retag event/category/club/caption (BR-12). */
export async function updateAdminPhoto(
  photoId: string,
  patch: { event_id?: string; category_id?: string; club_id?: string | null; caption?: string },
  deps: AdminPhotoDeps = {},
): Promise<AdminPhotoDTO> {
  const db = deps.db ?? getDb();
  try {
    const updated = await updateAdminTags(db, photoId, patch);
    if (updated.length === 0) throw notFound();
  } catch (err) {
    if ((err as { code?: string }).code === "23503") {
      throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
        fields: { event_id: "Unknown tag" },
      });
    }
    throw err;
  }
  return getAdminPhoto(photoId, deps);
}

export interface AdminDeleteDeps extends AdminPhotoDeps {
  deleteObjects?: (paths: string[]) => Promise<void>;
}

/** DELETE /admin/photos/:id — storage first (BR-08); open reports are closed
 *  as removed and their reporters notified (removal-requests.md rules). */
export async function deleteAdminPhoto(
  photoId: string,
  adminId: string,
  deps: AdminDeleteDeps = {},
): Promise<void> {
  const db = deps.db ?? getDb();
  const removeObjects = deps.deleteObjects ?? deleteObjects;

  const rows = (await selectAdminPhotoById(db, photoId)) as unknown as AdminPhotoRow[];
  const photo = rows[0];
  if (!photo) throw notFound();

  try {
    await removeObjects([photo.original_path, photo.thumb_path]);
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE", 503, "We couldn't delete the photo. Please try again.");
  }

  const openReports = (await selectOpenReportsForPhoto(db, photoId)) as unknown as Array<{
    id: string;
    reporter_id: string;
  }>;
  for (const report of openReports) {
    await resolveReport(db, report.id, adminId, "removed", null);
    await notifyReportResolved({ reporterId: report.reporter_id, reportId: report.id, removed: true }, db);
  }

  await deletePhotoRow(db, photoId);
}

/* ---------- Admin DTO (review, browse) — status and uploader included ---------- */

export interface AdminPhotoRow {
  id: string;
  status: string;
  caption: string;
  width: number;
  height: number;
  thumb_path: string;
  original_path: string;
  rejection_reason: string | null;
  rejection_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  consent_confirmed_at: string;
  uploader_id: string;
  uploader_name: string;
  uploader_email: string;
  uploader_avatar: string | null;
  uploader_club_id: string | null;
  uploader_club_name: string | null;
  event_id: string;
  event_name: string;
  category_id: string;
  category_name: string;
  club_id: string | null;
  club_name: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  batch_size: number;
  batch_id: string;
  report_id: string | null;
  report_reporter_id: string | null;
  report_reporter_name: string | null;
  report_reason: string | null;
  report_notes: string | null;
  report_created_at: string | null;
}

/** Maps a joined admin row to AdminPhotoDTO; `open_report` null when none. */
export const toAdminDto = (
  row: AdminPhotoRow,
  urls: { thumb_url: string; original_url: string },
): AdminPhotoDTO => ({
  id: row.id,
  status: row.status as AdminPhotoDTO["status"],
  uploader: {
    id: row.uploader_id,
    full_name: row.uploader_name,
    email: row.uploader_email,
    avatar_url: row.uploader_avatar,
    club: row.uploader_club_id ? ref(row.uploader_club_id, row.uploader_club_name ?? "") : null,
  },
  event: ref(row.event_id, row.event_name),
  category: ref(row.category_id, row.category_name),
  club: row.club_id ? ref(row.club_id, row.club_name ?? "") : null,
  caption: row.caption,
  created_at: row.created_at,
  reviewed_at: row.reviewed_at,
  reviewed_by: row.reviewer_id ? { id: row.reviewer_id, full_name: row.reviewer_name ?? "" } : null,
  rejection:
    row.status === "rejected" && row.rejection_reason
      ? {
          reason: row.rejection_reason as keyof typeof REJECTION_LABELS,
          label: REJECTION_LABELS[row.rejection_reason as keyof typeof REJECTION_LABELS],
          note: row.rejection_note,
        }
      : null,
  consent_confirmed_at: row.consent_confirmed_at,
  width: Number(row.width),
  height: Number(row.height),
  batch_size: Number(row.batch_size),
  batch_id: row.batch_id,
  thumb_url: urls.thumb_url,
  original_url: urls.original_url,
  open_report: row.report_id
    ? {
        id: row.report_id,
        photo_id: row.id,
        reporter: { id: row.report_reporter_id ?? "", full_name: row.report_reporter_name ?? "" },
        reason: row.report_reason as keyof typeof REPORT_LABELS,
        reason_label: REPORT_LABELS[row.report_reason as keyof typeof REPORT_LABELS],
        notes: row.report_notes,
        status: "open",
        created_at: row.report_created_at ?? row.created_at,
        resolved_at: null,
      }
    : null,
});

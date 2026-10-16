/* Removal requests service (features/removal-requests.md):
   - BR-07: one open report per (photo, reporter) — DB index is the backstop;
   - BR-08: remove resolves storage first, then rows; reports keep snapshots;
   - removing a photo also resolves its other open reports as removed. */

import { REPORT_LABELS } from "@yearbookhub/shared";
import type { AdminReportDTO, ReportDTO, TileDTO } from "@yearbookhub/shared";
import { getDb, type Db } from "@/server/lib/db";
import { AppError, notFound } from "@/server/lib/errors";
import { decodeCursor, encodeCursor } from "@/server/lib/pagination";
import { deleteObjects } from "@/server/lib/storage";
import { deletePhotoRow, selectPhotoPathsById } from "@/server/sql/photos";
import {
  insertReport,
  resolveReport as resolveReportRow,
  selectOpenReportsForPhoto,
  selectReportById,
  selectReports,
  selectReportSource,
} from "@/server/sql/reports";
import { notifyReportResolved } from "./notifications";

export interface ReportRow {
  id: string;
  photo_id: string | null;
  reason: string;
  notes: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  reporter_id: string;
  reporter_name: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
  batch_size: number;
}

export interface ReportDeps {
  db?: Db;
  deleteObjects?: (paths: string[]) => Promise<void>;
}

const label = (reason: string): string =>
  REPORT_LABELS[reason as keyof typeof REPORT_LABELS] ?? reason;

/** ReportDTO core shared by student + admin responses. */
export const toReportDto = (row: ReportRow): ReportDTO => ({
  id: row.id,
  photo_id: row.photo_id,
  reporter: { id: row.reporter_id, full_name: row.reporter_name },
  reason: row.reason as ReportDTO["reason"],
  reason_label: label(row.reason),
  notes: row.notes,
  status: row.status as ReportDTO["status"],
  created_at: row.created_at,
  resolved_at: row.resolved_at,
});

/** Admin list item adds the photo tile (null once the photo is gone). */
export const toAdminReportDto = (row: ReportRow): AdminReportDTO => ({
  ...toReportDto(row),
  photo:
    row.photo_id && row.thumb_path && row.width && row.height
      ? ({
          id: row.photo_id,
          thumb_url: "", // signed by the caller (storage lives in routes/services)
          width: Number(row.width),
          height: Number(row.height),
          batch_size: Number(row.batch_size),
        } as TileDTO)
      : null,
});

/** POST /photos/:id/reports — own completed photo only (404 otherwise). */
export async function createReport(
  uploaderId: string,
  photoId: string,
  input: { reason: string; notes: string | null },
  deps: ReportDeps = {},
): Promise<ReportDTO> {
  const db = deps.db ?? getDb();

  const source = (await selectReportSource(db, uploaderId, photoId)) as unknown as Array<{
    id: string;
    caption: string;
    completed: boolean;
    event_name: string;
    uploader_name: string;
  }>;
  const photo = source[0];
  if (!photo || !photo.completed) throw notFound();

  let reportId: string;
  try {
    const inserted = await insertReport(db, {
      photoId,
      reporterId: uploaderId,
      reason: input.reason,
      notes: input.notes,
      snapshot: {
        event_name: photo.event_name,
        caption: photo.caption,
        uploader_name: photo.uploader_name,
      },
    });
    reportId = String((inserted[0] as { id: unknown }).id ?? "");
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      // reports_one_open_per_reporter → BR-07.
      throw new AppError(
        "REPORT_EXISTS",
        409,
        "You already requested removal of this photo.",
      );
    }
    throw err;
  }

  const rows = (await selectReportById(db, reportId)) as unknown as ReportRow[];
  return toReportDto(rows[0]);
}

export interface ReportListResult {
  reports: AdminReportDTO[];
  nextCursor: string | null;
}

export async function listReports(
  query: { status: string | null; limit: number; cursor: string | null },
  deps: ReportDeps & { signDownloadUrl?: (path: string) => Promise<string> } = {},
): Promise<ReportListResult> {
  const db = deps.db ?? getDb();

  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const parsedCursor =
    cursor && typeof cursor.t === "string" && typeof cursor.id === "string"
      ? { t: cursor.t, id: cursor.id }
      : null;

  const rows = (await selectReports(db, {
    status: query.status,
    limit: query.limit + 1,
    cursor: parsedCursor,
  })) as unknown as ReportRow[];

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  const sign = deps.signDownloadUrl;
  const reports: AdminReportDTO[] = [];
  for (const row of page) {
    const dto = toAdminReportDto(row);
    if (dto.photo && sign && row.thumb_path) {
      try {
        dto.photo.thumb_url = await sign(row.thumb_path);
      } catch {
        throw new AppError("SERVICE_UNAVAILABLE", 503, "We couldn't reach storage. Please try again.");
      }
    }
    reports.push(dto);
  }

  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ t: last.created_at, id: last.id }) : null;
  return { reports, nextCursor };
}

export interface ResolveInput {
  reportId: string;
  adminId: string;
  action: "remove" | "dismiss";
  note: string | null;
}

/** POST /admin/reports/:id/resolve — remove deletes the photo storage-first
 *  and closes every open report on it; dismiss only closes this report. */
export async function resolveReport(
  input: ResolveInput,
  deps: ReportDeps = {},
): Promise<ReportDTO> {
  const db = deps.db ?? getDb();
  const removeObjects = deps.deleteObjects ?? deleteObjects;

  const rows = (await selectReportById(db, input.reportId)) as unknown as ReportRow[];
  const report = rows[0];
  if (!report) throw notFound();
  if (report.status !== "open") {
    throw new AppError("REPORT_ALREADY_RESOLVED", 409, "This request was already handled.");
  }

  if (input.action === "dismiss") {
    const resolved = await resolveReportRow(db, input.reportId, input.adminId, "dismissed", input.note);
    if (resolved.length === 0) {
      throw new AppError("REPORT_ALREADY_RESOLVED", 409, "This request was already handled.");
    }
    await notifyReportResolved(
      { reporterId: report.reporter_id, reportId: input.reportId, removed: false },
      db,
    );
    const updated = (await selectReportById(db, input.reportId)) as unknown as ReportRow[];
    return toReportDto(updated[0]);
  }

  // remove: storage first (BR-08).
  if (report.photo_id) {
    const pathRows = (await selectPhotoPathsById(db, report.photo_id)) as unknown as Array<{
      original_path: string;
      thumb_path: string;
    }>;
    const objectPaths = pathRows.flatMap((r) => [r.original_path, r.thumb_path]);
    if (objectPaths.length > 0) {
      try {
        await removeObjects(objectPaths);
      } catch {
        throw new AppError(
          "SERVICE_UNAVAILABLE",
          503,
          "We couldn't delete the photo. Please try again.",
        );
      }
    }
  }

  // Every open report on the photo closes as removed, reporters notified.
  if (report.photo_id) {
    const openReports = (await selectOpenReportsForPhoto(db, report.photo_id)) as unknown as Array<{
      id: string;
      reporter_id: string;
    }>;
    for (const open of openReports) {
      await resolveReportRow(db, open.id, input.adminId, "removed", input.note);
      await notifyReportResolved(
        { reporterId: open.reporter_id, reportId: open.id, removed: true },
        db,
      );
    }
    await deletePhotoRow(db, report.photo_id); // FK keeps snapshots; photo_id → null
  } else {
    await resolveReportRow(db, input.reportId, input.adminId, "removed", input.note);
    await notifyReportResolved(
      { reporterId: report.reporter_id, reportId: input.reportId, removed: true },
      db,
    );
  }

  const updated = (await selectReportById(db, input.reportId)) as unknown as ReportRow[];
  return toReportDto(updated[0]);
}

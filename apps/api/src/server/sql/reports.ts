/* SQL for the reports aggregate. Parameterized only. */

import type { Db, Rows } from "@/server/lib/db";

/** Open reports on a photo (admin delete resolves them all as removed). */
export const selectOpenReportsForPhoto = (db: Db, photoId: string): Promise<Rows> =>
  db.unsafe(
    `select id, reporter_id from public.reports
     where photo_id = $1 and status = 'open'`,
    [photoId],
  );

/** Closing a report; 0 rows back means it was already resolved (409 backstop). */
export const resolveReport = (
  db: Db,
  reportId: string,
  adminId: string,
  status: "removed" | "dismissed",
  note: string | null,
): Promise<Rows> =>
  db.unsafe(
    `update public.reports
     set status = $2, resolution_note = $3, resolved_by = $4, resolved_at = now()
     where id = $1 and status = 'open'
     returning id`,
    [reportId, status, note, adminId],
  );

export interface InsertReportParams {
  photoId: string;
  reporterId: string;
  reason: string;
  notes: string | null;
  snapshot: { event_name: string; caption: string; uploader_name: string };
}

/** Plain insert — the one-open-per-reporter index (23505) is the backstop
 *  for REPORT_EXISTS (error-handling.md §3). */
export const insertReport = (db: Db, p: InsertReportParams): Promise<Rows> =>
  db.unsafe(
    `insert into public.reports (photo_id, reporter_id, reason, notes, photo_snapshot)
     values ($1, $2, $3, $4, $5::jsonb)
     returning id`,
    [p.photoId, p.reporterId, p.reason, p.notes, JSON.stringify(p.snapshot)],
  );

const REPORT_COLUMNS = `
  r.id, r.photo_id, r.reason, r.notes, r.status,
  r.created_at::text as created_at, r.resolved_at::text as resolved_at,
  rep.id as reporter_id, rep.full_name as reporter_name,
  p.thumb_path, p.width, p.height,
  p.batch_id::text as batch_id,
  p.created_at::text as photo_created_at,
  e.id as event_id, e.name as event_name,
  (select count(*) from public.photos b
     where b.batch_id = p.batch_id and b.upload_completed_at is not null)::int as batch_size`;

const REPORT_JOINS = `
  join public.users rep on rep.id = r.reporter_id
  left join public.photos p on p.id = r.photo_id
  left join public.events e on e.id = p.event_id`;

export const selectReportById = (db: Db, reportId: string): Promise<Rows> =>
  db.unsafe(
    `select ${REPORT_COLUMNS} from public.reports r ${REPORT_JOINS} where r.id = $1`,
    [reportId],
  );

export interface ReportsQuery {
  /** open (default) | resolved | all */
  status: string | null;
  limit: number;
  cursor: { t: string; id: string } | null;
}

/** Admin list, newest first; caller requests limit + 1. */
export const selectReports = (db: Db, q: ReportsQuery): Promise<Rows> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  // open is the default; "all" is the only unfiltered mode
  if (q.status === "resolved") conditions.push(`r.status <> 'open'`);
  else if (q.status !== "all") conditions.push(`r.status = 'open'`);
  if (q.cursor) {
    values.push(q.cursor.t, q.cursor.id);
    conditions.push(`(r.created_at, r.id) < ($1::timestamptz, $2::uuid)`);
  }
  values.push(q.limit);
  return db.unsafe(
    `select ${REPORT_COLUMNS} from public.reports r ${REPORT_JOINS}
     ${conditions.length ? `where ${conditions.join(" and ")}` : ""}
     order by r.created_at desc, r.id desc
     limit $${values.length}`,
    values,
  );
};

/** Photo source data for a student's own-photo report (snapshot + ownership). */
export const selectReportSource = (db: Db, uploaderId: string, photoId: string): Promise<Rows> =>
  db.unsafe(
    `select p.id, p.caption, p.upload_completed_at is not null as completed,
            e.name as event_name, u.full_name as uploader_name
     from public.photos p
     join public.events e on e.id = p.event_id
     join public.users u on u.id = p.uploader_id
     where p.id = $1 and p.uploader_id = $2`,
    [photoId, uploaderId],
  );

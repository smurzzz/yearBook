/* SQL for the photos aggregate (architecture.md §3). Parameterized only —
   postgres.js binds ${} placeholders as statement parameters. */

import type { Db, Rows } from "@/server/lib/db";
import { likePattern } from "./events";

export interface InsertPhotoParams {
  id: string;
  uploaderId: string;
  eventId: string;
  categoryId: string;
  clubId: string | null;
  clientId: string;
  batchId: string;
  caption: string;
  width: number;
  height: number;
  originalBytes: number;
  thumbBytes: number;
  consentAt: string;
  replacesPhotoId: string | null;
  originalPath: string;
  thumbPath: string;
}

/** Idempotent by (uploader_id, client_id): a retry returns no rows and the
 *  caller re-reads the existing row (error-handling.md §3 backstop). */
export const insertPhoto = (db: Db, p: InsertPhotoParams): Promise<Rows> =>
  db.unsafe(
    `insert into public.photos
       (id, uploader_id, event_id, category_id, club_id, client_id, batch_id, caption,
        width, height, original_bytes, thumb_bytes, consent_confirmed_at,
        replaces_photo_id, original_path, thumb_path)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     on conflict (uploader_id, client_id) do nothing
     returning id`,
    [
      p.id,
      p.uploaderId,
      p.eventId,
      p.categoryId,
      p.clubId,
      p.clientId,
      p.batchId,
      p.caption,
      p.width,
      p.height,
      p.originalBytes,
      p.thumbBytes,
      p.consentAt,
      p.replacesPhotoId,
      p.originalPath,
      p.thumbPath,
    ],
  );

export const selectByClient = (db: Db, uploaderId: string, clientId: string): Promise<Rows> =>
  db.unsafe(
    `select id, original_path, thumb_path, upload_completed_at is not null as completed
     from public.photos where uploader_id = $1 and client_id = $2`,
    [uploaderId, clientId],
  );

/** BR-02: completed photos plus in-flight (< 24 h), optionally excluding the
 *  photo being replaced. Excludes stale incomplete rows (cron cleans them). */
export const selectExistingForLimit = (
  db: Db,
  eventId: string,
  uploaderId: string,
  excludeId: string | null,
): Promise<Rows> =>
  db.unsafe(
    `select count(*)::int as existing from public.photos
     where event_id = $1 and uploader_id = $2
       and (upload_completed_at is not null or created_at > now() - interval '24 hours')
       and ($3::uuid is null or id <> $3::uuid)`,
    [eventId, uploaderId, excludeId],
  );

/** BR-09: total stored bytes = completed originals + thumbs. */
export const selectStoredBytes = (db: Db): Promise<Rows> =>
  db.unsafe(
    `select coalesce(sum(original_bytes + thumb_bytes), 0)::bigint as used
     from public.photos where upload_completed_at is not null`,
  );

export const PHOTO_BY_ID_COLUMNS = `
  p.id, p.uploader_id, p.event_id, p.category_id, p.club_id, p.caption, p.status,
  p.rejection_reason, p.rejection_note, p.replaces_photo_id,
  p.original_path, p.thumb_path,
  p.upload_completed_at is not null as completed`;

/** Owned-photo lookup for student routes; WHERE uploader_id enforces ownership. */
export const selectOwnedPhoto = (db: Db, uploaderId: string, photoId: string): Promise<Rows> =>
  db.unsafe(
    `select ${PHOTO_BY_ID_COLUMNS}
     from public.photos p where p.id = $1 and p.uploader_id = $2`,
    [photoId, uploaderId],
  );

export const selectPhotosByIds = (db: Db, uploaderId: string, photoIds: string[]): Promise<Rows> =>
  db.unsafe(
    `select ${PHOTO_BY_ID_COLUMNS}
     from public.photos p where p.uploader_id = $1 and p.id = any($2::uuid[])`,
    [uploaderId, photoIds],
  );

/** Any-photo lookup for admin routes and replace (no ownership filter). */
export const selectPhotoById = (db: Db, photoId: string): Promise<Rows> =>
  db.unsafe(`select ${PHOTO_BY_ID_COLUMNS} from public.photos p where p.id = $1`, [photoId]);

export const markCompleted = (db: Db, photoId: string): Promise<Rows> =>
  db.unsafe(`update public.photos set upload_completed_at = now() where id = $1 returning id`, [
    photoId,
  ]);

export const deletePhotoRow = (db: Db, photoId: string): Promise<Rows> =>
  db.unsafe(`delete from public.photos where id = $1 returning id`, [photoId]);

export const selectPhotoPathsById = (db: Db, photoId: string): Promise<Rows> =>
  db.unsafe(`select original_path, thumb_path from public.photos where id = $1`, [photoId]);

/** Cron cleanup candidates: incomplete uploads older than 24 h (TC-UP-18). */
export const selectIncompleteOlderThan = (db: Db, hours: number): Promise<Rows> =>
  db.unsafe(
    `select id, original_path, thumb_path from public.photos
     where upload_completed_at is null
       and created_at < now() - ($1 || ' hours')::interval
     order by created_at asc
     limit 500`,
    [String(hours)],
  );

export const deletePhotosByIds = (db: Db, photoIds: string[]): Promise<Rows> =>
  photoIds.length
    ? db.unsafe(`delete from public.photos where id = any($1::uuid[])`, [photoIds])
    : Promise.resolve([]);

const TILE_COLUMNS = `
  p.id, p.width, p.height, p.thumb_path,
  p.batch_id::text as batch_id,
  p.created_at::text as created_at,
  e.id as event_id, e.name as event_name,
  (select count(*) from public.photos b
     where b.batch_id = p.batch_id and b.upload_completed_at is not null)::int as batch_size`;

export interface MineQuery {
  uploaderId: string;
  eventId: string | null;
  limit: number;
  cursor: { t: string; id: string } | null;
}

/** My Photos grid: own completed only, newest first (api.md §3 GET /photos/mine).
 *  Caller requests limit + 1 to detect a next page. */
export const selectMineTiles = (db: Db, q: MineQuery): Promise<Rows> =>
  q.cursor
    ? db.unsafe(
        `select ${TILE_COLUMNS}
         from public.photos p
         join public.events e on e.id = p.event_id
         where p.uploader_id = $1 and p.upload_completed_at is not null
           and ($2::uuid is null or p.event_id = $2::uuid)
           and (p.created_at, p.id) < ($3::timestamptz, $4::uuid)
         order by p.created_at desc, p.id desc
         limit $5`,
        [q.uploaderId, q.eventId, q.cursor.t, q.cursor.id, q.limit],
      )
    : db.unsafe(
        `select ${TILE_COLUMNS}
         from public.photos p
         join public.events e on e.id = p.event_id
         where p.uploader_id = $1 and p.upload_completed_at is not null
           and ($2::uuid is null or p.event_id = $2::uuid)
         order by p.created_at desc, p.id desc
         limit $3`,
        [q.uploaderId, q.eventId, q.limit],
      );

/** Header stats: photos = completed own, events = distinct among them (TC-GAL-06). */
export const selectStudentStats = (db: Db, uploaderId: string): Promise<Rows> =>
  db.unsafe(
    `select count(*)::int as photos, count(distinct event_id)::int as events
     from public.photos
     where uploader_id = $1 and upload_completed_at is not null`,
    [uploaderId],
  );

/** Chips for events the student has completed photos in, school-year order. */
export const selectEventChips = (db: Db, uploaderId: string): Promise<Rows> =>
  db.unsafe(
    `select e.id, e.name from public.events e
     where exists (
       select 1 from public.photos p
       where p.event_id = e.id and p.uploader_id = $1 and p.upload_completed_at is not null)
     order by e.deadline asc, e.id`,
    [uploaderId],
  );

const DETAIL_COLUMNS = `
  p.id, p.caption, p.status, p.rejection_reason, p.rejection_note,
  p.width, p.height, p.thumb_path, p.original_path,
  p.batch_id::text as batch_id,
  p.created_at::text as created_at,
  e.id as event_id, e.name as event_name,
  c.id as category_id, c.name as category_name,
  cl.id as club_id, cl.name as club_name,
  (select count(*) from public.photos b
     where b.batch_id = p.batch_id and b.upload_completed_at is not null)::int as batch_size`;

/** Student detail with joined tag names; ownership in WHERE (foreign → no rows → 404). */
export const selectStudentDetail = (db: Db, uploaderId: string, photoId: string): Promise<Rows> =>
  db.unsafe(
    `select ${DETAIL_COLUMNS}
     from public.photos p
     join public.events e on e.id = p.event_id
     join public.categories c on c.id = p.category_id
     left join public.clubs cl on cl.id = p.club_id
     where p.id = $1 and p.uploader_id = $2 and p.upload_completed_at is not null`,
    [photoId, uploaderId],
  );

/* ---------- Admin review / browse ---------- */

export const ADMIN_PHOTO_COLUMNS = `
  p.id, p.status, p.caption, p.width, p.height, p.thumb_path, p.original_path,
  p.rejection_reason, p.rejection_note,
  p.batch_id::text as batch_id,
  p.created_at::text as created_at, p.reviewed_at::text as reviewed_at,
  p.consent_confirmed_at::text as consent_confirmed_at,
  u.id as uploader_id, u.full_name as uploader_name, u.email as uploader_email,
  u.avatar_url as uploader_avatar, u.club_id as uploader_club_id, uc.name as uploader_club_name,
  e.id as event_id, e.name as event_name,
  c.id as category_id, c.name as category_name,
  cl.id as club_id, cl.name as club_name,
  ru.id as reviewer_id, ru.full_name as reviewer_name,
  (select count(*) from public.photos b
     where b.batch_id = p.batch_id and b.upload_completed_at is not null)::int as batch_size,
  rep.id as report_id, rep.reporter_id as report_reporter_id,
  rep.reporter_name as report_reporter_name, rep.reason as report_reason,
  rep.notes as report_notes, rep.created_at as report_created_at`;

const ADMIN_JOINS = `
  join public.users u on u.id = p.uploader_id
  left join public.users ru on ru.id = p.reviewed_by
  left join public.clubs uc on uc.id = u.club_id
  join public.events e on e.id = p.event_id
  join public.categories c on c.id = p.category_id
  left join public.clubs cl on cl.id = p.club_id
  left join lateral (
    select r.id, r.reporter_id, r.reason, r.notes, r.created_at::text as created_at,
           ru2.full_name as reporter_name
    from public.reports r
    join public.users ru2 on ru2.id = r.reporter_id
    where r.photo_id = p.id and r.status = 'open'
    limit 1
  ) rep on true`;

export const selectAdminPhotoById = (db: Db, photoId: string): Promise<Rows> =>
  db.unsafe(
    `select ${ADMIN_PHOTO_COLUMNS} from public.photos p ${ADMIN_JOINS} where p.id = $1`,
    [photoId],
  );

export interface ReviewQueueQuery {
  eventId: string | null;
  limit: number;
  cursor: { t: string; id: string } | null;
}

/** Queue: pending + completed, oldest first (TC-REV-01). Caller passes limit + 1. */
export const selectReviewQueue = (db: Db, q: ReviewQueueQuery): Promise<Rows> => {
  const conditions = [
    `p.status = 'pending'`,
    `p.upload_completed_at is not null`,
    `($1::uuid is null or p.event_id = $1::uuid)`,
  ];
  const values: unknown[] = [q.eventId];
  if (q.cursor) {
    values.push(q.cursor.t, q.cursor.id);
    conditions.push(`(p.created_at, p.id) > ($${values.length - 1}::timestamptz, $${values.length}::uuid)`);
  }
  values.push(q.limit);
  return db.unsafe(
    `select ${ADMIN_PHOTO_COLUMNS}
     from public.photos p ${ADMIN_JOINS}
     where ${conditions.join(" and ")}
     order by p.created_at asc, p.id asc
     limit $${values.length}`,
    values,
  );
};

export const selectPendingCount = (db: Db): Promise<Rows> =>
  db.unsafe(
    `select count(*)::int as pending from public.photos
     where status = 'pending' and upload_completed_at is not null`,
  );

/** Review decisions: unconditional transitions (detail may change any status);
 *  reviewer fields set on approve/reject, cleared on reset (TC-BRW-07). */
export const approvePhoto = (db: Db, photoId: string, adminId: string): Promise<Rows> =>
  db.unsafe(
    `update public.photos
     set status = 'approved', reviewed_by = $2, reviewed_at = now(),
         rejection_reason = null, rejection_note = null
     where id = $1 returning id`,
    [photoId, adminId],
  );

export const rejectPhoto = (
  db: Db,
  photoId: string,
  adminId: string,
  reason: string,
  note: string | null,
): Promise<Rows> =>
  db.unsafe(
    `update public.photos
     set status = 'rejected', reviewed_by = $2, reviewed_at = now(),
         rejection_reason = $3, rejection_note = $4
     where id = $1 returning id`,
    [photoId, adminId, reason, note],
  );

export const resetPhoto = (db: Db, photoId: string): Promise<Rows> =>
  db.unsafe(
    `update public.photos
     set status = 'pending', reviewed_by = null, reviewed_at = null,
         rejection_reason = null, rejection_note = null
     where id = $1 returning id`,
    [photoId],
  );

/* ---------- Browse (admin all-photos) ---------- */

export interface AdminFilter {
  status: string | null;
  eventId: string | null;
  categoryId: string | null;
  clubId: string | null;
  uploaderId: string | null;
  /** caption or uploader name; LIKE wildcards escaped (TC-BRW-03, TC-SEC-01). */
  q: string | null;
  /** ISO bounds on created_at; `to` is exclusive (route pre-computes end of day). */
  from: string | null;
  to: string | null;
  reported: boolean;
}

/** AND-combined filters shared by tiles + summary (TC-BRW-02). */
export const adminFilterWhere = (f: AdminFilter): { where: string; values: unknown[] } => {
  const conditions = [`p.upload_completed_at is not null`];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace("?", `$${values.length}`));
  };
  if (f.status) add(`p.status = ?`, f.status);
  if (f.eventId) add(`p.event_id = ?::uuid`, f.eventId);
  if (f.categoryId) add(`p.category_id = ?::uuid`, f.categoryId);
  if (f.clubId) add(`p.club_id = ?::uuid`, f.clubId);
  if (f.uploaderId) add(`p.uploader_id = ?`, f.uploaderId);
  if (f.q) {
    values.push(likePattern(f.q));
    const p = `$${values.length}`;
    conditions.push(`(p.caption ilike ${p} escape '\\' or u.full_name ilike ${p} escape '\\')`);
  }
  if (f.from) add(`p.created_at >= ?::timestamptz`, f.from);
  if (f.to) add(`p.created_at < ?::timestamptz`, f.to);
  if (f.reported) {
    conditions.push(`exists (select 1 from public.reports r where r.photo_id = p.id and r.status = 'open')`);
  }
  return { where: conditions.join(" and "), values };
};

const TILE_ADMIN_COLUMNS = `
  p.id, p.width, p.height, p.thumb_path, p.status, p.caption,
  p.batch_id::text as batch_id,
  (select count(*) from public.photos b
     where b.batch_id = p.batch_id and b.upload_completed_at is not null)::int as batch_size,
  exists(select 1 from public.reports r where r.photo_id = p.id and r.status = 'open') as reported,
  p.created_at::text as created_at,
  u.id as uploader_id, u.full_name as uploader_name, u.email as uploader_email,
  u.avatar_url as uploader_avatar, u.club_id as uploader_club_id, uc.name as uploader_club_name,
  e.id as event_id, e.name as event_name,
  c.id as category_id, c.name as category_name,
  cl.id as club_id, cl.name as club_name`;

export interface AdminTilesQuery extends AdminFilter {
  limit: number;
  cursor: { t: string; id: string } | null;
}

/** Admin grid: newest first; caller requests limit + 1 (TC-BRW-01). */
export const selectAdminTiles = (db: Db, q: AdminTilesQuery): Promise<Rows> => {
  const { where, values } = adminFilterWhere(q);
  let sql = `select ${TILE_ADMIN_COLUMNS}
     from public.photos p
     join public.users u on u.id = p.uploader_id
     left join public.clubs uc on uc.id = u.club_id
     join public.events e on e.id = p.event_id
     join public.categories c on c.id = p.category_id
     left join public.clubs cl on cl.id = p.club_id
     where ${where}`;
  if (q.cursor) {
    values.push(q.cursor.t, q.cursor.id);
    sql += ` and (p.created_at, p.id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`;
  }
  values.push(q.limit);
  return db.unsafe(`${sql} order by p.created_at desc, p.id desc limit $${values.length}`, values);
};

/** Summary counts over the whole filtered set (TC-BRW-04). */
export const selectAdminSummary = (db: Db, f: AdminFilter): Promise<Rows> => {
  const { where, values } = adminFilterWhere(f);
  return db.unsafe(
    `select p.status, count(*)::int as n
     from public.photos p
     join public.users u on u.id = p.uploader_id
     where ${where}
     group by p.status`,
    values,
  );
};

/** Admin tag edits — may retarget the event (BR-12 fix "wrong event"). */
export const updateAdminTags = (
  db: Db,
  photoId: string,
  sets: { event_id?: string; category_id?: string; club_id?: string | null; caption?: string },
): Promise<Rows> => {
  const parts: string[] = [];
  const values: unknown[] = [photoId];
  for (const [key, column] of Object.entries({
    event_id: "event_id",
    category_id: "category_id",
    club_id: "club_id",
    caption: "caption",
  })) {
    const value = (sets as Record<string, unknown>)[key];
    if (value !== undefined) {
      values.push(value);
      parts.push(`${column} = $${values.length}`);
    }
  }
  if (parts.length === 0) return Promise.resolve([]);
  return db.unsafe(`update public.photos set ${parts.join(", ")} where id = $1 returning id`, values);
};

/** Whitelisted student tag edits (BR-12: no event_id — students can't retarget). */
export const updatePhotoTags = (
  db: Db,
  photoId: string,
  sets: { caption?: string; category_id?: string; club_id?: string | null },
): Promise<Rows> => {
  const parts: string[] = [];
  const values: unknown[] = [photoId];
  if (sets.caption !== undefined) {
    values.push(sets.caption);
    parts.push(`caption = $${values.length}`);
  }
  if (sets.category_id !== undefined) {
    values.push(sets.category_id);
    parts.push(`category_id = $${values.length}`);
  }
  if (sets.club_id !== undefined) {
    values.push(sets.club_id);
    parts.push(`club_id = $${values.length}`);
  }
  if (parts.length === 0) return Promise.resolve([]);
  return db.unsafe(`update public.photos set ${parts.join(", ")} where id = $1 returning id`, values);
};

/* SQL for the events aggregate (architecture.md §3: sql/ holds parameterized SQL).
   postgres.js binds ${} placeholders as statement parameters — never interpolate.
   The `viewerPlaceholder` argument is always a constant like "$1"/"$2", never input. */

import type { Db, Rows } from "@/server/lib/db";

/** photo_count = completed photos (admin); my_photo_count = caller's completed (student). */
const eventColumns = (viewerPlaceholder: string): string => `
  e.id, e.name, e.description, e.cover_key,
  e.deadline::text as deadline, e.max_photos, e.is_open,
  e.created_at::text as created_at,
  (select count(*) from public.photos p
     where p.event_id = e.id and p.upload_completed_at is not null)::int as photo_count,
  (select count(*) from public.photos p
     where p.event_id = e.id and p.upload_completed_at is not null
       and p.uploader_id = ${viewerPlaceholder})::int as my_photo_count`;

/** Escapes LIKE wildcards so q matches literally (TC-BRW-03-style search safety). */
export const likePattern = (term: string): string =>
  `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/** Full catalog, ordered effective-open first (deadline asc), then closed (deadline desc). */
export const selectEvents = (db: Db, viewerId: string, q: string | null): Promise<Rows> =>
  q === null
    ? db.unsafe(`select ${eventColumns("$1")} from public.events e order by
        case when e.is_open and e.deadline > now() then 0 else 1 end,
        case when e.is_open and e.deadline > now() then e.deadline end asc nulls last,
        case when e.is_open and e.deadline > now() then null else e.deadline end desc nulls last,
        e.id`, [viewerId])
    : db.unsafe(`select ${eventColumns("$1")} from public.events e
        where e.name ilike $2 escape '\\'
        order by
        case when e.is_open and e.deadline > now() then 0 else 1 end,
        case when e.is_open and e.deadline > now() then e.deadline end asc nulls last,
        case when e.is_open and e.deadline > now() then null else e.deadline end desc nulls last,
        e.id`, [viewerId, likePattern(q)]);

export const selectEventById = (db: Db, id: string, viewerId: string): Promise<Rows> =>
  db.unsafe(`select ${eventColumns("$2")} from public.events e where e.id = $1`, [id, viewerId]);

export interface InsertEventParams {
  name: string;
  description: string;
  coverKey: string;
  deadline: string;
  maxPhotos: number;
  isOpen: boolean;
  createdBy: string;
}

export const insertEvent = (db: Db, p: InsertEventParams): Promise<Rows> =>
  db.unsafe(
    `insert into public.events (name, description, cover_key, deadline, max_photos, is_open, created_by)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id`,
    [p.name, p.description, p.coverKey, p.deadline, p.maxPhotos, p.isOpen, p.createdBy],
  );

/** Whitelisted snake_case keys only — callers build from zod-parsed fields. */
export const updateEvent = (db: Db, id: string, patch: Record<string, unknown>): Promise<Rows> => {
  const keys = Object.keys(patch);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  return db.unsafe(`update public.events set ${sets} where id = $1 returning id`, [
    id,
    ...keys.map((k) => patch[k]),
  ]);
};

/** Storage-first delete needs every object path of the event's photos (api.md §3). */
export const selectPhotoPaths = (db: Db, eventId: string): Promise<Rows> =>
  db.unsafe(`select original_path, thumb_path from public.photos where event_id = $1`, [eventId]);

export const deleteEventRow = (db: Db, id: string): Promise<Rows> =>
  db.unsafe(`delete from public.events where id = $1`, [id]);

/** BR-11 cron candidates: open events whose deadline is within 48 h and that
 *  have not been reminded yet (idempotent — TC-NOT-03). */
export const selectEventsDueForReminder = (db: Db): Promise<Rows> =>
  db.unsafe(
    `select id, name, deadline::text as deadline
     from public.events
     where is_open
       and now() < deadline
       and deadline <= now() + interval '48 hours'
       and reminder_sent_at is null
     order by deadline asc`,
  );

export const setReminderSent = (db: Db, eventId: string): Promise<Rows> =>
  db.unsafe(`update public.events set reminder_sent_at = now() where id = $1 returning id`, [
    eventId,
  ]);

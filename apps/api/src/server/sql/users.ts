/* SQL for the users aggregate (architecture.md §3: sql/ holds parameterized SQL).
   postgres.js binds ${} placeholders as statement parameters — never interpolate. */

import type { Db, Rows } from "@/server/lib/db";

const USER_COLUMNS = `
  u.id, u.email, u.full_name, u.avatar_url, u.role, u.club_id,
  u.notify_deadlines, u.notify_reviews,
  u.consented_at::text as consented_at,
  c.name as club_name`;

export const selectUserById = (db: Db, id: string): Promise<Rows> =>
  db.unsafe(
    `select ${USER_COLUMNS}
     from public.users u
     left join public.clubs c on c.id = u.club_id
     where u.id = $1`,
    [id],
  );

export const selectIsAdminEmail = (db: Db, email: string): Promise<Rows> =>
  db.unsafe(`select exists(select 1 from public.admin_emails where email = $1) as is_admin`, [email]);

/** Whitelisted profile/prefs update (api.md §3 PATCH /me). */
export const updateUser = (
  db: Db,
  userId: string,
  sets: {
    full_name?: string;
    club_id?: string | null;
    notify_deadlines?: boolean;
    notify_reviews?: boolean;
  },
): Promise<Rows> => {
  const parts: string[] = [];
  const values: unknown[] = [userId];
  for (const [key, column] of Object.entries({
    full_name: "full_name",
    club_id: "club_id",
    notify_deadlines: "notify_deadlines",
    notify_reviews: "notify_reviews",
  })) {
    const value = (sets as Record<string, unknown>)[key];
    if (value !== undefined) {
      values.push(value);
      parts.push(`${column} = $${values.length}`);
    }
  }
  if (parts.length === 0) return db.unsafe(`select id from public.users where id = $1`, [userId]);
  return db.unsafe(`update public.users set ${parts.join(", ")} where id = $1 returning id`, values);
};

export const selectNotifyPrefs = (db: Db, userId: string): Promise<Rows> =>
  db.unsafe(
    `select notify_reviews, notify_deadlines from public.users where id = $1`,
    [userId],
  );

/** Reminder recipients: students only, toggle on (BR-11). */
export const selectReminderRecipients = (db: Db): Promise<Rows> =>
  db.unsafe(
    `select id from public.users where role = 'student' and notify_deadlines = true`,
  );

/** Every storage object of the user's photos (account deletion, BR-08). */
export const selectUserPhotoPaths = (db: Db, userId: string): Promise<Rows> =>
  db.unsafe(
    `select original_path, thumb_path from public.photos where uploader_id = $1`,
    [userId],
  );

/** Cascades photos/reports-filed/notifications/tokens (schema FKs). */
export const deleteUserRow = (db: Db, userId: string): Promise<Rows> =>
  db.unsafe(`delete from public.users where id = $1 returning id`, [userId]);

/** Admin uploader summary (api.md §3 GET /admin/users/:id). */
export const selectAdminUserSummary = (db: Db, userId: string): Promise<Rows> =>
  db.unsafe(
    `select u.id, u.full_name, u.email, u.avatar_url, u.club_id, c.name as club_name,
       (select count(*) from public.photos p
          where p.uploader_id = u.id and p.upload_completed_at is not null)::int as photo_count,
       (select count(distinct p.event_id) from public.photos p
          where p.uploader_id = u.id and p.upload_completed_at is not null)::int as event_count
     from public.users u
     left join public.clubs c on c.id = u.club_id
     where u.id = $1`,
    [userId],
  );

export interface InsertUserParams {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: "student" | "admin";
  clubId: string | null;
  consentedAt: string;
  consentVersion: string;
}

/** Idempotent by primary key: on conflict do nothing, so a race returns no rows. */
export const insertUser = (db: Db, p: InsertUserParams): Promise<Rows> =>
  db.unsafe(
    `insert into public.users (id, email, full_name, avatar_url, role, club_id, consented_at, consent_version)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do nothing
     returning id, email, full_name, avatar_url, role, club_id,
               notify_deadlines, notify_reviews, consented_at::text as consented_at`,
    [p.id, p.email, p.fullName, p.avatarUrl, p.role, p.clubId, p.consentedAt, p.consentVersion],
  );

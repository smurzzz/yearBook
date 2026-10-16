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

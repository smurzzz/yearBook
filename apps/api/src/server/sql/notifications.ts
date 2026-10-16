/* SQL for the notifications aggregate. Parameterized only. */

import type { Db, Rows } from "@/server/lib/db";

export interface InsertNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

export const insertNotification = (db: Db, p: InsertNotificationParams): Promise<Rows> =>
  db.unsafe(
    `insert into public.notifications (user_id, type, title, body, data)
     values ($1, $2, $3, $4, $5::jsonb)
     returning id`,
    [p.userId, p.type, p.title, p.body, JSON.stringify(p.data)],
  );

const NOTIFICATION_COLUMNS = `
  n.id, n.type, n.title, n.body, n.data,
  n.read_at is not null as read, n.created_at::text as created_at`;

export interface NotificationsQuery {
  userId: string;
  limit: number;
  cursor: { t: string; id: string } | null;
}

/** Own notifications, newest first; caller requests limit + 1. */
export const selectNotifications = (db: Db, q: NotificationsQuery): Promise<Rows> => {
  const conditions = [`n.user_id = $1`];
  const values: unknown[] = [q.userId];
  if (q.cursor) {
    values.push(q.cursor.t, q.cursor.id);
    conditions.push(`(n.created_at, n.id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`);
  }
  values.push(q.limit);
  return db.unsafe(
    `select ${NOTIFICATION_COLUMNS}
     from public.notifications n
     where ${conditions.join(" and ")}
     order by n.created_at desc, n.id desc
     limit $${values.length}`,
    values,
  );
};

export const selectUnreadCount = (db: Db, userId: string): Promise<Rows> =>
  db.unsafe(
    `select count(*)::int as unread from public.notifications
     where user_id = $1 and read_at is null`,
    [userId],
  );

export const markAllRead = (db: Db, userId: string): Promise<Rows> =>
  db.unsafe(
    `update public.notifications set read_at = now()
     where user_id = $1 and read_at is null`,
    [userId],
  );

/** 0 rows = not found or not owned → 404 (ownership enforced in SQL). */
export const markRead = (db: Db, userId: string, notificationId: string): Promise<Rows> =>
  db.unsafe(
    `update public.notifications set read_at = coalesce(read_at, now())
     where id = $1 and user_id = $2
     returning id`,
    [notificationId, userId],
  );

/* ---------- Push tokens ---------- */

export const selectTokensForUser = (db: Db, userId: string): Promise<Rows> =>
  db.unsafe(`select expo_token from public.push_tokens where user_id = $1`, [userId]);

/** Upsert by token: a device token is unique — reassignment moves it to the
 *  current user (api.md §3 PUT /me/push-token). */
export const upsertPushToken = (
  db: Db,
  p: { userId: string; expoToken: string; platform: string },
): Promise<Rows> =>
  db.unsafe(
    `insert into public.push_tokens (user_id, expo_token, platform)
     values ($1, $2, $3)
     on conflict (expo_token)
     do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now()
     returning id`,
    [p.userId, p.expoToken, p.platform],
  );

export const deletePushToken = (db: Db, userId: string, expoToken: string): Promise<Rows> =>
  db.unsafe(`delete from public.push_tokens where expo_token = $1 and user_id = $2`, [
    expoToken,
    userId,
  ]);

/** Pruning invalid devices (TC-NOT-06). */
export const deletePushTokens = (db: Db, expoTokens: string[]): Promise<Rows> =>
  expoTokens.length
    ? db.unsafe(`delete from public.push_tokens where expo_token = any($1::text[])`, [expoTokens])
    : Promise.resolve([]);

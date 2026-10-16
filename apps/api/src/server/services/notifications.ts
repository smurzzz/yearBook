/* Notifications service — rows are always inserted (even when push is off);
   copy is fixed per specification.md §11. Push delivery honors the per-user
   toggles (TC-NOT-04), prunes dead tokens (TC-NOT-06) and never fails the
   calling request (error-handling.md §3). */

import type { NotificationDTO } from "@yearbookhub/shared";
import { getDb, type Db } from "@/server/lib/db";
import { notFound } from "@/server/lib/errors";
import { decodeCursor, encodeCursor } from "@/server/lib/pagination";
import { sendPush, type PushMessage } from "@/server/lib/push";
import { manilaLabel } from "@/server/lib/time";
import { deleteObjects } from "@/server/lib/storage";
import { selectEventsDueForReminder, setReminderSent } from "@/server/sql/events";
import {
  deletePhotosByIds,
  selectIncompleteOlderThan,
} from "@/server/sql/photos";
import {
  deletePushTokens,
  insertNotification,
  markAllRead,
  markRead,
  selectNotifications,
  selectTokensForUser,
  selectUnreadCount,
} from "@/server/sql/notifications";
import { selectNotifyPrefs, selectReminderRecipients } from "@/server/sql/users";

/** Spec §11 copy table. `{event}` and `{reason}` are the only interpolations. */
export const notificationCopy = {
  photoNeedsReplacement: (event: string, reasonLabel: string) => ({
    title: "Photo needs replacing",
    body: `Your photo from ${event} needs a new photo: ${reasonLabel}.`,
  }),
  deadlineReminder: (event: string, deadline: string) => ({
    title: `${event} closes soon`,
    body: `${event} closes in 2 days. Upload your photos before ${deadline}.`,
  }),
  reportResolved: (removed: boolean) => ({
    title: "Removal request update",
    body: removed
      ? "Your removal request was approved and the photo was deleted."
      : "Your removal request was reviewed and the photo was kept.",
  }),
} as const;

export interface NotifyPhotoRejectionInput {
  uploaderId: string;
  photoId: string;
  eventName: string;
  reasonLabel: string;
}

/** BR-10: rejection → photo_needs_replacement row for the uploader. */
export async function notifyPhotoRejection(
  input: NotifyPhotoRejectionInput,
  db: Db = getDb(),
): Promise<string> {
  const copy = notificationCopy.photoNeedsReplacement(input.eventName, input.reasonLabel);
  const rows = await insertNotification(db, {
    userId: input.uploaderId,
    type: "photo_needs_replacement",
    title: copy.title,
    body: copy.body,
    data: { photo_id: input.photoId },
  });
  return String(rows[0]?.id ?? "");
}

export interface NotifyReportResolvedInput {
  reporterId: string;
  reportId: string;
  removed: boolean;
}

/** BR-10: report resolution → report_resolved row for the reporter. */
export async function notifyReportResolved(
  input: NotifyReportResolvedInput,
  db: Db = getDb(),
): Promise<string> {
  const copy = notificationCopy.reportResolved(input.removed);
  const rows = await insertNotification(db, {
    userId: input.reporterId,
    type: "report_resolved",
    title: copy.title,
    body: copy.body,
    data: { report_id: input.reportId },
  });
  return String(rows[0]?.id ?? "");
}

export interface NotifyDeadlineReminderInput {
  userId: string;
  eventId: string;
  eventName: string;
  deadline: string;
}

/** BR-11: deadline_reminder row for one student. */
export async function notifyDeadlineReminder(
  input: NotifyDeadlineReminderInput,
  db: Db = getDb(),
): Promise<string> {
  const copy = notificationCopy.deadlineReminder(input.eventName, input.deadline);
  const rows = await insertNotification(db, {
    userId: input.userId,
    type: "deadline_reminder",
    title: copy.title,
    body: copy.body,
    data: { event_id: input.eventId },
  });
  return String(rows[0]?.id ?? "");
}

/* ---------- In-app list ---------- */

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { photo_id?: string; event_id?: string; report_id?: string };
  read: boolean;
  created_at: string;
}

export const toNotificationDto = (row: NotificationRow): NotificationDTO => ({
  id: row.id,
  type: row.type as NotificationDTO["type"],
  title: row.title,
  body: row.body,
  data: row.data ?? {},
  read: Boolean(row.read),
  created_at: row.created_at,
});

export interface NotificationListResult {
  notifications: NotificationDTO[];
  nextCursor: string | null;
  unread: number;
}

export async function listNotifications(
  userId: string,
  query: { limit: number; cursor: string | null },
  db: Db = getDb(),
): Promise<NotificationListResult> {
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const parsedCursor =
    cursor && typeof cursor.t === "string" && typeof cursor.id === "string"
      ? { t: cursor.t, id: cursor.id }
      : null;

  const rows = (await selectNotifications(db, {
    userId,
    limit: query.limit + 1,
    cursor: parsedCursor,
  })) as unknown as NotificationRow[];

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page[page.length - 1];

  const unreadRows = await selectUnreadCount(db, userId);
  return {
    notifications: page.map(toNotificationDto),
    nextCursor: hasMore && last ? encodeCursor({ t: last.created_at, id: last.id }) : null,
    unread: Number(unreadRows[0]?.unread ?? 0),
  };
}

export async function markAllReadForUser(userId: string, db: Db = getDb()): Promise<void> {
  await markAllRead(db, userId);
}

/** Own notification only — foreign/unknown ids → 404 (TC: ownership in SQL). */
export async function markOneRead(
  userId: string,
  notificationId: string,
  db: Db = getDb(),
): Promise<void> {
  const rows = await markRead(db, userId, notificationId);
  if (rows.length === 0) throw notFound();
}

/* ---------- Push delivery ---------- */

export type Toggle = "notify_reviews" | "notify_deadlines";

export interface DeliverPushInput {
  userId: string;
  message: PushMessage;
  toggle: Toggle;
}

export interface DeliverPushDeps {
  db?: Db;
  sendPush?: typeof sendPush;
  deleteTokens?: (tokens: string[]) => Promise<void>;
}

export interface DeliverPushResult {
  delivered: number;
  skipped: boolean;
}

/** Toggle first (row already exists → TC-NOT-04), then tokens; dead tokens
 *  are pruned (TC-NOT-06). Never throws — push is best-effort. */
export async function deliverPush(
  input: DeliverPushInput,
  deps: DeliverPushDeps = {},
): Promise<DeliverPushResult> {
  const db = deps.db ?? getDb();
  const send = deps.sendPush ?? sendPush;

  const prefs = (await selectNotifyPrefs(db, input.userId))[0] as
    | { notify_reviews: boolean; notify_deadlines: boolean }
    | undefined;
  if (!prefs || !prefs[input.toggle]) return { delivered: 0, skipped: true };

  const tokenRows = (await selectTokensForUser(db, input.userId)) as Array<{ expo_token: string }>;
  if (tokenRows.length === 0) return { delivered: 0, skipped: true };

  const result = await send(
    tokenRows.map((t) => t.expo_token),
    input.message,
  );
  if (result.invalidTokens.length > 0) {
    const prune = deps.deleteTokens ?? ((tokens: string[]) => deletePushTokens(db, tokens).then(() => undefined));
    await prune(result.invalidTokens);
  }
  return { delivered: result.delivered, skipped: false };
}

/* ---------- Daily cron ---------- */

export interface CronDeps extends DeliverPushDeps {
  deleteObjects?: (paths: string[]) => Promise<void>;
}

export interface CronResult {
  reminders_sent: number;
  events_notified: number;
  cleaned: number;
}

/** GET /api/cron/daily — BR-11 reminders (once per event) + incomplete-upload
 *  cleanup (> 24 h). Idempotent: reminder_sent_at guards re-runs (TC-NOT-03). */
export async function runDailyCron(deps: CronDeps = {}): Promise<CronResult> {
  const db = deps.db ?? getDb();
  const removeObjects = deps.deleteObjects ?? deleteObjects;

  const events = (await selectEventsDueForReminder(db)) as unknown as Array<{
    id: string;
    name: string;
    deadline: string;
  }>;

  let remindersSent = 0;
  for (const event of events) {
    const recipients = (await selectReminderRecipients(db)) as Array<{ id: string }>;
    const deadlineLabel = manilaLabel(event.deadline);
    for (const recipient of recipients) {
      const copy = notificationCopy.deadlineReminder(event.name, deadlineLabel);
      await insertNotification(db, {
        userId: recipient.id,
        type: "deadline_reminder",
        title: copy.title,
        body: copy.body,
        data: { event_id: event.id },
      });
      await deliverPush(
        {
          userId: recipient.id,
          message: { title: copy.title, body: copy.body, data: { event_id: event.id } },
          toggle: "notify_deadlines",
        },
        deps,
      );
      remindersSent += 1;
    }
    await setReminderSent(db, event.id);
  }

  const stale = (await selectIncompleteOlderThan(db, 24)) as unknown as Array<{
    id: string;
    original_path: string;
    thumb_path: string;
  }>;
  let cleaned = 0;
  if (stale.length > 0) {
    const paths = stale.flatMap((p) => [p.original_path, p.thumb_path]);
    try {
      await removeObjects(paths); // storage-first (BR-08); on failure keep rows
      await deletePhotosByIds(db, stale.map((p) => p.id));
      cleaned = stale.length;
    } catch {
      // best-effort: next cron retries
    }
  }

  return { reminders_sent: remindersSent, events_notified: events.length, cleaned };
}

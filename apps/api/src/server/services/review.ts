/* Review service (features/review-workflow.md): queue ordering, BR-05 reject
   rules, notification on reject (BR-10). Transitions are unconditional so the
   Admin Photo Detail can move any status (TC-REV-11: concurrent decisions are
   last-write-wins, never a crash). */

import { REJECTION_LABELS } from "@yearbookhub/shared";
import type { AdminPhotoDTO } from "@yearbookhub/shared";
import { after } from "next/server";
import { getDb } from "@/server/lib/db";
import { AppError, notFound } from "@/server/lib/errors";
import { decodeCursor, encodeCursor } from "@/server/lib/pagination";
import {
  approvePhoto,
  rejectPhoto,
  resetPhoto,
  selectAdminPhotoById,
  selectPendingCount,
  selectReviewQueue,
} from "@/server/sql/photos";
import { deliverPush, notifyPhotoRejection, notificationCopy } from "./notifications";
import { getAdminPhoto, toAdminPhotoDto, type AdminPhotoDeps } from "./photos";
import type { AdminPhotoRow } from "./photos";

export type ReviewDeps = AdminPhotoDeps & {
  /** Post-response scheduler (Next after() in production; tests capture it). */
  schedule?: (fn: () => Promise<void>) => void;
};

/** after() in production; outside a request scope (tests) run inline. */
const defaultSchedule = (fn: () => Promise<void>): void => {
  try {
    after(fn);
  } catch {
    void fn();
  }
};

export async function getReviewablePhoto(
  photoId: string,
  deps: ReviewDeps = {},
): Promise<{ row: AdminPhotoRow; dto: AdminPhotoDTO }> {
  const db = deps.db ?? getDb();
  const rows = (await selectAdminPhotoById(db, photoId)) as unknown as AdminPhotoRow[];
  const row = rows[0];
  if (!row) throw notFound();
  return { row, dto: await toAdminPhotoDto(row, deps) };
}

export interface QueueResult {
  photos: AdminPhotoDTO[];
  nextCursor: string | null;
  totalPending: number;
}

export async function listReviewQueue(
  query: { eventId: string | null; limit: number; cursor: string | null },
  deps: ReviewDeps = {},
): Promise<QueueResult> {
  const db = deps.db ?? getDb();

  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const parsedCursor =
    cursor && typeof cursor.t === "string" && typeof cursor.id === "string"
      ? { t: cursor.t, id: cursor.id }
      : null;

  const rows = (await selectReviewQueue(db, {
    eventId: query.eventId,
    limit: query.limit + 1,
    cursor: parsedCursor,
  })) as unknown as AdminPhotoRow[];

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const photos: AdminPhotoDTO[] = [];
  for (const row of page) photos.push(await toAdminPhotoDto(row, deps));

  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ t: last.created_at, id: last.id }) : null;

  const countRows = await selectPendingCount(db);
  const totalPending = Number(countRows[0]?.pending ?? 0);

  return { photos, nextCursor, totalPending };
}

export async function pendingCount(deps: ReviewDeps = {}): Promise<number> {
  const db = deps.db ?? getDb();
  const rows = await selectPendingCount(db);
  return Number(rows[0]?.pending ?? 0);
}

export type Decision = "approve" | "reject" | "reset";

export interface DecideInput {
  photoId: string;
  adminId: string;
  action: Decision;
  reason?: string;
  note?: string | null;
}

/** Approve / reject / reset (api.md §3). Reject inserts the uploader's
 *  notification row before the response (push fires after via after()). */
export async function decide(input: DecideInput, deps: ReviewDeps = {}): Promise<AdminPhotoDTO> {
  const db = deps.db ?? getDb();

  const { row: photo } = await getReviewablePhoto(input.photoId, deps);

  if (input.action === "approve") {
    await approvePhoto(db, input.photoId, input.adminId);
  } else if (input.action === "reset") {
    await resetPhoto(db, input.photoId);
  } else {
    if (!input.reason) {
      throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
        fields: { reason: "Choose a reason." },
      });
    }
    await rejectPhoto(db, input.photoId, input.adminId, input.reason, input.note ?? null);
    // BR-10: one notification per transition into rejected (no dupes on re-reject).
    if (photo.status !== "rejected") {
      await notifyPhotoRejection(
        {
          uploaderId: photo.uploader_id,
          photoId: photo.id,
          eventName: photo.event_name,
          reasonLabel: REJECTION_LABELS[input.reason as keyof typeof REJECTION_LABELS] ?? input.reason,
        },
        db,
      );
      // Push after the response (architecture.md §3); toggle honored inside.
      const reasonLabel =
        REJECTION_LABELS[input.reason as keyof typeof REJECTION_LABELS] ?? input.reason;
      const copy = notificationCopy.photoNeedsReplacement(photo.event_name, reasonLabel);
      const schedule = deps.schedule ?? defaultSchedule;
      schedule(async () => {
        await deliverPush(
          {
            userId: photo.uploader_id,
            message: { ...copy, data: { photo_id: photo.id } },
            toggle: "notify_reviews",
          },
          { db },
        );
      });
    }
  }

  return getAdminPhoto(input.photoId, deps);
}

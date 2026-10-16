/* Upload service — BR-01…BR-04, BR-09 rules in api.md §3 validation order.
   createUploadIntents is shared by POST /photos/upload-intents and (5c) replace. */

import { randomUUID } from "node:crypto";
import { LIMITS } from "@yearbookhub/shared";
import { getDb, type Db } from "@/server/lib/db";
import { env } from "@/server/lib/env";
import { AppError, notFound } from "@/server/lib/errors";
import { deleteObjects, objectExists, signUploadUrl } from "@/server/lib/storage";
import {
  deletePhotoRow,
  insertPhoto,
  markCompleted,
  selectByClient,
  selectExistingForLimit,
  selectOwnedPhoto,
  selectPhotosByIds,
  selectStoredBytes,
} from "@/server/sql/photos";
import { selectEventById } from "@/server/sql/events";
import { effectiveStatus } from "./events";

export interface IntentFile {
  client_id: string;
  caption?: string;
  width: number;
  height: number;
  original_bytes: number;
  thumb_bytes: number;
}

export interface SignedTarget {
  path: string;
  upload_url: string;
  token: string;
}

export interface IntentItem {
  client_id: string;
  photo_id: string;
  original: SignedTarget;
  thumb: SignedTarget;
}

export interface IntentResult {
  batch_id: string;
  items: IntentItem[];
}

export interface CreateIntentsInput {
  uploaderId: string;
  eventId: string;
  categoryId: string;
  clubId: string | null;
  files: IntentFile[];
  /** intents body carries consent (BR-04); replace body does not. */
  consent?: boolean;
  requireConsent: boolean;
  replacesPhotoId?: string;
}

export interface UploadDeps {
  db?: Db;
  signUploadUrl?: (path: string) => Promise<SignedTarget>;
  objectExists?: (path: string) => Promise<boolean>;
  deleteObjects?: (paths: string[]) => Promise<void>;
}

const storageUnavailable = () =>
  new AppError("SERVICE_UNAVAILABLE", 503, "We couldn't reach storage. Please try again.");

/**
 * Ordered checks (api.md §3): event exists → batch size → consent → event open →
 * BR-02 limit → byte caps → BR-09 quota. Then idempotent insert + signed URLs.
 */
export async function createUploadIntents(
  input: CreateIntentsInput,
  deps: UploadDeps = {},
): Promise<IntentResult> {
  const db = deps.db ?? getDb();
  const sign = deps.signUploadUrl ?? signUploadUrl;

  // 1. Event exists (NOT_FOUND).
  const eventRows = (await selectEventById(db, input.eventId, input.uploaderId)) as unknown as Array<{
    id: string;
    is_open: boolean;
    deadline: string;
    max_photos: number;
  }>;
  const event = eventRows[0];
  if (!event) throw notFound();

  // 2. Batch size (BATCH_TOO_LARGE / VALIDATION_ERROR).
  if (input.files.length === 0) {
    throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
      fields: { files: "Add at least one photo." },
    });
  }
  if (input.files.length > LIMITS.MAX_PHOTOS_PER_BATCH) {
    throw new AppError("BATCH_TOO_LARGE", 422, "You can upload up to 20 photos at a time.", {
      max: LIMITS.MAX_PHOTOS_PER_BATCH,
    });
  }

  // 3. Consent (BR-04 → CONSENT_REQUIRED).
  if (input.requireConsent && input.consent !== true) {
    throw new AppError(
      "CONSENT_REQUIRED",
      422,
      "Please confirm you have permission to share these photos.",
    );
  }

  // 4. Event open (BR-01 → EVENT_CLOSED; at the deadline second → closed).
  if (effectiveStatus(event.is_open, event.deadline) !== "open") {
    throw new AppError("EVENT_CLOSED", 409, "This event is closed.", {
      deadline: event.deadline,
    });
  }

  // 5. Per-event limit (BR-02 → PHOTO_LIMIT_REACHED).
  const limitRows = await selectExistingForLimit(
    db,
    input.eventId,
    input.uploaderId,
    input.replacesPhotoId ?? null,
  );
  const existing = Number(limitRows[0]?.existing ?? 0);
  const max = Number(event.max_photos);
  if (existing + input.files.length > max) {
    throw new AppError(
      "PHOTO_LIMIT_REACHED",
      409,
      "You've reached this event's photo limit.",
      { max, existing, remaining: Math.max(0, max - existing) },
    );
  }

  // 6. Byte caps (BR-03 → PAYLOAD_TOO_LARGE).
  const oversized = input.files.find(
    (f) =>
      f.original_bytes > LIMITS.ORIGINAL_MAX_BYTES || f.thumb_bytes > LIMITS.THUMB_MAX_BYTES,
  );
  if (oversized) {
    throw new AppError("PAYLOAD_TOO_LARGE", 413, "Photo too large.", {
      original_max: LIMITS.ORIGINAL_MAX_BYTES,
      thumb_max: LIMITS.THUMB_MAX_BYTES,
    });
  }

  // 7. Storage quota (BR-09 → STORAGE_QUOTA_EXCEEDED).
  const quotaRows = await selectStoredBytes(db);
  const used = Number(quotaRows[0]?.used ?? 0);
  if (used >= env().STORAGE_SOFT_LIMIT_BYTES) {
    throw new AppError("STORAGE_QUOTA_EXCEEDED", 507, "We're out of storage space. Please try again later.", {
      used,
      limit: env().STORAGE_SOFT_LIMIT_BYTES,
    });
  }

  // Insert rows (idempotent by client_id) and sign 2 URLs per photo.
  const batchId = randomUUID();
  const consentAt = new Date().toISOString();
  const items: IntentItem[] = [];

  for (const file of input.files) {
    const photoId = randomUUID();
    let originalPath = `originals/${input.eventId}/${input.uploaderId}/${photoId}.jpg`;
    let thumbPath = `thumbs/${input.eventId}/${input.uploaderId}/${photoId}.jpg`;
    let id: string = photoId;

    try {
      const inserted = await insertPhoto(db, {
        id: photoId,
        uploaderId: input.uploaderId,
        eventId: input.eventId,
        categoryId: input.categoryId,
        clubId: input.clubId,
        clientId: file.client_id,
        batchId,
        caption: file.caption ?? "",
        width: file.width,
        height: file.height,
        originalBytes: file.original_bytes,
        thumbBytes: file.thumb_bytes,
        consentAt,
        replacesPhotoId: input.replacesPhotoId ?? null,
        originalPath,
        thumbPath,
      });

      if (inserted.length === 0) {
        // Idempotent retry — the existing row wins (same paths, same photo_id).
        const existingRows = await selectByClient(db, input.uploaderId, file.client_id);
        const row = existingRows[0] as { id: string; original_path: string; thumb_path: string } | undefined;
        if (!row) throw new AppError("INTERNAL", 500, "Something went wrong. Please try again.");
        id = row.id;
        originalPath = row.original_path;
        thumbPath = row.thumb_path;
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "23503") {
        throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
          fields: { category_id: "Unknown tag" },
        });
      }
      throw err;
    }

    try {
      items.push({
        client_id: file.client_id,
        photo_id: id,
        original: await sign(originalPath),
        thumb: await sign(thumbPath),
      });
    } catch {
      throw storageUnavailable();
    }
  }

  return { batch_id: batchId, items };
}

export interface CompleteResult {
  photo_id: string;
  ok: boolean;
  code?: "UPLOAD_NOT_FOUND" | "NOT_FOUND";
}

/**
 * POST /photos/complete — verify objects, set upload_completed_at, and on a
 * replacement delete the old photo storage-first (BR-08). Partial success normal.
 */
export async function completeUploads(
  uploaderId: string,
  photoIds: string[],
  deps: UploadDeps = {},
): Promise<CompleteResult[]> {
  const db = deps.db ?? getDb();
  const exists = deps.objectExists ?? objectExists;
  const removeObjects = deps.deleteObjects ?? deleteObjects;
  const results: CompleteResult[] = [];

  for (const photoId of photoIds) {
    const rows = (await selectPhotosByIds(db, uploaderId, [photoId])) as unknown as Array<{
      id: string;
      original_path: string;
      thumb_path: string;
      completed: boolean;
      replaces_photo_id: string | null;
    }>;
    const photo = rows[0];
    if (!photo) {
      results.push({ photo_id: photoId, ok: false, code: "NOT_FOUND" });
      continue;
    }
    if (photo.completed) {
      results.push({ photo_id: photoId, ok: true }); // idempotent
      continue;
    }

    let originalOk: boolean;
    let thumbOk: boolean;
    try {
      originalOk = await exists(photo.original_path);
      thumbOk = await exists(photo.thumb_path);
    } catch {
      throw storageUnavailable();
    }
    if (!originalOk || !thumbOk) {
      results.push({ photo_id: photoId, ok: false, code: "UPLOAD_NOT_FOUND" });
      continue;
    }

    // Replacement: delete the old photo storage-first, then complete the new one.
    if (photo.replaces_photo_id) {
      const oldRows = (await selectOwnedPhoto(db, uploaderId, photo.replaces_photo_id)) as unknown as Array<{
        id: string;
        original_path: string;
        thumb_path: string;
      }>;
      const old = oldRows[0];
      if (old) {
        try {
          await removeObjects([old.original_path, old.thumb_path]);
        } catch {
          throw storageUnavailable(); // BR-08: keep rows, retry-safe
        }
        await deletePhotoRow(db, old.id);
      }
    }

    await markCompleted(db, photoId);
    results.push({ photo_id: photoId, ok: true });
  }

  return results;
}

/** POST /photos/:id/upload-url — fresh signed URLs for an own incomplete photo. */
export async function freshUploadUrls(
  uploaderId: string,
  photoId: string,
  deps: UploadDeps = {},
): Promise<{ original: SignedTarget; thumb: SignedTarget }> {
  const db = deps.db ?? getDb();
  const sign = deps.signUploadUrl ?? signUploadUrl;

  const rows = (await selectOwnedPhoto(db, uploaderId, photoId)) as unknown as Array<{
    id: string;
    completed: boolean;
    original_path: string;
    thumb_path: string;
  }>;
  const photo = rows[0];
  if (!photo) throw notFound();
  if (photo.completed) {
    throw new AppError("ALREADY_COMPLETE", 409, "This photo is already uploaded.");
  }

  try {
    return {
      original: await sign(photo.original_path),
      thumb: await sign(photo.thumb_path),
    };
  } catch {
    throw storageUnavailable();
  }
}

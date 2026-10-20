/* Upload pipeline — features/photo-upload.md, api.md §3, tasks T-041/T-044.

   The real thing, in the order the API documents:

     1. POST /photos/upload-intents — the server validates the batch (event
        open, consent, per-event limit, byte caps) and answers with one
        signed upload URL pair per photo. The call is idempotent by
        `client_id`, so a retry of a failed photo reuses the same id and
        gets the same photo_id back with fresh URLs.
     2. PUT the bytes to storage — the API never sees the photo bytes.
     3. POST /photos/complete — the server checks that both objects landed
        and flips the rows to "pending" for the committee. Partial success
        is normal: the answer is per photo, not per batch.

   Three photos upload at a time (T-044) and every photo reports its own
   progress, so a slow connection slows one row instead of the batch. */

import { api } from "./index";
import type { SignedTarget } from "./endpoints";
import { putSignedFile } from "../lib/upload-binary";
import type { UploadFileRef } from "../prototype/types";

/** How many photos are on the wire at the same time. */
export const UPLOAD_CONCURRENCY = 3;

export type UploadStage = "waiting" | "compressing" | "uploading" | "done" | "failed";

export interface UploadCandidate {
  /** Id of the row in the upload draft. */
  id: string;
  /** Idempotency key (uuid) — stable across retries of the same photo. */
  clientId: string;
  caption: string;
  original: UploadFileRef;
  thumb: UploadFileRef;
}

export interface UploadOutcome {
  id: string;
  photoId?: string;
  ok: boolean;
  code?: string;
}

export type PutFile = typeof putSignedFile;

export interface UploadBatchParams {
  items: UploadCandidate[];
  eventId: string;
  categoryId: string;
  clubId: string | null;
  /** The API only accepts a batch the student confirmed (api.md §3). */
  consent: true;
  concurrency?: number;
  /** Per-photo progress for the upload sheet. */
  onStage?: (id: string, stage: UploadStage, progress: number, note?: string) => void;
  /** Injected in tests; defaults to the real signed PUT. */
  putFile?: PutFile;
  signal?: AbortSignal;
}

interface IntentItem {
  client_id: string;
  photo_id: string;
  original: SignedTarget;
  thumb: SignedTarget;
}

/** Run tasks with a fixed number of workers, preserving the input order in
 *  the result. Each task handles its own failure — one broken photo must
 *  never cancel the rest of the batch. A task that throws anyway is
 *  collected: the other workers still finish, and the first error is
 *  re-thrown once the batch is done. */
export const runWithConcurrency = async <T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> => {
  const results = new Array<T>(tasks.length);
  const errors: unknown[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= tasks.length) return;
      try {
        results[index] = await tasks[index]();
      } catch (error) {
        errors.push(error);
      }
    }
  });
  await Promise.all(workers);
  if (errors.length) throw errors[0];
  return results;
};

const uploadOne = async (
  candidate: UploadCandidate,
  intent: IntentItem,
  putFile: PutFile,
  onStage: UploadBatchParams["onStage"],
  signal?: AbortSignal,
): Promise<UploadOutcome> => {
  onStage?.(candidate.id, "uploading", 0);
  try {
    /* The original carries most of the bytes, the thumb is small: the two
       share one 0…100 progress bar (60 % / 40 %). */
    await putFile({
      target: intent.original,
      uri: candidate.original.uri,
      mimeType: "image/jpeg",
      signal,
      onProgress: (fraction) =>
        onStage?.(candidate.id, "uploading", Math.min(60, Math.round(fraction * 60))),
    });
    await putFile({
      target: intent.thumb,
      uri: candidate.thumb.uri,
      mimeType: "image/jpeg",
      signal,
      onProgress: (fraction) =>
        onStage?.(candidate.id, "uploading", 60 + Math.min(40, Math.round(fraction * 40))),
    });
    return { id: candidate.id, photoId: intent.photo_id, ok: true };
  } catch {
    return { id: candidate.id, photoId: intent.photo_id, ok: false, code: "UPLOAD_FAILED" };
  }
};

/**
 * Upload a batch of prepared photos. Returns one outcome per photo; the
 * caller marks the failed rows and offers a retry.
 */
export const uploadBatch = async (params: UploadBatchParams): Promise<UploadOutcome[]> => {
  const {
    items,
    eventId,
    categoryId,
    clubId,
    consent,
    concurrency = UPLOAD_CONCURRENCY,
    onStage,
    signal,
  } = params;
  const putFile = params.putFile ?? putSignedFile;

  if (!items.length) return [];

  const intents = await api.uploadIntents({
    event_id: eventId,
    category_id: categoryId,
    club_id: clubId,
    consent,
    files: items.map((item) => ({
      client_id: item.clientId,
      /* A caption that is only spaces is no caption at all. */
      caption: item.caption.trim() ? item.caption.trim() : undefined,
      width: item.original.width,
      height: item.original.height,
      original_bytes: item.original.bytes,
      thumb_bytes: item.thumb.bytes,
    })),
  });

  const byClient = new Map<string, IntentItem>(
    intents.items.map((intent) => [intent.client_id, intent as IntentItem]),
  );

  const uploaded = await runWithConcurrency<UploadOutcome>(
    items.map((candidate): (() => Promise<UploadOutcome>) => {
      const intent = byClient.get(candidate.clientId);
      if (!intent) {
        return async () => ({ id: candidate.id, ok: false, code: "UPLOAD_NOT_FOUND" });
      }
      return () => uploadOne(candidate, intent, putFile, onStage, signal);
    }),
    concurrency,
  );

  /* Complete only the photos whose bytes are in storage — the server
     checks the objects and would answer UPLOAD_NOT_FOUND for the rest. */
  const completeIds = uploaded.filter((item) => item.ok && item.photoId).map((item) => item.photoId!);
  const completed = completeIds.length
    ? await api.completeUploads(completeIds)
    : { results: [] };
  const byPhoto = new Map(completed.results.map((result) => [result.photo_id, result]));

  return uploaded.map((item) => {
    if (!item.ok) return item;
    const result = item.photoId ? byPhoto.get(item.photoId) : undefined;
    if (!result) return { ...item, ok: false, code: "UPLOAD_NOT_FOUND" };
    return result.ok ? item : { ...item, ok: false, code: result.code ?? "UPLOAD_NOT_FOUND" };
  });
};

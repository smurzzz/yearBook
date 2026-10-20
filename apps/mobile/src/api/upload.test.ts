/* Upload pipeline (T-044) — the parts that must be right before a single
   byte leaves the phone: the queue that runs a few photos at a time, the
   per-photo failure handling, and the three-step contract with the server
   (intents → bytes → complete).

   Nothing here touches the network: the signed PUT is injected and the API
   client is a stub that answers with the shapes the real routes answer. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { configureMockApi, resetApi } from "./index";
import type { ApiClient, UploadIntentsResult } from "./endpoints";
import { runWithConcurrency, uploadBatch, type UploadCandidate } from "./upload";
import type { PutFileParams } from "../lib/upload-binary";
import type { UploadFileRef } from "../prototype/types";

const file = (name: string): UploadFileRef => ({
  uri: `file:///tmp/${name}.jpg`,
  width: 1920,
  height: 1080,
  bytes: 1_000_000,
});

const candidate = (id: string, clientId: string): UploadCandidate => ({
  id,
  clientId,
  caption: "",
  original: file(`${id}-original`),
  thumb: file(`${id}-thumb`),
});

const intentFor = (clientId: string, photoId: string) => ({
  client_id: clientId,
  photo_id: photoId,
  original: {
    path: `originals/${photoId}.jpg`,
    upload_url: `https://storage.test/originals/${photoId}.jpg`,
    token: `token-original-${photoId}`,
  },
  thumb: {
    path: `thumbs/${photoId}.jpg`,
    upload_url: `https://storage.test/thumbs/${photoId}.jpg`,
    token: `token-thumb-${photoId}`,
  },
});

interface CompleteResult {
  results: { photo_id: string; ok: boolean; code?: string }[];
}

const stubApi = (
  intents: UploadIntentsResult,
  complete: (ids: string[]) => CompleteResult = (ids) => ({
    results: ids.map((id) => ({ photo_id: id, ok: true })),
  }),
) => {
  const uploadIntents = vi.fn(async () => intents);
  const completeUploads = vi.fn(async (ids: string[]) => complete(ids));
  configureMockApi({ uploadIntents, completeUploads } as unknown as ApiClient);
  return { uploadIntents, completeUploads };
};

const baseParams = {
  eventId: "evt-1",
  categoryId: "cat-1",
  clubId: null,
  consent: true as const,
};

afterEach(() => {
  resetApi();
  vi.restoreAllMocks();
});

/* -------------------------------------------------------------------------- */
/* The queue                                                                   */
/* -------------------------------------------------------------------------- */

describe("runWithConcurrency", () => {
  it("keeps the input order and never runs more than `limit` at a time", async () => {
    let inFlight = 0;
    let peak = 0;
    const tasks = [0, 1, 2, 3, 4].map((value) => async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return value;
    });

    const results = await runWithConcurrency(tasks, 2);

    expect(results).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it("a task that throws does not cancel the rest of the batch", async () => {
    const ran: number[] = [];
    const tasks = [0, 1, 2].map((value) => async () => {
      ran.push(value);
      if (value === 1) throw new Error("boom");
      return value;
    });

    await expect(runWithConcurrency(tasks, 2)).rejects.toThrow("boom");
    expect(ran.sort()).toEqual([0, 1, 2]);
  });

  it("an empty task list resolves with an empty result", async () => {
    expect(await runWithConcurrency([], 3)).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* The batch                                                                   */
/* -------------------------------------------------------------------------- */

describe("uploadBatch", () => {
  it("uploads both files of every photo and completes the batch", async () => {
    const { uploadIntents, completeUploads } = stubApi({
      batch_id: "batch-1",
      items: [intentFor("c1", "p1"), intentFor("c2", "p2")],
    });
    const putFile = vi.fn(async (_params: PutFileParams) => undefined);

    const outcomes = await uploadBatch({
      ...baseParams,
      items: [candidate("i1", "c1"), candidate("i2", "c2")],
      putFile,
    });

    expect(outcomes.map((outcome) => outcome.ok)).toEqual([true, true]);
    expect(outcomes.map((outcome) => outcome.photoId)).toEqual(["p1", "p2"]);
    expect(putFile).toHaveBeenCalledTimes(4); // original + thumb per photo
    expect(uploadIntents).toHaveBeenCalledTimes(1);
    expect(completeUploads).toHaveBeenCalledWith(["p1", "p2"]);
  });

  it("sends the caption, the sizes and the byte counts with the intent", async () => {
    const { uploadIntents } = stubApi({
      batch_id: "batch-1",
      items: [intentFor("c1", "p1")],
    });

    await uploadBatch({
      ...baseParams,
      items: [{ ...candidate("i1", "c1"), caption: "  The band  " }],
      putFile: async () => undefined,
    });

    expect(uploadIntents).toHaveBeenCalledWith({
      event_id: "evt-1",
      category_id: "cat-1",
      club_id: null,
      consent: true,
      files: [
        {
          client_id: "c1",
          caption: "The band",
          width: 1920,
          height: 1080,
          original_bytes: 1_000_000,
          thumb_bytes: 1_000_000,
        },
      ],
    });
  });

  it("a broken file fails only its photo — the rest still lands", async () => {
    const { completeUploads } = stubApi({
      batch_id: "batch-1",
      items: [intentFor("c1", "p1"), intentFor("c2", "p2")],
    });
    const putFile = vi.fn(async ({ uri }: PutFileParams) => {
      if (uri.includes("i2-original")) throw new Error("network died");
    });

    const outcomes = await uploadBatch({
      ...baseParams,
      items: [candidate("i1", "c1"), candidate("i2", "c2")],
      putFile,
    });

    expect(outcomes[0]).toMatchObject({ id: "i1", ok: true, photoId: "p1" });
    expect(outcomes[1]).toMatchObject({ id: "i2", ok: false, code: "UPLOAD_FAILED" });
    /* Only the photo whose bytes landed is completed — the server would
       answer UPLOAD_NOT_FOUND for the other one. */
    expect(completeUploads).toHaveBeenCalledWith(["p1"]);
  });

  it("a photo the server never issued an intent for is reported, not uploaded", async () => {
    stubApi({ batch_id: "batch-1", items: [intentFor("c1", "p1")] });
    const putFile = vi.fn(async (_params: PutFileParams) => undefined);

    const outcomes = await uploadBatch({
      ...baseParams,
      items: [candidate("i1", "c1"), candidate("i2", "c2")],
      putFile,
    });

    expect(outcomes[1]).toMatchObject({ id: "i2", ok: false, code: "UPLOAD_NOT_FOUND" });
    expect(putFile).toHaveBeenCalledTimes(2); // only the first photo's files
  });

  it("keeps the server's refusal code when the completion is rejected", async () => {
    stubApi(
      { batch_id: "batch-1", items: [intentFor("c1", "p1")] },
      () => ({ results: [{ photo_id: "p1", ok: false, code: "PHOTO_NOT_FOUND" }] }),
    );

    const outcomes = await uploadBatch({
      ...baseParams,
      items: [candidate("i1", "c1")],
      putFile: async () => undefined,
    });

    expect(outcomes[0]).toMatchObject({ id: "i1", ok: false, code: "PHOTO_NOT_FOUND" });
  });

  it("reports the progress of every photo while the bytes move", async () => {
    stubApi({
      batch_id: "batch-1",
      items: [intentFor("c1", "p1")],
    });
    const seen: string[] = [];

    await uploadBatch({
      ...baseParams,
      items: [candidate("i1", "c1")],
      putFile: async ({ onProgress }: PutFileParams) => {
        onProgress?.(0.5);
        onProgress?.(1);
      },
      onStage: (id, stage, progress) => seen.push(`${id}:${stage}:${progress}`),
    });

    expect(seen[0]).toBe("i1:uploading:0");
    expect(seen).toContain("i1:uploading:30"); // half of the original's 60 %
    expect(seen).toContain("i1:uploading:100"); // the thumb finished
  });

  it("an empty batch asks the server for nothing", async () => {
    const { uploadIntents, completeUploads } = stubApi({ batch_id: "batch-1", items: [] });

    const outcomes = await uploadBatch({ ...baseParams, items: [] });

    expect(outcomes).toEqual([]);
    expect(uploadIntents).not.toHaveBeenCalled();
    expect(completeUploads).not.toHaveBeenCalled();
  });
});

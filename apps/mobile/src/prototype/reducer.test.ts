import { describe, expect, it } from "vitest";
import { STUDENT_ID } from "./data";
import { createInitialState, reducer, type Action } from "./reducer";
import { MAX_BATCH, pendingCount, uploadGuard } from "./selectors";
import type { PrototypeState } from "./types";

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

const base = (patch: Partial<PrototypeState> = {}) => createInitialState(patch);

const draftState = (patch: Partial<PrototypeState> = {}) =>
  base({
    signedIn: true,
    role: "student",
    screen: "upload",
    events: [
      {
        id: "evt-1",
        name: "Science Fair",
        description: "",
        cover: "",
        deadline: future(10),
        open: true,
        maxPhotosPerUser: 10,
        rules: [],
      },
    ],
    upload: {
      eventId: "evt-1",
      category: "Candid",
      club: null,
      consent: true,
      items: [],
    },
    ...patch,
  });

const run = (state: PrototypeState, ...actions: Action[]) =>
  actions.reduce(reducer, state);

const tick = (state: PrototypeState, times: number) => {
  let s = state;
  for (let i = 0; i < times; i++) s = reducer(s, { type: "uploadTick" });
  return s;
};

/* -------------------------------------------------------------------------- */
/* Review queue: approve / reject / undo (spec §S5, BR-05)                     */
/* -------------------------------------------------------------------------- */

describe("review decisions", () => {
  const pending = base({
    signedIn: true,
    role: "admin",
    photos: [
      { id: "p1", src: "", caption: "", eventId: "evt", category: "Candid", uploaderId: STUDENT_ID, status: "pending", uploadedAt: new Date().toISOString(), consentConfirmed: true },
    ],
  });

  it("approve sets status, clears any reason, arms undo, and clamps the index", () => {
    const s = reducer(pending, { type: "approve", photoId: "p1" });
    expect(s.photos[0].status).toBe("approved");
    expect(s.undo).toEqual({ photoId: "p1", prevStatus: "pending", prevReason: undefined });
    expect(s.reviewIndex).toBe(0);
    expect(s.toast?.kind).toBe("undo");
    expect(pendingCount(s)).toBe(0);
  });

  it("reject stores the reason (required by BR-05) and closes the sheets", () => {
    const withOverlay = run(
      pending,
      { type: "openOverlay", overlay: { id: "rejectReason", photoId: "p1" } },
      { type: "openOverlay", overlay: { id: "adminPhotoDetail", photoId: "p1" } },
    );
    const s = reducer(withOverlay, { type: "reject", photoId: "p1", reason: "Blurry" });
    expect(s.photos[0].status).toBe("rejected");
    expect(s.photos[0].rejectReason).toBe("Blurry");
    expect(s.overlays).toHaveLength(0);
    expect(s.toast?.title).toContain("Blurry");
  });

  it("undo restores the previous status and reason", () => {
    const rejected = reducer(pending, { type: "reject", photoId: "p1", reason: "Too dark" });
    const undone = reducer(rejected, { type: "undo" });
    expect(undone.photos[0].status).toBe("pending");
    expect(undone.photos[0].rejectReason).toBeUndefined();
    expect(undone.undo).toBeNull();
  });

  it("undo on a clean state is a no-op", () => {
    expect(reducer(pending, { type: "undo" })).toBe(pending);
  });

  it("review stepping never goes below the top of the queue", () => {
    const s = run(pending, { type: "reviewStep", delta: -3 }, { type: "setReviewIndex", index: -5 });
    expect(s.reviewIndex).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Upload pipeline (BR-01…04)                                                  */
/* -------------------------------------------------------------------------- */

describe("upload pipeline", () => {
  it("blocks submit with the guard message when the event is missing", () => {
    const withPhotos = run(draftState(), { type: "addUploadItems", srcs: ["/photos/a.jpg"] });
    const s = { ...withPhotos, upload: { ...withPhotos.upload, eventId: null } };
    const out = reducer(s, { type: "startUpload" });
    expect(out.uploadPhase).toBe("idle");
    expect(out.batchMessage).toBe(uploadGuard(s).message);
    expect(out.batchMessage).toContain("belongs to an event");
  });

  it("offline blocks the upload and surfaces the offline error", () => {
    const s = run(
      draftState({ network: "offline" }),
      { type: "addUploadItems", srcs: ["/photos/a.jpg"] },
      { type: "startUpload" },
    );
    expect(s.uploadError).toBe("offline");
    expect(s.uploadPhase).toBe("idle");
    expect(s.overlays.some((o) => o.id === "uploadProgress")).toBe(true);
  });

  it("a single photo uploads to completion and lands as pending", () => {
    const started = run(
      draftState(),
      { type: "addUploadItems", srcs: ["/photos/a.jpg"] },
      { type: "startUpload" },
    );
    expect(started.uploadPhase).toBe("running");
    const done = tick(started, 10);
    expect(done.uploadPhase).toBe("success");
    const created = done.photos.find((p) => p.src === "/photos/a.jpg");
    expect(created).toBeDefined();
    expect(created?.status).toBe("pending"); // never handed to students as approved
    expect(created?.uploaderId).toBe(STUDENT_ID);
  });

  it("the second photo of a batch fails once at 60% and retry recovers", () => {
    const started = run(
      draftState(),
      { type: "addUploadItems", srcs: ["/photos/a.jpg", "/photos/b.jpg"] },
      { type: "startUpload" },
    );
    expect(started.upload.items[1].willFail).toBe(true);
    expect(started.upload.items[0].willFail).toBe(false);

    const failed = tick(started, 12);
    expect(failed.upload.items[1].status).toBe("failed");
    expect(failed.upload.items[1].failNote).toBe("Interrupted");
    expect(failed.uploadPhase).toBe("running"); // not all done

    const retried = reducer(failed, { type: "retryFailed" });
    expect(retried.upload.items[1].status).toBe("waiting");
    const done = tick(retried, 20);
    expect(done.uploadPhase).toBe("success");
    expect(done.photos.filter((p) => p.src === "/photos/a.jpg" || p.src === "/photos/b.jpg")).toHaveLength(2);
  });

  it("forceUploadFailure fails every photo in the batch", () => {
    const started = run(
      draftState({ forceUploadFailure: true }),
      { type: "addUploadItems", srcs: ["/photos/a.jpg", "/photos/b.jpg"] },
      { type: "startUpload" },
    );
    expect(started.upload.items.every((i) => i.willFail)).toBe(true);
  });

  it("caps a batch at MAX_BATCH photos", () => {
    const full = Array.from({ length: MAX_BATCH }, (_, i) => `/photos/${i}.jpg`);
    const s = run(draftState(), { type: "addUploadItems", srcs: full });
    expect(s.upload.items).toHaveLength(20);
    const overflow = reducer(s, { type: "addUploadItems", srcs: ["/photos/overflow.jpg"] });
    expect(overflow.upload.items).toHaveLength(20);
    expect(overflow.batchMessage).toContain("up to 20 photos");
  });
});

/* -------------------------------------------------------------------------- */
/* Dev-forced system states (P2A/P2D dev menu)                                 */
/* -------------------------------------------------------------------------- */

describe("forced system states", () => {
  it("setUploadError opens the progress sheet and null closes it", () => {
    const open = reducer(base(), { type: "setUploadError", error: "tooLarge" });
    expect(open.uploadError).toBe("tooLarge");
    expect(open.overlays.some((o) => o.id === "uploadProgress")).toBe(true);
    const closed = reducer(open, { type: "setUploadError", error: null });
    expect(closed.uploadError).toBeNull();
    expect(closed.overlays).toHaveLength(0);
  });

  it("load error toggles for the inline error + retry block", () => {
    const on = reducer(base(), { type: "setLoadError", value: true });
    expect(on.loadError).toBe(true);
    expect(reducer(on, { type: "setLoadError", value: false }).loadError).toBe(false);
  });

  it("session expiry signs the user out with the expired issue", () => {
    const s = run(base({ signedIn: true }), { type: "openOverlay", overlay: { id: "profile" } }, { type: "sessionExpired" });
    expect(s.signedIn).toBe(false);
    expect(s.authIssue).toBe("expired");
    expect(s.overlays).toHaveLength(0);
  });

  it("first-time Google sign-in opens the setup sheet", () => {
    const s = run(base({ signedIn: false, firstTimeSetupDone: false, role: "student" }), { type: "googleSignIn" });
    expect(s.signedIn).toBe(true);
    expect(s.overlays.map((o) => o.id)).toEqual(["firstTimeSetup"]);
  });

  it("reset restores shipped fixtures after emptying data", () => {
    const emptied = reducer(base(), { type: "hydrate", patch: { photos: [], events: [], notifications: [] } });
    expect(emptied.photos).toHaveLength(0);
    const reset = reducer(emptied, { type: "hydrate", patch: createInitialState() });
    expect(reset.photos.length).toBeGreaterThan(0);
    expect(reset.events.length).toBeGreaterThan(0);
  });
});

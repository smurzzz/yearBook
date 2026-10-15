import { describe, expect, it } from "vitest";
import { STUDENT_ID } from "./data";
import {
  MAX_BATCH,
  STORAGE_QUOTA_MB,
  activeFilterCount,
  clampReviewIndex,
  emptyFilter,
  emptyStateFor,
  filterPhotos,
  myPhotos,
  pendingCount,
  pendingPhotos,
  statusCounts,
  uploadGuard,
} from "./selectors";
import { createInitialState } from "./reducer";
import type { EventItem, PhotoItem, PrototypeState } from "./types";

/* -------------------------------------------------------------------------- */
/* Fixtures — explicit dates so guards are deterministic                       */
/* -------------------------------------------------------------------------- */

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const past = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const event = (patch: Partial<EventItem> = {}): EventItem => ({
  id: "evt-1",
  name: "Science Fair",
  description: "",
  cover: "",
  deadline: future(10),
  open: true,
  maxPhotosPerUser: 3,
  rules: [],
  ...patch,
});

const photo = (patch: Partial<PhotoItem> = {}): PhotoItem => ({
  id: "p-1",
  src: "/photos/a.jpg",
  caption: "",
  eventId: "evt-1",
  category: "Candid",
  uploaderId: STUDENT_ID,
  status: "pending",
  uploadedAt: future(-1),
  consentConfirmed: true,
  ...patch,
});

const stateWith = (patch: Partial<PrototypeState> = {}) => createInitialState(patch);

/** Draft with `count` photos already staged for `evt`. */
const draft = (count: number, evt = event(), extra: Partial<PrototypeState> = {}) =>
  stateWith({
    events: [evt],
    upload: {
      eventId: evt.id,
      category: "Candid",
      club: null,
      consent: true,
      items: Array.from({ length: count }, (_, i) => ({
        id: `u-${i}`,
        src: `/photos/${i}.jpg`,
        caption: "",
        status: "waiting" as const,
        progress: 0,
      })),
    },
    ...extra,
  });

/* -------------------------------------------------------------------------- */
/* uploadGuard — the BR rules the mock enforces before a submit                */
/* -------------------------------------------------------------------------- */

describe("uploadGuard rules", () => {
  it("passes a well-formed draft", () => {
    const guard = uploadGuard(draft(2));
    expect(guard.ok).toBe(true);
    expect(guard.reason).toBeNull();
  });

  it("requires photos, an event, and a category (in that order)", () => {
    expect(uploadGuard(draft(0)).reason).toBe("no-photos");
    const noEvent = draft(1);
    noEvent.upload.eventId = null;
    expect(uploadGuard(noEvent).reason).toBe("no-event");
    const noCategory = draft(1);
    noCategory.upload.category = null;
    expect(uploadGuard(noCategory).reason).toBe("no-category");
  });

  it("blocks a closed event (deadline passed) even when open flag is true", () => {
    const guard = uploadGuard(draft(1, event({ deadline: past(1) })));
    expect(guard.ok).toBe(false);
    expect(guard.reason).toBe("deadline");
    expect(guard.title).toBe("Submissions are closed");
  });

  it("blocks an event flipped closed", () => {
    expect(uploadGuard(draft(1, event({ open: false }))).reason).toBe("deadline");
  });

  it("enforces the per-event photo limit (BR-02)", () => {
    const evt = event({ maxPhotosPerUser: 2 });
    const existing = [photo({ eventId: evt.id }), photo({ id: "p-2", eventId: evt.id })];
    const guard = uploadGuard(draft(1, evt, { photos: existing }));
    expect(guard.reason).toBe("limit");
    expect(guard.message).toContain("2 of 2");
  });

  it("enforces the storage quota", () => {
    const guard = uploadGuard(
      draft(2, event(), { storageUsedMb: STORAGE_QUOTA_MB - 8 }), // 192 + 2*8 > 200
    );
    expect(guard.reason).toBe("storage");
  });

  it("requires the consent checkbox", () => {
    const s = draft(1);
    s.upload.consent = false;
    expect(uploadGuard(s).reason).toBe("consent");
  });

  it("counts only the current student's photos toward the limit", () => {
    const evt = event({ maxPhotosPerUser: 2 });
    const others = [photo({ eventId: evt.id, uploaderId: "someone-else" })];
    const guard = uploadGuard(draft(2, evt, { photos: others }));
    expect(guard.ok).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Review queue — index clamping and pending selection                         */
/* -------------------------------------------------------------------------- */

describe("review queue", () => {
  it("clamps the index into range, including empty queues", () => {
    expect(clampReviewIndex(0, 0)).toBe(0);
    expect(clampReviewIndex(5, 3)).toBe(2);
    expect(clampReviewIndex(-1, 3)).toBe(0);
  });

  it("selects pending photos only, newest first", () => {
    const s = stateWith({
      photos: [
        photo({ id: "old", uploadedAt: past(3), status: "pending" }),
        photo({ id: "new", uploadedAt: past(1), status: "pending" }),
        photo({ id: "done", uploadedAt: past(0), status: "approved" }),
      ],
    });
    expect(pendingPhotos(s).map((p) => p.id)).toEqual(["new", "old"]);
    expect(pendingCount(s)).toBe(2);
    expect(statusCounts(s.photos)).toEqual({ pending: 2, approved: 1, rejected: 0 });
  });

  it("filters the queue by event and resets to the top", () => {
    const s = stateWith({
      photos: [photo({ id: "a", eventId: "evt-1" }), photo({ id: "b", eventId: "evt-2" })],
      reviewEventFilter: "evt-2",
    });
    expect(pendingPhotos(s).map((p) => p.id)).toEqual(["b"]);
  });
});

/* -------------------------------------------------------------------------- */
/* Student privacy — no status leaks into student surfaces                     */
/* -------------------------------------------------------------------------- */

describe("student photo visibility", () => {
  it("shows a student only their own photos", () => {
    const s = stateWith({
      photos: [photo({ id: "mine" }), photo({ id: "theirs", uploaderId: "joshua" })],
    });
    expect(myPhotos(s).map((p) => p.id)).toEqual(["mine"]);
  });
});

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

describe("filters", () => {
  it("combines status + reported-only facets", () => {
    const photos = [
      photo({ id: "pending-open", status: "pending", removalRequest: { reporterId: "r", reason: "x", requestedAt: past(1) } }),
      photo({ id: "pending-plain", status: "pending" }),
      photo({ id: "approved", status: "approved" }),
    ];
    const only = { ...emptyFilter, status: "pending" as const, reportedOnly: true };
    expect(filterPhotos(photos, only).map((p) => p.id)).toEqual(["pending-open"]);
    expect(activeFilterCount(only)).toBe(2);
    expect(activeFilterCount(emptyFilter)).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Empty-state copy (spec § copy)                                              */
/* -------------------------------------------------------------------------- */

describe("empty state copy", () => {
  it("matches the spec copy for each surface", () => {
    expect(emptyStateFor("photos")).toEqual({
      title: "No photos yet",
      body: "Tap + to upload your first one.",
    });
    expect(emptyStateFor("review").title).toBe("All caught up!");
    expect(emptyStateFor("events").title).toBe("No events yet");
    expect(emptyStateFor("reports").title).toBe("No removal requests");
  });
});

/* -------------------------------------------------------------------------- */
/* Batch cap                                                                   */
/* -------------------------------------------------------------------------- */

describe("batch cap", () => {
  it("MAX_BATCH is 20 (spec BR-02 batch size)", () => {
    expect(MAX_BATCH).toBe(20);
  });
});

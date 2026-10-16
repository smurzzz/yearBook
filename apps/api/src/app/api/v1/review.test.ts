/* Slice 5d gate tests — review (TC-REV-01…03, 07, 08, 11 + authz). */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { signDownloadUrl } from "@/server/lib/storage";
import { GET as queueGet } from "@/app/api/v1/admin/review/queue/route";
import { GET as countGet } from "@/app/api/v1/admin/review/count/route";
import { POST as approvePost } from "@/app/api/v1/admin/photos/[id]/approve/route";
import { POST as rejectPost } from "@/app/api/v1/admin/photos/[id]/reject/route";
import { POST as resetPost } from "@/app/api/v1/admin/photos/[id]/reset/route";
import type { AdminPhotoRow } from "@/server/services/photos";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), clerkClient: vi.fn() }));
vi.mock("@/server/lib/db", () => ({ getDb: vi.fn(), pingDb: vi.fn() }));
vi.mock("@/server/lib/storage", () => ({
  deleteObjects: vi.fn(),
  signDownloadUrl: vi.fn(),
  signUploadUrl: vi.fn(),
  objectExists: vi.fn(),
}));

const authMock = vi.mocked(auth);
const getDbMock = vi.mocked(getDb);
const signDownloadUrlMock = vi.mocked(signDownloadUrl);

const req = (path: string, init?: { method?: string; body?: string }) =>
  new NextRequest(`http://api.local${path}`, init);
const withParams = (id: string) => ({ params: Promise.resolve({ id }) });

const PHOTO_ID = "99999999-8888-4777-8666-555555555555";
const OTHER_ID = "77777777-6666-4555-8444-333333333333";
const EVENT_ID = "11111111-2222-4333-8444-555555555555";

const userRow = (role: "student" | "admin") => ({
  id: "user_admin",
  email: "chair@stmichaels.edu.ph",
  full_name: "Yearbook Chair",
  avatar_url: null,
  role,
  club_id: null,
  club_name: null,
  notify_deadlines: true,
  notify_reviews: true,
  consented_at: "2026-10-01T00:00:00.000Z",
});

const adminPhotoRow = (over: Partial<AdminPhotoRow> = {}): AdminPhotoRow => ({
  id: PHOTO_ID,
  status: "pending",
  caption: "Check me out",
  width: 1920,
  height: 1280,
  thumb_path: `thumbs/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`,
  original_path: `originals/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`,
  rejection_reason: null,
  rejection_note: null,
  created_at: "2026-10-01T00:00:00.000Z",
  reviewed_at: null,
  consent_confirmed_at: "2026-10-01T00:00:00.000Z",
  uploader_id: "user_1",
  uploader_name: "Mikaela Reyes",
  uploader_email: "m@student.stmichaels.edu.ph",
  uploader_avatar: null,
  uploader_club_id: null,
  uploader_club_name: null,
  event_id: EVENT_ID,
  event_name: "Science Fair",
  category_id: "cccccccc-1111-4222-8333-dddddddddddd",
  category_name: "Candid",
  club_id: null,
  club_name: null,
  reviewer_id: null,
  reviewer_name: null,
  batch_size: 2,
  report_id: null,
  report_reporter_id: null,
  report_reporter_name: null,
  report_reason: null,
  report_notes: null,
  report_created_at: null,
  ...over,
});

let db: FakeDb;
let role: "student" | "admin";

const scriptDb = (handler: (sql: string, values: unknown[]) => unknown[]) => {
  db = fakeDb((sql, values) =>
    sql.includes("from public.users") ? ([userRow(role)] as never) : (handler(sql, values) as never),
  );
  getDbMock.mockReturnValue(db);
};

const scripted = (
  overrides: Array<[string, unknown[]]> = [],
): ((sql: string) => unknown[]) => (sql) => {
  for (const [pattern, rows] of overrides) if (sql.includes(pattern)) return rows;
  if (sql.includes("join public.users u on u.id = p.uploader_id")) return [adminPhotoRow()] as never;
  if (sql.includes("as pending")) return [{ pending: 3 }] as never;
  return [] as never;
};

const post = (path: string, body: unknown) =>
  new NextRequest(`http://api.local${path}`, { method: "POST", body: JSON.stringify(body) });

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  role = "admin";
  signDownloadUrlMock.mockImplementation(async (path: string) => `http://x/${path}`);
  scriptDb(scripted());
  authMock.mockResolvedValue({ userId: "user_admin" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /admin/review/queue", () => {
  it("TC-REV-01: pending + completed only, oldest first, total_pending meta", async () => {
    scriptDb(
      scripted([
        ["order by p.created_at asc", [adminPhotoRow(), adminPhotoRow({ id: OTHER_ID })]],
      ]),
    );
    const res = await queueGet(req("/api/v1/admin/review/queue"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].status).toBe("pending"); // admin DTO carries status
    expect(body.data[0].uploader.full_name).toBe("Mikaela Reyes");
    expect(body.meta).toEqual({ total_pending: 3 });
    expect(body.next_cursor).toBeNull();

    const queueSql = db.calls.find((c) => c.sql.includes("order by p.created_at asc"))!.sql;
    expect(queueSql).toContain("p.status = 'pending'");
    expect(queueSql).toContain("p.upload_completed_at is not null"); // excludes incomplete
    const queueCall = db.calls.find((c) => c.sql.includes("order by p.created_at asc"))!;
    expect(queueCall.values).toContain(21); // default 20 + sentinel
  });

  it("pages with the (created_at, id) tuple cursor", async () => {
    scriptDb(
      scripted([
        ["order by p.created_at asc", [adminPhotoRow(), adminPhotoRow({ id: OTHER_ID }), adminPhotoRow()]],
      ]),
    );
    const res = await queueGet(req("/api/v1/admin/review/queue?limit=2"));
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.next_cursor).toBeTruthy();

    await queueGet(req(`/api/v1/admin/review/queue?limit=2&cursor=${encodeURIComponent(body.next_cursor)}`));
    expect(db.calls.some((c) => c.sql.includes("(p.created_at, p.id) >"))).toBe(true);
  });
});

describe("GET /admin/review/count", () => {
  it("returns { pending }", async () => {
    const res = await countGet(req("/api/v1/admin/review/count"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { pending: 3 } });
  });
});

describe("POST /admin/photos/:id/approve", () => {
  it("TC-REV-08: approves, clears rejection fields, no notification", async () => {
    scriptDb(
      scripted([
        ["set status = 'approved'", [{ id: PHOTO_ID }]],
        ["join public.users u on u.id = p.uploader_id", [adminPhotoRow({ status: "approved", reviewer_id: "user_admin", reviewer_name: "Yearbook Chair" })]],
      ]),
    );
    const res = await approvePost(post(`/api/v1/admin/photos/${PHOTO_ID}/approve`, {}), withParams(PHOTO_ID));
    expect(res.status).toBe(200);
    const dto = (await res.json()).data;
    expect(dto.status).toBe("approved");
    expect(dto.reviewed_by).toEqual({ id: "user_admin", full_name: "Yearbook Chair" });

    const approveSql = db.calls.find((c) => c.sql.includes("set status = 'approved'"))!.sql;
    expect(approveSql).toContain("rejection_reason = null");
    expect(db.calls.some((c) => c.sql.includes("insert into public.notifications"))).toBe(false);
  });

  it("unknown photo → 404", async () => {
    scriptDb(scripted([["join public.users u on u.id = p.uploader_id", []]]));
    const res = await approvePost(post(`/api/v1/admin/photos/${OTHER_ID}/approve`, {}), withParams(OTHER_ID));
    expect(res.status).toBe(404);
  });
});

describe("POST /admin/photos/:id/reject", () => {
  it("TC-REV-02: no reason → 422 VALIDATION_ERROR", async () => {
    const res = await rejectPost(post(`/api/v1/admin/photos/${PHOTO_ID}/reject`, { note: "x" }), withParams(PHOTO_ID));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(db.calls.some((c) => c.sql.includes("set status = 'rejected'"))).toBe(false);
  });

  it("TC-REV-03: reason other without note → 422 with fields.note", async () => {
    const res = await rejectPost(post(`/api/v1/admin/photos/${PHOTO_ID}/reject`, { reason: "other" }), withParams(PHOTO_ID));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.details.fields.note).toBeTruthy();
    expect(db.calls.some((c) => c.sql.includes("set status = 'rejected'"))).toBe(false);
  });

  it("TC-REV-07: rejects, inserts the uploader notification row with spec §11 copy", async () => {
    let detailCalls = 0;
    scriptDb((sql) => {
      if (sql.includes("set status = 'rejected'")) return [{ id: PHOTO_ID }] as never;
      if (sql.includes("insert into public.notifications")) return [{ id: "nnn" }] as never;
      if (sql.includes("join public.users u on u.id = p.uploader_id")) {
        detailCalls += 1;
        // first select (pre-update) sees pending; the re-read sees rejected
        return (detailCalls === 1
          ? [adminPhotoRow({ status: "pending" })]
          : [adminPhotoRow({ status: "rejected", rejection_reason: "blurry", rejection_note: "shaky" })]) as never;
      }
      return [] as never;
    });
    const res = await rejectPost(
      post(`/api/v1/admin/photos/${PHOTO_ID}/reject`, { reason: "blurry", note: "shaky" }),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(200);
    const dto = (await res.json()).data;
    expect(dto.status).toBe("rejected");
    expect(dto.rejection).toEqual({ reason: "blurry", label: "Blurry", note: "shaky" });

    const notif = db.calls.find((c) => c.sql.includes("insert into public.notifications"))!;
    expect(notif.values[0]).toBe("user_1"); // uploader, not the admin
    expect(notif.values[1]).toBe("photo_needs_replacement");
    expect(notif.values[2]).toBe("Photo needs replacing");
    expect(notif.values[3]).toBe("Your photo from Science Fair needs a new photo: Blurry.");
    expect(JSON.parse(String(notif.values[4]))).toEqual({ photo_id: PHOTO_ID });
  });

  it("TC-REV-11: re-rejecting an already rejected photo creates no duplicate notification", async () => {
    scriptDb(
      scripted([
        ["set status = 'rejected'", [{ id: PHOTO_ID }]],
        ["join public.users u on u.id = p.uploader_id", [adminPhotoRow({ status: "rejected", rejection_reason: "blurry" })]],
      ]),
    );
    const res = await rejectPost(post(`/api/v1/admin/photos/${PHOTO_ID}/reject`, { reason: "blurry" }), withParams(PHOTO_ID));
    expect(res.status).toBe(200);
    expect(db.calls.some((c) => c.sql.includes("insert into public.notifications"))).toBe(false);
  });

  it("other reason with note → 200", async () => {
    scriptDb(
      scripted([
        ["set status = 'rejected'", [{ id: PHOTO_ID }]],
        ["insert into public.notifications", [{ id: "nnn" }]],
        ["join public.users u on u.id = p.uploader_id", [adminPhotoRow({ status: "rejected", rejection_reason: "other", rejection_note: "tag the right club" })]],
      ]),
    );
    const res = await rejectPost(
      post(`/api/v1/admin/photos/${PHOTO_ID}/reject`, { reason: "other", note: "tag the right club" }),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /admin/photos/:id/reset", () => {
  it("TC-BRW-07: back to pending with reviewer fields cleared", async () => {
    scriptDb(
      scripted([
        ["set status = 'pending'", [{ id: PHOTO_ID }]],
        ["join public.users u on u.id = p.uploader_id", [adminPhotoRow({ status: "pending", reviewer_id: null, reviewer_name: null })]],
      ]),
    );
    const res = await resetPost(post(`/api/v1/admin/photos/${PHOTO_ID}/reset`, {}), withParams(PHOTO_ID));
    expect(res.status).toBe(200);
    const dto = (await res.json()).data;
    expect(dto.status).toBe("pending");
    expect(dto.reviewed_by).toBeNull();
    const resetSql = db.calls.find((c) => c.sql.includes("set status = 'pending'"))!.sql;
    expect(resetSql).toContain("reviewed_by = null");
    expect(resetSql).toContain("rejection_reason = null");
  });
});

describe("authz", () => {
  it("no token → 401 on every review endpoint", async () => {
    authMock.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    const results = await Promise.all([
      queueGet(req("/api/v1/admin/review/queue")),
      countGet(req("/api/v1/admin/review/count")),
      approvePost(post(`/api/v1/admin/photos/${PHOTO_ID}/approve`, {}), withParams(PHOTO_ID)),
      rejectPost(post(`/api/v1/admin/photos/${PHOTO_ID}/reject`, { reason: "blurry" }), withParams(PHOTO_ID)),
      resetPost(post(`/api/v1/admin/photos/${PHOTO_ID}/reset`, {}), withParams(PHOTO_ID)),
    ]);
    for (const res of results) expect(res.status).toBe(401);
  });

  it("student → 403 FORBIDDEN everywhere", async () => {
    role = "student";
    scriptDb(scripted());
    const results = await Promise.all([
      queueGet(req("/api/v1/admin/review/queue")),
      countGet(req("/api/v1/admin/review/count")),
      approvePost(post(`/api/v1/admin/photos/${PHOTO_ID}/approve`, {}), withParams(PHOTO_ID)),
      rejectPost(post(`/api/v1/admin/photos/${PHOTO_ID}/reject`, { reason: "blurry" }), withParams(PHOTO_ID)),
      resetPost(post(`/api/v1/admin/photos/${PHOTO_ID}/reset`, {}), withParams(PHOTO_ID)),
    ]);
    for (const res of results) expect(res.status).toBe(403);
  });
});

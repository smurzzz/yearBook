/* Slice 5f gate tests — removal requests (TC-REP-01…07 + BR-07/08 + authz). */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { deleteObjects, signDownloadUrl } from "@/server/lib/storage";
import { POST as reportPost } from "@/app/api/v1/photos/[id]/reports/route";
import { GET as listGet } from "@/app/api/v1/admin/reports/route";
import { POST as resolvePost } from "@/app/api/v1/admin/reports/[id]/resolve/route";
import type { ReportRow } from "@/server/services/reports";

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
const deleteObjectsMock = vi.mocked(deleteObjects);
const signDownloadUrlMock = vi.mocked(signDownloadUrl);

const req = (path: string, init?: { method?: string; body?: string }) =>
  new NextRequest(`http://api.local${path}`, init);
const withParams = (id: string) => ({ params: Promise.resolve({ id }) });

const PHOTO_ID = "99999999-8888-4777-8666-555555555555";
const REPORT_ID = "55555555-4444-4333-8222-111111111111";
const OTHER_REPORT = "66666666-4444-4333-8222-111111111111";
const USER_ID = "00000000-0000-4000-8000-000000000001";

const userRow = (role: "student" | "admin") => ({
  id: USER_ID,
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

const reportRow = (over: Partial<ReportRow> = {}): ReportRow => ({
  id: REPORT_ID,
  photo_id: PHOTO_ID,
  reason: "remove_me",
  notes: "Please remove",
  status: "open",
  created_at: "2026-10-13T00:00:00.000Z",
  resolved_at: null,
  reporter_id: USER_ID,
  reporter_name: "Mikaela Reyes",
  thumb_path: `thumbs/ev/u/${PHOTO_ID}.jpg`,
  width: 1920,
  height: 1280,
  batch_size: 1,
  ...over,
});

let db: FakeDb;
let role: "student" | "admin";

type OverrideRows = unknown[] | (() => unknown[]);

const scriptDb = (overrides: Array<[string, OverrideRows]> = []) => {
  db = fakeDb((sql) => {
    for (const [pattern, rows] of overrides) {
      if (sql.includes(pattern)) return (typeof rows === "function" ? rows() : rows) as never;
    }
    if (sql.includes("from public.users")) return [userRow(role)] as never;
    return [] as never;
  });
  getDbMock.mockReturnValue(db);
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
  role = "student";
  deleteObjectsMock.mockResolvedValue(undefined);
  signDownloadUrlMock.mockImplementation(async (path: string) => `http://x/${path}`);
  scriptDb();
  authMock.mockResolvedValue({ userId: USER_ID } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /photos/:id/reports", () => {
  it("TC-REP-01: own completed photo → 201 with reason label + snapshot stored", async () => {
    scriptDb([
      ["select p.id, p.caption", [{ id: PHOTO_ID, caption: "Check me out", completed: true, event_name: "Science Fair", uploader_name: "Mikaela Reyes" }]],
      ["insert into public.reports", [{ id: REPORT_ID }]],
      ["where r.id = $1", [reportRow()]],
    ]);
    const res = await reportPost(
      post(`/api/v1/photos/${PHOTO_ID}/reports`, { reason: "remove_me", notes: "Please remove" }),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toMatchObject({
      id: REPORT_ID,
      reason: "remove_me",
      reason_label: "I'm in this photo and want it removed",
      status: "open",
    });
    expect(body.data.photo_id).toBe(PHOTO_ID);

    const insert = db.calls.find((c) => c.sql.includes("insert into public.reports"))!;
    expect(insert.values[0]).toBe(PHOTO_ID);
    expect(insert.values[1]).toBe(USER_ID); // reporter = caller
    expect(JSON.parse(String(insert.values[4]))).toEqual({
      event_name: "Science Fair",
      caption: "Check me out",
      uploader_name: "Mikaela Reyes",
    });
  });

  it("TC-REP-02 / BR-07: duplicate open report (unique index 23505) → 409 REPORT_EXISTS", async () => {
    scriptDb([
      ["select p.id, p.caption", [{ id: PHOTO_ID, caption: "", completed: true, event_name: "e", uploader_name: "u" }]],
      ["insert into public.reports", () => {
        const err = new Error("duplicate") as Error & { code: string };
        err.code = "23505";
        throw err;
      }],
    ]);
    const res = await reportPost(post(`/api/v1/photos/${PHOTO_ID}/reports`, { reason: "remove_me" }), withParams(PHOTO_ID));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("REPORT_EXISTS");
  });

  it("TC-REP-03: someone else's photo → 404", async () => {
    scriptDb([["select p.id, p.caption", []]]);
    const res = await reportPost(post(`/api/v1/photos/${PHOTO_ID}/reports`, { reason: "remove_me" }), withParams(PHOTO_ID));
    expect(res.status).toBe(404);
    expect(db.calls.some((c) => c.sql.includes("insert into public.reports"))).toBe(false);
  });

  it("incomplete photo → 404", async () => {
    scriptDb([["select p.id, p.caption", [{ id: PHOTO_ID, caption: "", completed: false, event_name: "e", uploader_name: "u" }]]]);
    const res = await reportPost(post(`/api/v1/photos/${PHOTO_ID}/reports`, { reason: "remove_me" }), withParams(PHOTO_ID));
    expect(res.status).toBe(404);
  });

  it("invalid reason → 422", async () => {
    const res = await reportPost(post(`/api/v1/photos/${PHOTO_ID}/reports`, { reason: "bogus" }), withParams(PHOTO_ID));
    expect(res.status).toBe(422);
  });
});

describe("GET /admin/reports", () => {
  it("defaults to open, signs the photo tile thumb, paginates newest-first", async () => {
    role = "admin";
    scriptDb([
      ["order by r.created_at desc", [reportRow(), reportRow({ id: OTHER_REPORT })]],
    ]);
    const res = await listGet(req("/api/v1/admin/reports?limit=1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: REPORT_ID,
      reporter: { id: USER_ID, full_name: "Mikaela Reyes" },
      photo: { id: PHOTO_ID, width: 1920, height: 1280, batch_size: 1 },
    });
    expect(body.data[0].photo.thumb_url).toBe(`http://x/thumbs/ev/u/${PHOTO_ID}.jpg`);
    expect(body.next_cursor).toBeTruthy();
    const call = db.calls.find((c) => c.sql.includes("order by r.created_at desc"))!;
    expect(call.sql).toContain("r.status = 'open'"); // default
  });

  it("status=resolved filters non-open; photo tile null when the photo is gone", async () => {
    role = "admin";
    scriptDb([
      ["order by r.created_at desc", [reportRow({ photo_id: null, thumb_path: null, status: "removed" })]],
    ]);
    const res = await listGet(req("/api/v1/admin/reports?status=resolved"));
    const body = await res.json();
    expect(db.calls.at(-1)!.sql).toContain("r.status <> 'open'");
    expect(body.data[0].photo).toBeNull();

    const bad = await listGet(req("/api/v1/admin/reports?status=bogus"));
    expect(bad.status).toBe(422);
  });
});

describe("POST /admin/reports/:id/resolve", () => {
  beforeEach(() => {
    role = "admin";
  });

  it("TC-REP-04: remove — storage first, all open reports close, photo row deleted, reporter notified", async () => {
    const order: string[] = [];
    deleteObjectsMock.mockImplementation(async () => {
      order.push("storage");
    });
    let reads = 0;
    scriptDb([
      ["where r.id = $1", () => {
        reads += 1;
        return reads === 1
          ? [reportRow()]
          : [reportRow({ status: "removed", resolved_at: "2026-10-14T00:00:00.000Z", photo_id: null, thumb_path: null })];
      }],
      ["select original_path, thumb_path from public.photos", [{ original_path: `originals/ev/u/${PHOTO_ID}.jpg`, thumb_path: `thumbs/ev/u/${PHOTO_ID}.jpg` }]],
      ["select id, reporter_id from public.reports", [{ id: REPORT_ID, reporter_id: USER_ID }]],
      ["set status = $2", [{ id: REPORT_ID }]],
      ["insert into public.notifications", [{ id: "nnn" }]],
      ["delete from public.photos", () => { order.push("row"); return [{ id: PHOTO_ID }]; }],
    ]);
    const res = await resolvePost(
      post(`/api/v1/admin/reports/${REPORT_ID}/resolve`, { action: "remove" }),
      withParams(REPORT_ID),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("removed");
    expect(order).toEqual(["storage", "row"]); // BR-08
    const notif = db.calls.find((c) => c.sql.includes("insert into public.notifications"))!;
    expect(notif.values[1]).toBe("report_resolved");
    expect(notif.values[3]).toBe("Your removal request was approved and the photo was deleted.");
  });

  it("TC-REP-05: dismiss — photo kept, reporter notified with the kept copy", async () => {
    let reads = 0;
    scriptDb([
      ["where r.id = $1", () => {
        reads += 1;
        return reads === 1
          ? [reportRow()]
          : [reportRow({ status: "dismissed", resolved_at: "2026-10-14T00:00:00.000Z" })];
      }],
      ["set status = $2", [{ id: REPORT_ID }]],
      ["insert into public.notifications", [{ id: "nnn" }]],
    ]);
    const res = await resolvePost(
      post(`/api/v1/admin/reports/${REPORT_ID}/resolve`, { action: "dismiss" }),
      withParams(REPORT_ID),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("dismissed");
    expect(deleteObjectsMock).not.toHaveBeenCalled();
    expect(db.calls.some((c) => c.sql.includes("delete from public.photos"))).toBe(false);
    const notif = db.calls.find((c) => c.sql.includes("insert into public.notifications"))!;
    expect(notif.values[3]).toBe("Your removal request was reviewed and the photo was kept.");
  });

  it("TC-REP-06: resolve twice → 409 REPORT_ALREADY_RESOLVED", async () => {
    scriptDb([["where r.id = $1", [reportRow({ status: "removed" })]]]);
    const res = await resolvePost(post(`/api/v1/admin/reports/${REPORT_ID}/resolve`, { action: "dismiss" }), withParams(REPORT_ID));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("REPORT_ALREADY_RESOLVED");
    expect(db.calls.some((c) => c.sql.includes("set status = $2"))).toBe(false);
  });

  it("BR-08: storage failure on remove → 503; report stays open, photo row kept", async () => {
    deleteObjectsMock.mockRejectedValue(new Error("down"));
    scriptDb([
      ["where r.id = $1", [reportRow()],
      ],
      ["select original_path, thumb_path from public.photos", [{ original_path: "o.jpg", thumb_path: "t.jpg" }]],
    ]);
    const res = await resolvePost(post(`/api/v1/admin/reports/${REPORT_ID}/resolve`, { action: "remove" }), withParams(REPORT_ID));
    expect(res.status).toBe(503);
    expect(db.calls.some((c) => c.sql.includes("delete from public.photos"))).toBe(false);
    expect(db.calls.some((c) => c.sql.includes("set status = $2"))).toBe(false);
  });

  it("unknown report → 404; invalid action → 422", async () => {
    scriptDb([["where r.id = $1", []]]);
    const missing = await resolvePost(post(`/api/v1/admin/reports/${REPORT_ID}/resolve`, { action: "dismiss" }), withParams(REPORT_ID));
    expect(missing.status).toBe(404);

    const bad = await resolvePost(post(`/api/v1/admin/reports/${REPORT_ID}/resolve`, { action: "nuke" }), withParams(REPORT_ID));
    expect(bad.status).toBe(422);
  });
});

describe("authz", () => {
  it("no token → 401 everywhere; student → 403 on admin routes; admin → 403 on student route", async () => {
    authMock.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    for (const res of await Promise.all([
      reportPost(post(`/api/v1/photos/${PHOTO_ID}/reports`, { reason: "remove_me" }), withParams(PHOTO_ID)),
      listGet(req("/api/v1/admin/reports")),
      resolvePost(post(`/api/v1/admin/reports/${REPORT_ID}/resolve`, { action: "dismiss" }), withParams(REPORT_ID)),
    ])) {
      expect(res.status).toBe(401);
    }

    authMock.mockResolvedValue({ userId: USER_ID } as unknown as Awaited<ReturnType<typeof auth>>);
    scriptDb();
    for (const res of await Promise.all([
      listGet(req("/api/v1/admin/reports")),
      resolvePost(post(`/api/v1/admin/reports/${REPORT_ID}/resolve`, { action: "dismiss" }), withParams(REPORT_ID)),
    ])) {
      expect(res.status).toBe(403); // student
    }

    role = "admin";
    scriptDb();
    const asAdmin = await reportPost(post(`/api/v1/photos/${PHOTO_ID}/reports`, { reason: "remove_me" }), withParams(PHOTO_ID));
    expect(asAdmin.status).toBe(403); // students-only endpoint
  });
});

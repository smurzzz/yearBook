/* Slice 5e gate tests — browse (TC-BRW-01…04, 07 + TC-SEC-01 + authz). */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { deleteObjects, signDownloadUrl } from "@/server/lib/storage";
import { GET as browseGet } from "@/app/api/v1/admin/photos/route";
import {
  DELETE as photoDelete,
  GET as photoGet,
  PATCH as photoPatch,
} from "@/app/api/v1/admin/photos/[id]/route";
import { GET as userGet } from "@/app/api/v1/admin/users/[id]/route";
import { GET as userPhotosGet } from "@/app/api/v1/admin/users/[id]/photos/route";
import { adminFilterWhere } from "@/server/sql/photos";

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
const deleteObjectsMock = vi.mocked(deleteObjects);

const req = (path: string, init?: { method?: string; body?: string }) =>
  new NextRequest(`http://api.local${path}`, init);
const withParams = (id: string) => ({ params: Promise.resolve({ id }) });

const PHOTO_ID = "99999999-8888-4777-8666-555555555555";
const EVENT_ID = "11111111-2222-4333-8444-555555555555";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const REPORT_ID = "55555555-4444-4333-8222-111111111111";

const userRow = () => ({
  id: "user_admin",
  email: "chair@stmichaels.edu.ph",
  full_name: "Yearbook Chair",
  avatar_url: null,
  role: "admin",
  club_id: null,
  club_name: null,
  notify_deadlines: true,
  notify_reviews: true,
  consented_at: "2026-10-01T00:00:00.000Z",
});

const tileRow = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  width: 1920,
  height: 1280,
  thumb_path: `thumbs/${EVENT_ID}/${USER_ID}/${id}.jpg`,
  status: "approved",
  batch_size: 1,
  reported: false,
  created_at: "2026-10-12T00:00:00.000Z",
  ...over,
});

const adminPhotoRow = (over: Record<string, unknown> = {}) => ({
  id: PHOTO_ID,
  status: "approved",
  caption: "Check me out",
  width: 1920,
  height: 1280,
  thumb_path: `thumbs/${EVENT_ID}/${USER_ID}/${PHOTO_ID}.jpg`,
  original_path: `originals/${EVENT_ID}/${USER_ID}/${PHOTO_ID}.jpg`,
  rejection_reason: null,
  rejection_note: null,
  created_at: "2026-10-12T00:00:00.000Z",
  reviewed_at: null,
  consent_confirmed_at: "2026-10-01T00:00:00.000Z",
  uploader_id: USER_ID,
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

type OverrideRows = unknown[] | (() => unknown[]);

const scriptDb = (
  overrides: Array<[string, OverrideRows]> = [],
  role: "student" | "admin" = "admin",
) => {
  const scripted = fakeDb((sql) => {
    for (const [pattern, rows] of overrides) {
      if (sql.includes(pattern)) return (typeof rows === "function" ? rows() : rows) as never;
    }
    // requireUser's lookup — after overrides so the user-summary query can win.
    if (sql.includes("from public.users")) return [{ ...userRow(), role }] as never;
    return [] as never;
  });
  db = scripted;
  getDbMock.mockReturnValue(scripted);
};

const lastBrowse = (needle: string) => db.calls.filter((c) => c.sql.includes(needle)).at(-1);

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  signDownloadUrlMock.mockImplementation(async (path: string) => `http://x/${path}`);
  deleteObjectsMock.mockResolvedValue(undefined);
  scriptDb();
  authMock.mockResolvedValue({ userId: "user_admin" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /admin/photos — filters", () => {
  it("TC-BRW-01: each filter alone lands in SQL; tiles + reported flag", async () => {
    scriptDb([
      ["order by p.created_at desc", [tileRow(PHOTO_ID, { reported: true })]],
      ["group by p.status", [{ status: "approved", n: 1 }]],
    ]);
    const res = await browseGet(
      req(
        `/api/v1/admin/photos?status=approved&event_id=${EVENT_ID}&category_id=cccccccc-1111-4222-8333-dddddddddddd&club_id=dddddddd-1111-4222-8333-eeeeeeeeeeee&uploader_id=${USER_ID}&reported=true&from=2026-10-01T00:00:00%2B08:00&to=2026-10-15T00:00:00%2B08:00`,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0]).toEqual({
      id: PHOTO_ID,
      thumb_url: `http://x/thumbs/${EVENT_ID}/${USER_ID}/${PHOTO_ID}.jpg`,
      width: 1920,
      height: 1280,
      batch_size: 1,
      status: "approved",
      reported: true,
    });

    const sql = lastBrowse("order by p.created_at desc")!.sql;
    expect(sql).toContain("p.status = $");
    expect(sql).toContain("p.event_id = $");
    expect(sql).toContain("p.category_id = $");
    expect(sql).toContain("p.club_id = $");
    expect(sql).toContain("p.uploader_id = $");
    expect(sql).toContain("exists (select 1 from public.reports r");
    expect(sql).toContain("p.created_at >=");
    expect(sql).toContain("p.created_at <"); // to = exclusive Manila day end
  });

  it("TC-BRW-02/03: q searches caption OR uploader name with escaped wildcards", async () => {
    scriptDb([["group by p.status", []]]);
    await browseGet(req("/api/v1/admin/photos?q=100%25"));
    const call = lastBrowse("ilike")!;
    expect(call.sql).toContain("p.caption ilike");
    expect(call.sql).toContain("u.full_name ilike");
    expect(call.sql).toContain("escape");
    expect(call.values).toContain("%100\\%%"); // literal %, not a wildcard
  });

  it("TC-SEC-01: SQL-injection strings in q are parameterized, never interpolated", async () => {
    scriptDb([["group by p.status", []]]);
    const evil = "'; drop table photos; --";
    const res = await browseGet(req(`/api/v1/admin/photos?q=${encodeURIComponent(evil)}`));
    expect(res.status).toBe(200);
    const call = lastBrowse("ilike")!;
    expect(call.values).toContain(`%${evil}%`); // value bound as a parameter
    expect(call.sql).not.toContain("drop table");
  });

  it("TC-BRW-04: meta.summary + meta.total cover the whole filtered set", async () => {
    scriptDb([
      ["order by p.created_at desc", [tileRow(PHOTO_ID)]],
      ["group by p.status", [
        { status: "pending", n: 2 },
        { status: "approved", n: 5 },
        { status: "rejected", n: 1 },
      ]],
    ]);
    const res = await browseGet(req("/api/v1/admin/photos"));
    const body = await res.json();
    expect(body.meta).toEqual({
      total: 8,
      summary: { pending: 2, approved: 5, rejected: 1 },
    });
  });

  it("count_only=true returns meta only, and skips the tile query", async () => {
    scriptDb([["group by p.status", [{ status: "pending", n: 4 }]]]);
    const res = await browseGet(req("/api/v1/admin/photos?count_only=true&status=pending"));
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(4);
    expect(db.calls.some((c) => c.sql.includes("order by p.created_at desc"))).toBe(false);
  });

  it("invalid filters → 422 with details.fields", async () => {
    for (const path of [
      "/api/v1/admin/photos?status=bogus",
      "/api/v1/admin/photos?event_id=not-a-uuid",
      `/api/v1/admin/photos?q=${"x".repeat(81)}`,
      "/api/v1/admin/photos?from=not-a-date",
      "/api/v1/admin/photos?to=not-a-date",
    ]) {
      const res = await browseGet(req(path));
      expect(res.status).toBe(422);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("cursor pages with the (created_at, id) tuple", async () => {
    scriptDb([
      ["order by p.created_at desc", [tileRow(PHOTO_ID), tileRow(EVENT_ID), tileRow(REPORT_ID)]],
      ["group by p.status", []],
    ]);
    const res = await browseGet(req("/api/v1/admin/photos?limit=2"));
    const body = await res.json();
    expect(body.next_cursor).toBeTruthy();
    await browseGet(req(`/api/v1/admin/photos?limit=2&cursor=${encodeURIComponent(body.next_cursor)}`));
    expect(db.calls.some((c) => c.sql.includes("(p.created_at, p.id) <"))).toBe(true);
  });
});

describe("adminFilterWhere (unit)", () => {
  it("builds AND-combined parameterized conditions", () => {
    const { where, values } = adminFilterWhere({
      status: "pending",
      eventId: EVENT_ID,
      categoryId: null,
      clubId: null,
      uploaderId: null,
      q: null,
      from: null,
      to: null,
      reported: true,
    });
    expect(where).toContain(" and ");
    expect(where).toContain("p.upload_completed_at is not null");
    expect(values).toEqual(["pending", EVENT_ID]);
  });
});

describe("GET/PATCH/DELETE /admin/photos/:id", () => {
  it("detail returns AdminPhotoDTO with open_report", async () => {
    scriptDb([
      ["where p.id = $1", [adminPhotoRow({
        report_id: REPORT_ID,
        report_reporter_id: USER_ID,
        report_reporter_name: "Mikaela Reyes",
        report_reason: "remove_me",
        report_notes: "Please remove",
        report_created_at: "2026-10-13T00:00:00.000Z",
      })]],
    ]);
    const res = await photoGet(req(`/api/v1/admin/photos/${PHOTO_ID}`), withParams(PHOTO_ID));
    expect(res.status).toBe(200);
    const dto = (await res.json()).data;
    expect(dto.status).toBe("approved");
    expect(dto.open_report).toMatchObject({
      id: REPORT_ID,
      reason: "remove_me",
      reason_label: "I'm in this photo and want it removed",
      status: "open",
    });
  });

  it("TC-BRW-07: PATCH retags the event and returns the updated DTO; unknown id → 404", async () => {
    scriptDb([
      ["update public.photos set event_id", [{ id: PHOTO_ID }]],
      ["where p.id = $1", [adminPhotoRow({ event_name: "Intramurals" })]],
    ]);
    const res = await photoPatch(
      req(`/api/v1/admin/photos/${PHOTO_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ event_id: EVENT_ID, caption: "Fixed" }),
      }),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.event.name).toBe("Intramurals");

    scriptDb([["update public.photos set event_id", []]]);
    const missing = await photoPatch(
      req(`/api/v1/admin/photos/${PHOTO_ID}`, { method: "PATCH", body: JSON.stringify({ caption: "x" }) }),
      withParams(PHOTO_ID),
    );
    expect(missing.status).toBe(404);
  });

  it("DELETE: storage first, open reports closed as removed with notifications, then row → 204", async () => {
    const order: string[] = [];
    deleteObjectsMock.mockImplementation(async () => {
      order.push("storage");
    });
    scriptDb([
      ["where p.id = $1", [adminPhotoRow()]],
      ["select id, reporter_id from public.reports", [{ id: REPORT_ID, reporter_id: USER_ID }]],
      ["set status = 'removed'", [{ id: REPORT_ID }]],
      ["insert into public.notifications", [{ id: "nnn" }]],
      ["delete from public.photos", () => { order.push("row"); return [{ id: PHOTO_ID }]; }],
    ]);
    const res = await photoDelete(req(`/api/v1/admin/photos/${PHOTO_ID}`, { method: "DELETE" }), withParams(PHOTO_ID));
    expect(res.status).toBe(204);
    expect(order[0]).toBe("storage");
    expect(order.at(-1)).toBe("row");
    const notif = db.calls.find((c) => c.sql.includes("insert into public.notifications"))!;
    expect(notif.values[1]).toBe("report_resolved");
    expect(notif.values[3]).toBe("Your removal request was approved and the photo was deleted.");
  });

  it("DELETE: storage failure → 503, row and reports untouched (BR-08)", async () => {
    deleteObjectsMock.mockRejectedValue(new Error("down"));
    scriptDb([["where p.id = $1", [adminPhotoRow()]]]);
    const res = await photoDelete(req(`/api/v1/admin/photos/${PHOTO_ID}`, { method: "DELETE" }), withParams(PHOTO_ID));
    expect(res.status).toBe(503);
    expect(db.calls.some((c) => c.sql.includes("delete from public.photos"))).toBe(false);
    expect(db.calls.some((c) => c.sql.includes("set status = 'removed'"))).toBe(false);
  });
});

describe("admin users", () => {
  it("GET /admin/users/:id returns the uploader summary", async () => {
    scriptDb([
      ["select u.id, u.full_name, u.email", [{
        id: USER_ID,
        full_name: "Mikaela Reyes",
        email: "m@student.stmichaels.edu.ph",
        avatar_url: null,
        club_id: null,
        club_name: null,
        photo_count: 5,
        event_count: 2,
      }]],
    ]);
    const res = await userGet(req(`/api/v1/admin/users/${USER_ID}`), withParams(USER_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: {
        id: USER_ID,
        full_name: "Mikaela Reyes",
        email: "m@student.stmichaels.edu.ph",
        avatar_url: null,
        club: null,
        photo_count: 5,
        event_count: 2,
      },
    });
  });

  it("GET /admin/users/:id/photos pins uploader_id regardless of query params", async () => {
    scriptDb([["order by p.created_at desc", [tileRow(PHOTO_ID)]], ["group by p.status", []]]);
    const res = await userPhotosGet(
      req(`/api/v1/admin/users/${USER_ID}/photos?uploader_id=someone_else&status=approved`),
      withParams(USER_ID),
    );
    expect(res.status).toBe(200);
    const call = lastBrowse("order by p.created_at desc")!;
    const uploaderIndex = call.values.indexOf(USER_ID);
    expect(uploaderIndex).toBeGreaterThan(-1);
    expect(call.values).not.toContain("someone_else");
  });

  it("malformed user id → 404 before any user-summary query", async () => {
    const res = await userGet(req("/api/v1/admin/users/nope"), withParams("nope"));
    expect(res.status).toBe(404);
    // only the auth-time requireUser lookup ran — no summary query
    expect(db.calls.some((c) => c.sql.includes("select u.id, u.full_name"))).toBe(false);
  });
});

describe("authz", () => {
  it("student → 403 and no token → 401 on browse endpoints", async () => {
    const paths = [
      `/api/v1/admin/photos`,
      `/api/v1/admin/photos/${PHOTO_ID}`,
      `/api/v1/admin/users/${USER_ID}`,
      `/api/v1/admin/users/${USER_ID}/photos`,
    ];
    const call = () =>
      Promise.all([
        browseGet(req(paths[0])),
        photoGet(req(paths[1]), withParams(PHOTO_ID)),
        userGet(req(paths[2]), withParams(USER_ID)),
        userPhotosGet(req(paths[3]), withParams(USER_ID)),
      ]);

    authMock.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    for (const res of await call()) expect(res.status).toBe(401);

    authMock.mockResolvedValue({ userId: "user_1" } as unknown as Awaited<ReturnType<typeof auth>>);
    scriptDb([], "student");
    for (const res of await call()) expect(res.status).toBe(403);
  });
});

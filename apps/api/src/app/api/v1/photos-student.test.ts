/* Slice 5c gate tests — student photos (TC-AUTHZ-03/04, TC-GAL-02/04/06,
   TC-UP-13/14). Real withRoute/auth/services; Clerk, DB and storage faked. */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { deleteObjects, signDownloadUrl } from "@/server/lib/storage";
import { GET as mineGet } from "@/app/api/v1/photos/mine/route";
import {
  DELETE as idDelete,
  GET as idGet,
  PATCH as idPatch,
} from "@/app/api/v1/photos/[id]/route";
import { POST as replacePost } from "@/app/api/v1/photos/[id]/replace/route";
import { decodeCursor } from "@/server/lib/pagination";

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

const EVENT_ID = "11111111-2222-4333-8444-555555555555";
const PHOTO_ID = "99999999-8888-4777-8666-555555555555";
const OTHER_ID = "77777777-6666-4555-8444-333333333333";
const CAT_ID = "cccccccc-1111-4222-8333-dddddddddddd";

const userRow = (role: "student" | "admin") => ({
  id: "user_1",
  email: "u@student.stmichaels.edu.ph",
  full_name: "Mikaela Reyes",
  avatar_url: null,
  role,
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
  thumb_path: `thumbs/${EVENT_ID}/user_1/${id}.jpg`,
  batch_id: "66666666-5555-4444-3333-222222222222",
  created_at: "2026-10-12T00:00:00.000Z",
  event_id: EVENT_ID,
  event_name: "Science Fair",
  batch_size: 2,
  ...over,
});

const detailRow = (over: Record<string, unknown> = {}) => ({
  id: PHOTO_ID,
  caption: "Check me out",
  status: "pending",
  rejection_reason: null,
  rejection_note: null,
  width: 1920,
  height: 1280,
  thumb_path: `thumbs/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`,
  original_path: `originals/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`,
  created_at: "2026-10-12T00:00:00.000Z",
  event_id: EVENT_ID,
  event_name: "Science Fair",
  category_id: CAT_ID,
  category_name: "Candid",
  club_id: null,
  club_name: null,
  batch_size: 2,
  batch_id: "66666666-5555-4444-3333-222222222222",
  ...over,
});

const ownedRow = (over: Record<string, unknown> = {}) => ({
  id: PHOTO_ID,
  uploader_id: "user_1",
  event_id: EVENT_ID,
  category_id: CAT_ID,
  club_id: null,
  caption: "Check me out",
  status: "pending",
  rejection_reason: null,
  rejection_note: null,
  replaces_photo_id: null,
  original_path: `originals/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`,
  thumb_path: `thumbs/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`,
  completed: true,
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

const baseDb = (
  extra: (sql: string, values: unknown[]) => unknown[] = () => [],
): ((sql: string, values?: unknown[]) => unknown[]) => (sql, values = []) => {
  // DETAIL_COLUMNS marker — the rich student detail select, never the tiles
  // select (which now also joins events for the TileDTO event ref).
  if (sql.includes("p.caption, p.status, p.rejection_reason")) return [detailRow()];
  if (sql.includes("p.id = $1 and p.uploader_id = $2")) return [ownedRow()];
  if (sql.includes("where exists")) return [{ id: EVENT_ID, name: "Science Fair" }];
  if (sql.includes("count(distinct")) return [{ photos: 5, events: 2 }];
  if (sql.includes("from public.events e where e.id")) return [{ id: EVENT_ID, is_open: true, deadline: new Date(Date.now() + 86_400_000).toISOString(), max_photos: 10, photo_count: 0, my_photo_count: 0 }];
  if (sql.includes("as existing")) return [{ existing: 1 }];
  if (sql.includes("coalesce(sum")) return [{ used: 0 }];
  return extra(sql, values);
};

/** Like baseDb, but [pattern, rows] overrides win first — including explicit
 *  empty rows ("this query returns nothing"), which baseDb cannot express. */
const scripted = (
  overrides: Array<[string, unknown[]]> = [],
): ((sql: string, values?: unknown[]) => unknown[]) => (sql, values = []) => {
  for (const [pattern, rows] of overrides) if (sql.includes(pattern)) return rows;
  return baseDb()(sql, values);
};

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  role = "student";
  signDownloadUrlMock.mockImplementation(async (path: string) => `http://x/${path}`);
  deleteObjectsMock.mockResolvedValue(undefined);
  scriptDb(baseDb());
  authMock.mockResolvedValue({ userId: "user_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /photos/mine", () => {
  it("returns tiles without status, stats meta, event chips; limit+1 fetched", async () => {
    scriptDb(
      baseDb((sql) => (sql.includes("order by p.created_at desc") ? [tileRow(PHOTO_ID), tileRow(OTHER_ID)] : [])),
    );
    const res = await mineGet(req("/api/v1/photos/mine?limit=30"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual({
      id: PHOTO_ID,
      thumb_url: `http://x/thumbs/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`,
      width: 1920,
      height: 1280,
      batch_size: 2,
      batch_id: "66666666-5555-4444-3333-222222222222",
      event: { id: EVENT_ID, name: "Science Fair" },
      created_at: "2026-10-12T00:00:00.000Z",
    });
    expect(body.data[0]).not.toHaveProperty("status"); // TC-AUTHZ-04
    expect(body.meta).toEqual({
      photos: 5,
      events: 2,
      event_chips: [{ id: EVENT_ID, name: "Science Fair" }],
    });
    expect(body.next_cursor).toBeNull();
    const tilesCall = db.calls.find((c) => c.sql.includes("order by p.created_at desc"))!;
    expect(tilesCall.values).toContain(31); // limit + 1 sentinel
  });

  it("TC-GAL-02: event filter flows into SQL; invalid event_id → 422", async () => {
    scriptDb(
      baseDb((sql) => (sql.includes("order by p.created_at desc") ? [] : [])),
    );
    await mineGet(req(`/api/v1/photos/mine?event_id=${EVENT_ID}`));
    const tilesCall = db.calls.find((c) => c.sql.includes("order by p.created_at desc"))!;
    expect(tilesCall.values).toContain(EVENT_ID);

    const bad = await mineGet(req("/api/v1/photos/mine?event_id=nope"));
    expect(bad.status).toBe(422);
  });

  it("returns next_cursor from the sentinel row and pages with the tuple comparison", async () => {
    scriptDb(
      baseDb((sql) =>
        sql.includes("order by p.created_at desc")
          ? [tileRow(PHOTO_ID), tileRow(OTHER_ID), tileRow("33333333-4444-4555-8666-777777777777")]
          : [],
      ),
    );
    const res = await mineGet(req("/api/v1/photos/mine?limit=2"));
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.next_cursor).toBeTruthy();
    expect(decodeCursor(body.next_cursor)).toEqual({ t: tileRow(OTHER_ID).created_at, id: OTHER_ID });

    await mineGet(req(`/api/v1/photos/mine?limit=2&cursor=${encodeURIComponent(body.next_cursor)}`));
    const page2 = db.calls.find((c) => c.sql.includes("(p.created_at, p.id) <"))!;
    expect(page2.values).toContain(OTHER_ID);
  });
});

describe("GET /photos/:id", () => {
  it("returns the student DTO — rejection mapping, no status key", async () => {
    scriptDb(
      scripted([
        ["join public.events", [detailRow({ status: "rejected", rejection_reason: "blurry", rejection_note: "Try closer" })]],
      ]),
    );
    const res = await idGet(req(`/api/v1/photos/${PHOTO_ID}`), withParams(PHOTO_ID));
    expect(res.status).toBe(200);
    const dto = (await res.json()).data;
    expect(dto).not.toHaveProperty("status");
    expect(dto.needs_replacement).toBe(true);
    expect(dto.rejection).toEqual({ reason: "blurry", label: "Blurry", note: "Try closer" });
    expect(dto.original_url).toContain("originals/");
    expect(dto.event).toEqual({ id: EVENT_ID, name: "Science Fair" });
  });

  it("rejection is null for pending photos", async () => {
    scriptDb(baseDb());
    const dto = (await (await idGet(req(`/api/v1/photos/${PHOTO_ID}`), withParams(PHOTO_ID))).json()).data;
    expect(dto.needs_replacement).toBe(false);
    expect(dto.rejection).toBeNull();
  });

  it("TC-AUTHZ-03: another student's photo → 404 (SQL ownership filter)", async () => {
    scriptDb(scripted([["p.uploader_id = $2", []]]));
    const res = await idGet(req(`/api/v1/photos/${OTHER_ID}`), withParams(OTHER_ID));
    expect(res.status).toBe(404);
    const call = db.calls.find((c) => c.sql.includes("p.uploader_id = $2"))!;
    expect(call.values).toContain("user_1"); // ownership enforced in SQL
  });
});

describe("PATCH /photos/:id", () => {
  it("edits caption and returns the updated DTO", async () => {
    scriptDb(
      scripted([
        ["update public.photos set caption", [{ id: PHOTO_ID }]],
        ["join public.events", [detailRow({ caption: "New caption" })]],
      ]),
    );
    const res = await idPatch(
      req(`/api/v1/photos/${PHOTO_ID}`, { method: "PATCH", body: JSON.stringify({ caption: "New caption" }) }),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.caption).toBe("New caption");
    const update = db.calls.find((c) => c.sql.includes("update public.photos set"))!;
    expect(update.sql).not.toContain("event_id"); // BR-12
  });

  it("TC-GAL-04: approved photo → 409 PHOTO_LOCKED", async () => {
    scriptDb(
      scripted([["p.id = $1 and p.uploader_id = $2", [ownedRow({ status: "approved" })]]]),
    );
    const res = await idPatch(
      req(`/api/v1/photos/${PHOTO_ID}`, { method: "PATCH", body: JSON.stringify({ caption: "x" }) }),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("PHOTO_LOCKED");
    expect(db.calls.some((c) => c.sql.includes("update public.photos set"))).toBe(false);
  });

  it("unknown category → 422 VALIDATION_ERROR (FK backstop)", async () => {
    scriptDb(
      baseDb((sql) => {
        if (sql.includes("update public.photos set")) {
          const err = new Error("fk") as Error & { code: string };
          err.code = "23503";
          throw err;
        }
        return [];
      }),
    );
    const res = await idPatch(
      req(`/api/v1/photos/${PHOTO_ID}`, { method: "PATCH", body: JSON.stringify({ category_id: CAT_ID }) }),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.details.fields.category_id).toBeTruthy();
  });
});

describe("DELETE /photos/:id", () => {
  it("deletes both objects before the row (BR-08) → 204", async () => {
    const order: string[] = [];
    deleteObjectsMock.mockImplementation(async () => {
      order.push("storage");
    });
    scriptDb(
      baseDb((sql) => {
        if (sql.includes("delete from public.photos")) {
          order.push("row");
          return [{ id: PHOTO_ID }];
        }
        return [];
      }),
    );
    const res = await idDelete(req(`/api/v1/photos/${PHOTO_ID}`, { method: "DELETE" }), withParams(PHOTO_ID));
    expect(res.status).toBe(204);
    expect(deleteObjectsMock).toHaveBeenCalledWith([
      `originals/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`,
      `thumbs/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`,
    ]);
    expect(order).toEqual(["storage", "row"]);
  });

  it("storage failure → 503 and the row is kept", async () => {
    deleteObjectsMock.mockRejectedValue(new Error("down"));
    scriptDb(baseDb());
    const res = await idDelete(req(`/api/v1/photos/${PHOTO_ID}`, { method: "DELETE" }), withParams(PHOTO_ID));
    expect(res.status).toBe(503);
    expect(db.calls.some((c) => c.sql.includes("delete from public.photos"))).toBe(false);
  });

  it("TC-GAL-04: approved photo → 409 PHOTO_LOCKED", async () => {
    scriptDb(
      scripted([["p.id = $1 and p.uploader_id = $2", [ownedRow({ status: "approved" })]]]),
    );
    const res = await idDelete(req(`/api/v1/photos/${PHOTO_ID}`, { method: "DELETE" }), withParams(PHOTO_ID));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("PHOTO_LOCKED");
  });
});

describe("POST /photos/:id/replace", () => {
  const body = {
    file: { client_id: "aaaaaaaa-1111-4222-8333-bbbbbbbbbbbb", caption: "Retaken", width: 100, height: 100, original_bytes: 1000, thumb_bytes: 100 },
  };

  it("TC-UP-13: rejected photo → new incomplete photo inheriting event/category/club with replaces_photo_id; BR-02 excludes the old photo", async () => {
    scriptDb((sql, values) => {
      if (sql.includes("p.id = $1 and p.uploader_id = $2"))
        return [ownedRow({ status: "rejected", rejection_reason: "blurry" })] as never;
      if (sql.includes("as existing")) {
        expect(values[2]).toBe(PHOTO_ID); // excluded from the BR-02 count
        return [{ existing: 9 }] as never; // old rejected photo excluded → 9 + 1 = 10 ≤ max 10
      }
      if (sql.includes("insert into public.photos")) return [{ id: OTHER_ID }] as never;
      return (baseDb()(sql, values) as never);
    });
    const res = await replacePost(
      req(`/api/v1/photos/${PHOTO_ID}/replace`, { method: "POST", body: JSON.stringify(body) }),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(201);
    const payload = await res.json();
    expect(payload.data.items).toHaveLength(1);
    expect(payload.data.items[0].client_id).toBe(body.file.client_id);
    const insert = db.calls.find((c) => c.sql.includes("insert into public.photos"))!;
    // event, category, club inherited from the rejected photo; replaces id stored
    expect(insert.values).toContain(EVENT_ID);
    expect(insert.values).toContain(CAT_ID);
    expect(insert.values).toContain(PHOTO_ID);
    // upload_completed_at stays null (incomplete until complete)
    expect(insert.sql).not.toContain("upload_completed_at");
  });

  it("TC-UP-14: pending or approved photo → 409 NOT_REPLACEABLE", async () => {
    scriptDb(
      baseDb((sql) =>
        sql.includes("p.id = $1 and p.uploader_id = $2") ? [ownedRow({ status: "pending" })] : [],
      ),
    );
    const res = await replacePost(
      req(`/api/v1/photos/${PHOTO_ID}/replace`, { method: "POST", body: JSON.stringify(body) }),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("NOT_REPLACEABLE");
  });

  it("foreign photo → 404", async () => {
    scriptDb(scripted([["p.id = $1 and p.uploader_id = $2", []]]));
    const res = await replacePost(
      req(`/api/v1/photos/${OTHER_ID}/replace`, { method: "POST", body: JSON.stringify(body) }),
      withParams(OTHER_ID),
    );
    expect(res.status).toBe(404);
  });
});

describe("authz", () => {
  it("no token → 401 on every student photo endpoint", async () => {
    authMock.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    const results = await Promise.all([
      mineGet(req("/api/v1/photos/mine")),
      idGet(req(`/api/v1/photos/${PHOTO_ID}`), withParams(PHOTO_ID)),
      idPatch(req(`/api/v1/photos/${PHOTO_ID}`, { method: "PATCH", body: "{}" }), withParams(PHOTO_ID)),
      idDelete(req(`/api/v1/photos/${PHOTO_ID}`, { method: "DELETE" }), withParams(PHOTO_ID)),
      replacePost(req(`/api/v1/photos/${PHOTO_ID}/replace`, { method: "POST", body: JSON.stringify({ file: { client_id: "aaaaaaaa-1111-4222-8333-bbbbbbbbbbbb", width: 1, height: 1, original_bytes: 1, thumb_bytes: 1 } }) }), withParams(PHOTO_ID)),
    ]);
    for (const res of results) expect(res.status).toBe(401);
  });

  it("admin calling student endpoints → 403", async () => {
    role = "admin";
    scriptDb(baseDb());
    const results = await Promise.all([
      mineGet(req("/api/v1/photos/mine")),
      idGet(req(`/api/v1/photos/${PHOTO_ID}`), withParams(PHOTO_ID)),
    ]);
    for (const res of results) expect(res.status).toBe(403);
  });
});

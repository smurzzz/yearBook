/* Slice 5b gate tests — upload (TC-UP-04…08, 11, 12, 15 + authz + order).
   Real withRoute/auth/services; Clerk SDK, DB socket and storage are faked. */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { objectExists, signUploadUrl } from "@/server/lib/storage";
import { POST as intentsPost } from "@/app/api/v1/photos/upload-intents/route";
import { POST as completePost } from "@/app/api/v1/photos/complete/route";
import { POST as uploadUrlPost } from "@/app/api/v1/photos/[id]/upload-url/route";
import { createUploadIntents } from "@/server/services/uploads";

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
const signUploadUrlMock = vi.mocked(signUploadUrl);
const objectExistsMock = vi.mocked(objectExists);

const req = (path: string, body: unknown) =>
  new NextRequest(`http://api.local${path}`, { method: "POST", body: JSON.stringify(body) });
const withParams = (id: string) => ({ params: Promise.resolve({ id }) });

const EVENT_ID = "11111111-2222-4333-8444-555555555555";
const PHOTO_ID = "99999999-8888-4777-8666-555555555555";
const OLD_ID = "77777777-6666-4555-8444-333333333333";
const future = () => new Date(Date.now() + 86_400_000).toISOString();

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

const eventRow = (over: { is_open?: boolean; deadline?: string; max_photos?: number } = {}) => ({
  id: EVENT_ID,
  name: "Science Fair",
  description: "d",
  cover_key: "science",
  deadline: future(),
  max_photos: 10,
  is_open: true,
  created_at: "2026-10-01T00:00:00.000Z",
  photo_count: 0,
  my_photo_count: 0,
  ...over,
});

const file = (over: Record<string, unknown> = {}) => ({
  client_id: "aaaaaaaa-1111-4222-8333-bbbbbbbbbbbb",
  caption: "",
  width: 1920,
  height: 1280,
  original_bytes: 500_000,
  thumb_bytes: 40_000,
  ...over,
});

const intentBody = (over: Record<string, unknown> = {}) => ({
  event_id: EVENT_ID,
  category_id: "cccccccc-1111-4222-8333-dddddddddddd",
  club_id: null,
  consent: true,
  files: [file()],
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
  if (sql.includes("from public.events")) return [eventRow()];
  if (sql.includes("as existing")) return [{ existing: 0 }];
  if (sql.includes("coalesce(sum")) return [{ used: 0 }];
  return extra(sql, values);
};

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.STORAGE_SOFT_LIMIT_BYTES;
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  role = "student";
  signUploadUrlMock.mockImplementation(async (path: string) => ({
    path,
    upload_url: `http://127.0.0.1:54321/storage/v1/object/upload/sign/yearbook-photos/${path}`,
    token: "t",
  }));
  objectExistsMock.mockResolvedValue(true);
  scriptDb(baseDb());
  authMock.mockResolvedValue({ userId: "user_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /photos/upload-intents — validation order", () => {
  const manyFiles = (n: number) =>
    Array.from({ length: n }, (_, i) => file({ client_id: `aaaaaaaa-1111-4222-8333-${String(i).padStart(12, "0")}` }));

  it("event missing → 404 BEFORE the batch-size check (order: event exists first)", async () => {
    scriptDb((sql) => (sql.includes("from public.events") ? [] : baseDb()(sql)));
    const many = manyFiles(21);
    const res = await intentsPost(req("/api/v1/photos/upload-intents", intentBody({ files: many })));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("TC-UP-06: 21 files → 422 BATCH_TOO_LARGE", async () => {
    const many = manyFiles(21);
    const res = await intentsPost(req("/api/v1/photos/upload-intents", intentBody({ files: many })));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("BATCH_TOO_LARGE");
    expect(body.error.details.max).toBe(20);
    expect(db.calls.some((c) => c.sql.includes("insert into public.photos"))).toBe(false);
  });

  it("0 files → 422 VALIDATION_ERROR", async () => {
    const res = await intentsPost(req("/api/v1/photos/upload-intents", intentBody({ files: [] })));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("TC-UP-07: consent false → 422 CONSENT_REQUIRED (before the open check)", async () => {
    scriptDb((sql) => (sql.includes("from public.events") ? [eventRow({ is_open: false })] : baseDb()(sql)));
    const res = await intentsPost(
      req("/api/v1/photos/upload-intents", intentBody({ consent: false })),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("CONSENT_REQUIRED");
    expect(db.calls.some((c) => c.sql.includes("as existing"))).toBe(false); // BR-02 never ran
  });

  it("TC-UP-04: closed event → 409 EVENT_CLOSED", async () => {
    scriptDb((sql) => (sql.includes("from public.events") ? [eventRow({ is_open: false })] : baseDb()(sql)));
    const res = await intentsPost(req("/api/v1/photos/upload-intents", intentBody()));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("EVENT_CLOSED");
  });

  it("TC-UP-15: deadline exactly now → closed", async () => {
    const atDeadline = new Date().toISOString();
    scriptDb((sql) => (sql.includes("from public.events") ? [eventRow({ deadline: atDeadline })] : baseDb()(sql)));
    const res = await intentsPost(req("/api/v1/photos/upload-intents", intentBody()));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("EVENT_CLOSED");
  });

  it("TC-UP-05: over per-event limit → 409 PHOTO_LIMIT_REACHED with {max, existing, remaining}", async () => {
    scriptDb((sql) => (sql.includes("as existing") ? [{ existing: 8 }] : baseDb()(sql)));
    const three = [file(), file({ client_id: "aaaaaaaa-1111-4222-8333-bbbbbbbbb001" }), file({ client_id: "aaaaaaaa-1111-4222-8333-bbbbbbbbb002" })];
    const res = await intentsPost(req("/api/v1/photos/upload-intents", intentBody({ files: three })));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("PHOTO_LIMIT_REACHED");
    expect(body.error.details).toEqual({ max: 10, existing: 8, remaining: 2 });
  });

  it("byte caps: original over 5 MB → 413 PAYLOAD_TOO_LARGE", async () => {
    const res = await intentsPost(
      req("/api/v1/photos/upload-intents", intentBody({ files: [file({ original_bytes: 6 * 1024 * 1024 })] })),
    );
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(db.calls.some((c) => c.sql.includes("insert into public.photos"))).toBe(false);
  });

  it("TC-UP-08: stored bytes at soft limit → 507 STORAGE_QUOTA_EXCEEDED", async () => {
    process.env.STORAGE_SOFT_LIMIT_BYTES = "1000";
    scriptDb((sql) => (sql.includes("coalesce(sum") ? [{ used: 1500 }] : baseDb()(sql)));
    const res = await intentsPost(req("/api/v1/photos/upload-intents", intentBody()));
    expect(res.status).toBe(507);
    expect((await res.json()).error.code).toBe("STORAGE_QUOTA_EXCEEDED");
    expect(db.calls.some((c) => c.sql.includes("insert into public.photos"))).toBe(false);
  });
});

describe("POST /photos/upload-intents — happy path and idempotency", () => {
  it("201 with batch_id and 2 signed URLs per photo; inserts with completed=null", async () => {
    // The server generates the photo id (used in both object paths); the insert
    // echoes it back — we assert the response id drives the signed paths.
    scriptDb(
      baseDb((sql) => (sql.includes("insert into public.photos") ? [{ id: PHOTO_ID }] : [])),
    );
    const res = await intentsPost(req("/api/v1/photos/upload-intents", intentBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.batch_id).toBeTruthy();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].client_id).toBe(file().client_id);
    expect(body.data.items[0].photo_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.data.items[0].original.upload_url).toContain("storage/v1");
    expect(body.data.items[0].original.token).toBe("t");
    expect(signUploadUrlMock).toHaveBeenCalledTimes(2);
    expect(signUploadUrlMock).toHaveBeenCalledWith(
      `originals/${EVENT_ID}/user_1/${body.data.items[0].photo_id}.jpg`,
    );
    const insert = db.calls.find((c) => c.sql.includes("insert into public.photos"))!;
    expect(insert.sql).toContain("on conflict (uploader_id, client_id) do nothing");
    expect(insert.sql).not.toContain("upload_completed_at = now()");
  });

  it("TC-UP-11: repeat intent with same client_id returns the same photo row (idempotent)", async () => {
    scriptDb(
      baseDb((sql) => {
        if (sql.includes("insert into public.photos")) return []; // conflict
        if (sql.includes("client_id = $2"))
          return [{ id: PHOTO_ID, original_path: `originals/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`, thumb_path: `thumbs/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`, completed: false }];
        return [];
      }),
    );
    const res = await intentsPost(req("/api/v1/photos/upload-intents", intentBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.items[0].photo_id).toBe(PHOTO_ID);
    // Fresh URLs are minted from the EXISTING row's paths.
    expect(signUploadUrlMock).toHaveBeenCalledWith(`originals/${EVENT_ID}/user_1/${PHOTO_ID}.jpg`);
  });
});

describe("POST /photos/complete", () => {
  it("TC-UP-12: missing object → ok:false UPLOAD_NOT_FOUND for that item only", async () => {
    const two = [PHOTO_ID, OLD_ID];
    objectExistsMock.mockImplementation(async (p: string) => !p.includes(PHOTO_ID));
    scriptDb(
      baseDb((sql, values) => {
        if (sql.includes("p.id = any")) {
          const ids = values[1] as string[];
          return [
            { id: PHOTO_ID, original_path: `o/${PHOTO_ID}.jpg`, thumb_path: `t/${PHOTO_ID}.jpg`, completed: false, replaces_photo_id: null },
            { id: OLD_ID, original_path: `o/${OLD_ID}.jpg`, thumb_path: `t/${OLD_ID}.jpg`, completed: false, replaces_photo_id: null },
          ].filter((r) => ids.includes(r.id));
        }
        if (sql.includes("upload_completed_at = now()")) return [{ id: OLD_ID }];
        return [];
      }),
    );
    const res = await completePost(req("/api/v1/photos/complete", { photo_ids: two }));
    expect(res.status).toBe(200);
    const { results } = (await res.json()).data;
    expect(results).toEqual([
      { photo_id: PHOTO_ID, ok: false, code: "UPLOAD_NOT_FOUND" },
      { photo_id: OLD_ID, ok: true },
    ]);
  });

  it("photo not owned → ok:false NOT_FOUND", async () => {
    scriptDb(baseDb(() => []));
    const res = await completePost(req("/api/v1/photos/complete", { photo_ids: [PHOTO_ID] }));
    expect((await res.json()).data.results).toEqual([{ photo_id: PHOTO_ID, ok: false, code: "NOT_FOUND" }]);
  });

  it("replacement: deletes old files, then old row, then completes the new photo", async () => {
    const order: string[] = [];
    const deleteObjects = (await import("@/server/lib/storage")).deleteObjects;
    vi.mocked(deleteObjects).mockImplementation(async () => {
      order.push("storage-delete");
    });
    scriptDb(
      baseDb((sql) => {
        if (sql.includes("p.id = any"))
          return [{ id: PHOTO_ID, original_path: "o/new.jpg", thumb_path: "t/new.jpg", completed: false, replaces_photo_id: OLD_ID }];
        if (sql.includes("p.id = $1 and p.uploader_id = $2"))
          return [{ id: OLD_ID, original_path: "o/old.jpg", thumb_path: "t/old.jpg", completed: true, replaces_photo_id: null }];
        if (sql.includes("delete from public.photos")) {
          order.push("row-delete");
          return [{ id: OLD_ID }];
        }
        if (sql.includes("upload_completed_at = now()")) {
          order.push("complete");
          return [{ id: PHOTO_ID }];
        }
        return [];
      }),
    );
    const res = await completePost(req("/api/v1/photos/complete", { photo_ids: [PHOTO_ID] }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.results).toEqual([{ photo_id: PHOTO_ID, ok: true }]);
    expect(vi.mocked((await import("@/server/lib/storage")).deleteObjects)).toHaveBeenCalledWith(["o/old.jpg", "t/old.jpg"]);
    expect(order).toEqual(["storage-delete", "row-delete", "complete"]);
  });

  it("BR-08: old-file delete fails → 503, old row and new photo kept (retry-safe)", async () => {
    vi.mocked((await import("@/server/lib/storage")).deleteObjects).mockRejectedValue(new Error("down"));
    scriptDb(
      baseDb((sql) => {
        if (sql.includes("p.id = any"))
          return [{ id: PHOTO_ID, original_path: "o/new.jpg", thumb_path: "t/new.jpg", completed: false, replaces_photo_id: OLD_ID }];
        if (sql.includes("p.id = $1 and p.uploader_id = $2"))
          return [{ id: OLD_ID, original_path: "o/old.jpg", thumb_path: "t/old.jpg", completed: true, replaces_photo_id: null }];
        return [];
      }),
    );
    const res = await completePost(req("/api/v1/photos/complete", { photo_ids: [PHOTO_ID] }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
    expect(db.calls.some((c) => c.sql.includes("delete from public.photos"))).toBe(false);
    expect(db.calls.some((c) => c.sql.includes("upload_completed_at = now()"))).toBe(false);
  });
});

describe("POST /photos/:id/upload-url", () => {
  it("returns fresh signed URLs for an own incomplete photo", async () => {
    scriptDb(
      baseDb((sql) =>
        sql.includes("p.id = $1 and p.uploader_id = $2")
          ? [{ id: PHOTO_ID, completed: false, original_path: "o/1.jpg", thumb_path: "t/1.jpg" }]
          : [],
      ),
    );
    const res = await uploadUrlPost(
      req(`/api/v1/photos/${PHOTO_ID}`, {}),
      withParams(PHOTO_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.original.path).toBe("o/1.jpg");
    expect(body.data.thumb.path).toBe("t/1.jpg");
  });

  it("completed photo → 409 ALREADY_COMPLETE", async () => {
    scriptDb(
      baseDb((sql) =>
        sql.includes("p.id = $1 and p.uploader_id = $2")
          ? [{ id: PHOTO_ID, completed: true, original_path: "o/1.jpg", thumb_path: "t/1.jpg" }]
          : [],
      ),
    );
    const res = await uploadUrlPost(req(`/api/v1/photos/${PHOTO_ID}`, {}), withParams(PHOTO_ID));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("ALREADY_COMPLETE");
  });

  it("another student's photo → 404", async () => {
    scriptDb(baseDb(() => []));
    const res = await uploadUrlPost(req(`/api/v1/photos/${PHOTO_ID}`, {}), withParams(PHOTO_ID));
    expect(res.status).toBe(404);
  });
});

describe("authz", () => {
  it("no token → 401 on all upload endpoints", async () => {
    authMock.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    const results = await Promise.all([
      intentsPost(req("/api/v1/photos/upload-intents", intentBody())),
      completePost(req("/api/v1/photos/complete", { photo_ids: [PHOTO_ID] })),
      uploadUrlPost(req(`/api/v1/photos/${PHOTO_ID}`, {}), withParams(PHOTO_ID)),
    ]);
    for (const res of results) expect(res.status).toBe(401);
  });

  it("admin calling student endpoints → 403 FORBIDDEN", async () => {
    role = "admin";
    scriptDb(baseDb());
    const results = await Promise.all([
      intentsPost(req("/api/v1/photos/upload-intents", intentBody())),
      completePost(req("/api/v1/photos/complete", { photo_ids: [PHOTO_ID] })),
    ]);
    for (const res of results) {
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("FORBIDDEN");
    }
    expect(db.calls.some((c) => c.sql.includes("insert into public.photos"))).toBe(false);
  });
});

describe("service-level guard: shape of returned intent items", () => {
  it("signs URLs from the stored paths (originals + thumbs per data-model §7)", async () => {
    scriptDb(
      baseDb((sql) => (sql.includes("insert into public.photos") ? [{ id: PHOTO_ID }] : [])),
    );
    const result = await createUploadIntents({
      uploaderId: "user_1",
      eventId: EVENT_ID,
      categoryId: "cccccccc-1111-4222-8333-dddddddddddd",
      clubId: null,
      consent: true,
      requireConsent: true,
      files: [file()],
    });
    const signed = signUploadUrlMock.mock.calls.map((c) => c[0]);
    const id = result.items[0].photo_id;
    expect(signed[0]).toBe(`originals/${EVENT_ID}/user_1/${id}.jpg`);
    expect(signed[1]).toBe(`thumbs/${EVENT_ID}/user_1/${id}.jpg`);
  });
});

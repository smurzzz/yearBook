/* Slice 5a gate tests — events (TC-EVT-01…05 + authz).
   Real withRoute/auth/services; only Clerk SDK, DB socket and storage are faked. */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { deleteObjects } from "@/server/lib/storage";
import { GET as eventGet, POST as eventPost } from "@/app/api/v1/events/route";
import {
  DELETE as idDelete,
  GET as idGet,
  PATCH as idPatch,
} from "@/app/api/v1/events/[id]/route";
import { effectiveStatus, toEventDto, type EventRow } from "@/server/services/events";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), clerkClient: vi.fn() }));
vi.mock("@/server/lib/db", () => ({ getDb: vi.fn(), pingDb: vi.fn() }));
vi.mock("@/server/lib/storage", () => ({ deleteObjects: vi.fn(), signDownloadUrl: vi.fn() }));

const authMock = vi.mocked(auth);
const getDbMock = vi.mocked(getDb);
const deleteObjectsMock = vi.mocked(deleteObjects);

const req = (path: string, init?: { method?: string; body?: string }) =>
  new NextRequest(`http://api.local${path}`, init);
const withParams = (id: string) => ({ params: Promise.resolve({ id }) });

const EVENT_ID = "11111111-2222-4333-8444-555555555555";
const futureIso = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

const userRow = (role: "student" | "admin") => ({
  id: "user_1",
  email: "user_1@stmichaels.edu.ph",
  full_name: "Mikaela Reyes",
  avatar_url: null,
  role,
  club_id: null,
  club_name: null,
  notify_deadlines: true,
  notify_reviews: true,
  consented_at: "2026-10-01T00:00:00.000Z",
});

const eventRow = (over: Partial<EventRow> = {}): EventRow => ({
  id: EVENT_ID,
  name: "Science Fair",
  description: "Annual science fair",
  cover_key: "science",
  deadline: futureIso(),
  max_photos: 10,
  is_open: true,
  rules: [],
  created_at: "2026-10-01T00:00:00.000Z",
  photo_count: 3,
  my_photo_count: 2,
  ...over,
});

let db: FakeDb;
let role: "student" | "admin";

const scriptDb = (handler: (sql: string, values: unknown[]) => unknown[]) => {
  db = fakeDb((sql, values) =>
    sql.includes("from public.users") ? [userRow(role)] : (handler(sql, values) as never),
  );
  getDbMock.mockReturnValue(db);
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
  deleteObjectsMock.mockResolvedValue(undefined);
  scriptDb(() => []);
  authMock.mockResolvedValue({ userId: "user_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("TC-EVT-03 — effective status", () => {
  const now = Date.now();
  const future = new Date(now + 60_000).toISOString();
  const past = new Date(now - 60_000).toISOString();

  it("open only if is_open AND deadline in the future", () => {
    expect(effectiveStatus(true, future)).toBe("open");
    expect(effectiveStatus(true, past)).toBe("closed");
    expect(effectiveStatus(false, future)).toBe("closed");
    expect(effectiveStatus(false, past)).toBe("closed");
  });

  it("closed at the exact deadline second (now >= deadline)", () => {
    const atDeadline = new Date(now).toISOString();
    expect(effectiveStatus(true, atDeadline)).toBe("closed");
  });

  it("DTO exposes counts per role — student my_photo_count, admin photo_count", () => {
    const row = eventRow();
    const student = toEventDto(row, "student");
    const admin = toEventDto(row, "admin");
    expect(student).not.toHaveProperty("photo_count");
    expect(student.my_photo_count).toBe(2);
    expect(student.status).toBe("open");
    expect(admin).not.toHaveProperty("my_photo_count");
    expect(admin.photo_count).toBe(3);
  });
});

describe("TC-EVT-01 — admin creates event, students see it", () => {
  it("POST → 201 with effective status; inserts row", async () => {
    role = "admin";
    scriptDb((sql) => {
      if (sql.includes("insert into public.events")) return [{ id: EVENT_ID }];
      if (sql.includes("from public.events")) return [eventRow()];
      return [];
    });
    const res = await eventPost(
      req("/api/v1/events", {
        method: "POST",
        body: JSON.stringify({
          name: "Science Fair",
          description: "Annual science fair",
          cover_key: "science",
          deadline: futureIso(),
          max_photos: 10,
          is_open: true,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toMatchObject({ id: EVENT_ID, status: "open", photo_count: 3 });
    expect(db.calls.some((c) => c.sql.includes("insert into public.events"))).toBe(true);
  });

  it("GET /events for a student includes my_photo_count, no admin meta", async () => {
    scriptDb(() => [eventRow()]);
    const res = await eventGet(req("/api/v1/events"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ id: EVENT_ID, my_photo_count: 2, status: "open" });
    expect(body.data[0]).not.toHaveProperty("photo_count");
    expect(body).not.toHaveProperty("meta");
    expect(body.next_cursor).toBeNull();
  });

  it("GET /events for an admin includes photo_count + meta {total, accepting} and ordered SQL", async () => {
    role = "admin";
    scriptDb(() => [eventRow(), eventRow({ id: "22222222-3333-4444-8555-666666666666", is_open: false })]);
    const res = await eventGet(req("/api/v1/events"));
    const body = await res.json();
    expect(body.data[0]).toHaveProperty("photo_count");
    expect(body.meta).toEqual({ total: 2, accepting: 1 });
    const listSql = db.calls.find((c) => c.sql.includes("from public.events"))?.sql ?? "";
    expect(listSql).toContain("order by");
    expect(listSql).toContain("e.is_open and e.deadline > now()");
  });

  it("q filters by name ilike with escaped wildcards", async () => {
    scriptDb(() => []);
    await eventGet(req("/api/v1/events?q=100%25"));
    const call = db.calls.find((c) => c.sql.includes("ilike"));
    expect(call?.sql).toContain("escape");
    expect(call?.values[1]).toBe("%100\\%%");
  });
});

describe("TC-EVT-02 — validation", () => {
  beforeEach(() => {
    role = "admin";
  });

  it("past deadline → 422 VALIDATION_ERROR with fields.deadline", async () => {
    const res = await eventPost(
      req("/api/v1/events", {
        method: "POST",
        body: JSON.stringify({
          name: "Science Fair",
          description: "Annual science fair",
          cover_key: "science",
          deadline: new Date(Date.now() - 3600_000).toISOString(),
          max_photos: 10,
          is_open: true,
        }),
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fields.deadline).toBeTruthy();
  });

  it("name under 2 chars → 422 with fields.name", async () => {
    const res = await eventPost(
      req("/api/v1/events", {
        method: "POST",
        body: JSON.stringify({
          name: "X",
          description: "d",
          cover_key: "science",
          deadline: futureIso(),
          max_photos: 10,
          is_open: true,
        }),
      }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.details.fields.name).toBeTruthy();
  });

  it("PATCH allows a past deadline (closes the event)", async () => {
    scriptDb((sql) => (sql.includes("update public.events") ? [{ id: EVENT_ID }] : sql.includes("from public.events") ? [eventRow({ is_open: true, deadline: new Date(Date.now() - 1000).toISOString(), photo_count: 0, my_photo_count: 0 })] : []));
    const res = await idPatch(
      req(`/api/v1/events/${EVENT_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ deadline: new Date(Date.now() - 3600_000).toISOString() }),
      }),
      withParams(EVENT_ID),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("closed");
  });
});

describe("TC-EVT-04 / TC-EVT-05 — storage-first delete", () => {
  const paths = [
    "originals/e/u/p1.jpg",
    "thumbs/e/u/p1.jpg",
    "originals/e/u/p2.jpg",
    "thumbs/e/u/p2.jpg",
    "originals/e/u/p3.jpg",
    "thumbs/e/u/p3.jpg",
  ];

  it("TC-EVT-04: deletes 6 storage objects first, then the event row → 204", async () => {
    role = "admin";
    const order: string[] = [];
    deleteObjectsMock.mockImplementation(async () => {
      order.push("storage");
    });
    scriptDb((sql) => {
      if (sql.includes("select original_path")) {
        order.push("paths");
        return [
          { original_path: paths[0], thumb_path: paths[1] },
          { original_path: paths[2], thumb_path: paths[3] },
          { original_path: paths[4], thumb_path: paths[5] },
        ];
      }
      if (sql.includes("delete from public.events")) {
        order.push("db-delete");
        return [{ id: EVENT_ID }];
      }
      if (sql.includes("from public.events")) return [eventRow({ photo_count: 3 })];
      return [];
    });

    const res = await idDelete(req(`/api/v1/events/${EVENT_ID}`, { method: "DELETE" }), withParams(EVENT_ID));
    expect(res.status).toBe(204);
    expect(deleteObjectsMock).toHaveBeenCalledWith(paths);
    expect(order.indexOf("storage")).toBeLessThan(order.indexOf("db-delete"));
  });

  it("TC-EVT-05: storage failure → error returned, event row kept", async () => {
    role = "admin";
    deleteObjectsMock.mockRejectedValue(new Error("storage down"));
    scriptDb((sql) => {
      if (sql.includes("select original_path"))
        return [{ original_path: paths[0], thumb_path: paths[1] }];
      if (sql.includes("from public.events")) return [eventRow({ photo_count: 1 })];
      return [];
    });

    const res = await idDelete(req(`/api/v1/events/${EVENT_ID}`, { method: "DELETE" }), withParams(EVENT_ID));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
    expect(db.calls.some((c) => c.sql.includes("delete from public.events"))).toBe(false);
  });

  it("event without photos skips storage and still deletes → 204", async () => {
    role = "admin";
    scriptDb((sql) => (sql.includes("select original_path") ? [] : sql.includes("from public.events") ? [eventRow({ photo_count: 0 })] : []));
    const res = await idDelete(req(`/api/v1/events/${EVENT_ID}`, { method: "DELETE" }), withParams(EVENT_ID));
    expect(res.status).toBe(204);
    expect(deleteObjectsMock).not.toHaveBeenCalled();
  });
});

describe("authz (TC-AUTHZ-01/02)", () => {
  const id = "11111111-2222-4333-8444-555555555555";

  it("no token → 401 on every events endpoint", async () => {
    authMock.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    const results = await Promise.all([
      eventGet(req("/api/v1/events")),
      eventPost(req("/api/v1/events", { method: "POST", body: "{}" })),
      idGet(req(`/api/v1/events/${id}`), withParams(id)),
      idPatch(req(`/api/v1/events/${id}`, { method: "PATCH", body: "{}" }), withParams(id)),
      idDelete(req(`/api/v1/events/${id}`, { method: "DELETE" }), withParams(id)),
    ]);
    for (const res of results) {
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("student POST/PATCH/DELETE → 403 FORBIDDEN", async () => {
    const results = await Promise.all([
      eventPost(req("/api/v1/events", { method: "POST", body: "{}" })),
      idPatch(req(`/api/v1/events/${id}`, { method: "PATCH", body: "{}" }), withParams(id)),
      idDelete(req(`/api/v1/events/${id}`, { method: "DELETE" }), withParams(id)),
    ]);
    for (const res of results) {
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("FORBIDDEN");
    }
    expect(db.calls.some((c) => c.sql.includes("insert into public.events"))).toBe(false);
  });

  it("GET /events/:id unknown or malformed id → 404 NOT_FOUND", async () => {
    // Malformed id is rejected before any SQL runs (a uuid cast would 500).
    const malformed = await idGet(req("/api/v1/events/not-a-uuid"), withParams("not-a-uuid"));
    expect(malformed.status).toBe(404);
    expect(db.calls.some((c) => c.sql.includes("e.id = $1"))).toBe(false);

    // Valid-shape id reaches Postgres and finds no rows → 404.
    const unknown = await idGet(req(`/api/v1/events/${id}`), withParams(id));
    expect(unknown.status).toBe(404);
    expect(db.calls.some((c) => c.sql.includes("e.id = $1"))).toBe(true);
  });
});

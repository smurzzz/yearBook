/* Route-level gate tests (TC-AUTHZ-01/02 + health + maintenance).
   Everything real runs — withRoute, auth primitives, services — only the Clerk
   SDK and the database socket are faked. */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb, pingDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { ok, withRoute } from "@/server/lib/withRoute";
import { GET as healthGet } from "@/app/api/v1/health/route";
import { GET as meGet, POST as mePost } from "@/app/api/v1/me/route";
import { GET as lookupsGet } from "@/app/api/v1/lookups/route";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), clerkClient: vi.fn() }));
vi.mock("@/server/lib/db", () => ({ getDb: vi.fn(), pingDb: vi.fn() }));

const authMock = vi.mocked(auth);
const getDbMock = vi.mocked(getDb);
const pingDbMock = vi.mocked(pingDb);

const req = (path: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) =>
  new NextRequest(`http://api.local${path}`, init);

const studentRow = {
  id: "user_1",
  email: "mikaela@student.stmichaels.edu.ph",
  full_name: "Mikaela Reyes",
  avatar_url: null,
  role: "student",
  club_id: null,
  club_name: null,
  notify_deadlines: true,
  notify_reviews: true,
  consented_at: "2026-10-01T00:00:00.000Z",
};

let db: FakeDb;

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {}); // silence request log lines
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  db = fakeDb((sql) => (sql.includes("from public.users") ? [studentRow] : []));
  getDbMock.mockReturnValue(db);
  pingDbMock.mockResolvedValue(undefined);
  authMock.mockResolvedValue({ userId: "user_1" } as unknown as Awaited<ReturnType<typeof auth>>);
  delete process.env.MAINTENANCE_MODE;
});

describe("GET /api/v1/health", () => {
  it("returns 200 {data:{ok:true}} with a request id", async () => {
    const res = await healthGet(req("/api/v1/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { ok: true } });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns 503 SERVICE_UNAVAILABLE when the DB is unreachable", async () => {
    pingDbMock.mockRejectedValue(new Error("db down"));
    const res = await healthGet(req("/api/v1/health"));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });
});

describe("TC-AUTHZ-01 — every endpoint without a token → 401", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
  });

  it("GET /me", async () => {
    const res = await meGet(req("/api/v1/me"));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("POST /me", async () => {
    const res = await mePost(
      req("/api/v1/me", { method: "POST", body: JSON.stringify({}) }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("GET /lookups", async () => {
    const res = await lookupsGet(req("/api/v1/lookups"));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });
});

describe("TC-AUTHZ-02 — role guard", () => {
  const adminRoute = withRoute({ role: "admin" }, async () => ok({ secret: true }));

  it("student calling an admin route → 403 FORBIDDEN", async () => {
    const res = await adminRoute(req("/api/v1/admin/probe"));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("admin calling an admin route → 200", async () => {
    db = fakeDb((sql) => (sql.includes("from public.users") ? [{ ...studentRow, role: "admin" }] : []));
    getDbMock.mockReturnValue(db);
    const res = await adminRoute(req("/api/v1/admin/probe"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { secret: true } });
  });
});

describe("maintenance mode", () => {
  it("non-health routes → 503 MAINTENANCE_MODE; health stays 200", async () => {
    process.env.MAINTENANCE_MODE = "true";

    const me = await meGet(req("/api/v1/me"));
    expect(me.status).toBe(503);
    expect((await me.json()).error.code).toBe("MAINTENANCE_MODE");

    const res = await healthGet(req("/api/v1/health"));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/lookups", () => {
  it("returns categories + clubs from the database", async () => {
    db = fakeDb((sql) => {
      if (sql.includes("from public.categories")) return [{ id: "c1", name: "Sports" }];
      if (sql.includes("from public.clubs")) return [{ id: "cl1", name: "Drama Club" }];
      return [];
    });
    getDbMock.mockReturnValue(db);

    const res = await lookupsGet(req("/api/v1/lookups"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: {
        categories: [{ id: "c1", name: "Sports" }],
        clubs: [{ id: "cl1", name: "Drama Club" }],
      },
    });
    expect(db.calls[0].sql).toContain("order by sort_order");
  });
});

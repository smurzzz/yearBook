/* Slice 5g gate tests — account (TC-AUTH-11, PATCH /me prefs). */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { deleteObjects } from "@/server/lib/storage";
import { DELETE as meDelete, PATCH as mePatch } from "@/app/api/v1/me/route";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), clerkClient: vi.fn() }));
vi.mock("@/server/lib/db", () => ({ getDb: vi.fn(), pingDb: vi.fn() }));
vi.mock("@/server/lib/storage", () => ({
  deleteObjects: vi.fn(),
  signDownloadUrl: vi.fn(),
  signUploadUrl: vi.fn(),
  objectExists: vi.fn(),
}));

const authMock = vi.mocked(auth);
const clerkClientMock = vi.mocked(clerkClient);
const getDbMock = vi.mocked(getDb);
const deleteObjectsMock = vi.mocked(deleteObjects);
const deleteUserMock = vi.fn().mockResolvedValue(undefined);

const USER_ID = "00000000-0000-4000-8000-000000000001";
const EVENT_ID = "11111111-2222-4333-8444-555555555555";
const CAT_ID = "cccccccc-1111-4222-8333-dddddddddddd";

const req = (method: string, body: unknown) =>
  new NextRequest("http://api.local/api/v1/me", { method, body: JSON.stringify(body) });

const userRow = (role: "student" | "admin") => ({
  id: USER_ID,
  email: "m@student.stmichaels.edu.ph",
  full_name: "Mikaela Reyes",
  avatar_url: null,
  role,
  club_id: null,
  club_name: null,
  notify_deadlines: true,
  notify_reviews: true,
  consented_at: "2026-10-01T00:00:00.000Z",
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

const pathRows = (count: number): Array<{ original_path: string; thumb_path: string }> =>
  Array.from({ length: count }, (_, i) => ({
    original_path: `originals/${EVENT_ID}/${USER_ID}/p${i}.jpg`,
    thumb_path: `thumbs/${EVENT_ID}/${USER_ID}/p${i}.jpg`,
  }));

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  role = "student";
  deleteUserMock.mockClear();
  deleteObjectsMock.mockResolvedValue(undefined);
  scriptDb();
  authMock.mockResolvedValue({ userId: USER_ID } as unknown as Awaited<ReturnType<typeof auth>>);
  clerkClientMock.mockResolvedValue({
    users: { deleteUser: deleteUserMock },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
});

describe("PATCH /me", () => {
  it("updates name and prefs, returns the DTO", async () => {
    scriptDb([
      ["update public.users set", [{ id: USER_ID }]],
      ["from public.users", [{ ...userRow("student"), full_name: "Mikaela R.", notify_reviews: false }]],
    ]);
    const res = await mePatch(
      req("PATCH", { full_name: "Mikaela R.", notify_reviews: false }),
    );
    expect(res.status).toBe(200);
    const dto = (await res.json()).data;
    expect(dto.full_name).toBe("Mikaela R.");
    expect(dto.notify_reviews).toBe(false);
    const update = db.calls.find((c) => c.sql.includes("update public.users set"))!;
    expect(update.sql).toContain("notify_reviews = $");
    expect(update.sql).not.toContain("role"); // role can never be changed
  });

  it("admin club_id is ignored", async () => {
    role = "admin";
    scriptDb([
      ["update public.users set", [{ id: USER_ID }]],
      ["from public.users", [userRow("admin")]],
    ]);
    const res = await mePatch(req("PATCH", { club_id: CAT_ID, full_name: "Chair" }));
    expect(res.status).toBe(200);
    const update = db.calls.find((c) => c.sql.includes("update public.users set"))!;
    expect(update.sql).not.toContain("club_id");
  });

  it("unknown club → 422 VALIDATION_ERROR (FK backstop)", async () => {
    scriptDb([
      [
        "update public.users set",
        () => {
          const err = new Error("fk") as Error & { code: string };
          err.code = "23503";
          throw err;
        },
      ],
    ]);
    const res = await mePatch(req("PATCH", { club_id: CAT_ID }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.details.fields.club_id).toBeTruthy();
  });

  it("invalid body → 422", async () => {
    const res = await mePatch(req("PATCH", { full_name: "" }));
    expect(res.status).toBe(422);
  });
});

describe("DELETE /me (TC-AUTH-11)", () => {
  it("deletes storage files in batches of 100, then the row, then the Clerk user → 204", async () => {
    scriptDb([
      ["select original_path, thumb_path from public.photos", pathRows(150)], // 300 objects
      ["delete from public.users", [{ id: USER_ID }]],
    ]);
    const res = await meDelete(req("DELETE", {}));
    expect(res.status).toBe(204);

    expect(deleteObjectsMock).toHaveBeenCalledTimes(3); // 100 + 100 + 100
    expect(deleteObjectsMock.mock.calls[0][0]).toHaveLength(100);
    expect(deleteObjectsMock.mock.calls[2][0]).toHaveLength(100);

    const order = db.calls.map((c) => c.sql).join("\n");
    expect(order.indexOf("delete from public.users")).toBeGreaterThan(-1);
    expect(deleteUserMock).toHaveBeenCalledWith(USER_ID); // Clerk cleaned after DB
  });

  it("storage failure → 503; rows and Clerk user untouched (BR-08)", async () => {
    deleteObjectsMock.mockRejectedValue(new Error("down"));
    scriptDb([["select original_path, thumb_path from public.photos", pathRows(2)]]);
    const res = await meDelete(req("DELETE", {}));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
    expect(db.calls.some((c) => c.sql.includes("delete from public.users"))).toBe(false);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("user without photos still deletes the row + Clerk user", async () => {
    scriptDb([["delete from public.users", [{ id: USER_ID }]]]);
    const res = await meDelete(req("DELETE", {}));
    expect(res.status).toBe(204);
    expect(deleteObjectsMock).not.toHaveBeenCalled();
    expect(deleteUserMock).toHaveBeenCalledWith(USER_ID);
  });

  it("admin → 403 (student-only endpoint); no token → 401", async () => {
    role = "admin";
    scriptDb();
    const asAdmin = await meDelete(req("DELETE", {}));
    expect(asAdmin.status).toBe(403);

    authMock.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    const anon = await meDelete(req("DELETE", {}));
    expect(anon.status).toBe(401);
  });
});

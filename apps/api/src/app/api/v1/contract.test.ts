/* P6 contract gate — phases.md P6 step 4: "run the shared zod schemas against
   real responses". The schemas in packages/shared are the single contract the
   mock and the backend both follow, so these tests parse REAL route responses
   with the SAME schemas the mobile client uses. A server change that drifts
   from technical/api.md fails here, in CI, instead of on a phone. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  AdminPhotoDTOSchema,
  ErrorEnvelopeSchema,
  RefSchema,
} from "@yearbookhub/shared";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { signDownloadUrl } from "@/server/lib/storage";
import { GET as queueGet } from "@/app/api/v1/admin/review/queue/route";
import { GET as countGet } from "@/app/api/v1/admin/review/count/route";
import { GET as lookupsGet } from "@/app/api/v1/lookups/route";
import { GET as healthGet } from "@/app/api/v1/health/route";
import { POST as approvePost } from "@/app/api/v1/admin/photos/[id]/approve/route";
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

const req = (path: string) => new NextRequest(`http://api.local${path}`);
const PHOTO_ID = "99999999-8888-4777-8666-555555555555";
const EVENT_ID = "11111111-2222-4333-8444-555555555555";
const CATEGORY_ID = "cccccccc-1111-4222-8333-dddddddddddd";

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

/** A row the review query really returns; every field the DTO mapper reads. */
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
  category_id: CATEGORY_ID,
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

const scriptDb = (
  role: "student" | "admin",
  rows: unknown[] = [],
  extra: Array<[string, unknown[]]> = [],
) => {
  const db = fakeDb((sql, values) => {
    void values;
    if (sql.includes("from public.users")) return [userRow(role)] as never;
    for (const [pattern, found] of extra) if (sql.includes(pattern)) return found as never;
    if (sql.includes("order by p.created_at asc")) return rows as never;
    if (sql.includes("as pending")) return [{ pending: 1 }] as never;
    return [] as never;
  }) as FakeDb;
  getDbMock.mockReturnValue(db);
  return db;
};

beforeEach(() => {
  vi.clearAllMocks();
  signDownloadUrlMock.mockImplementation(async (path: string) => `http://storage.test/${path}`);
  authMock.mockResolvedValue({ userId: "user_admin" } as unknown as Awaited<ReturnType<typeof auth>>);
  scriptDb("admin");
});

describe("GET /admin/review/queue", () => {
  it("every item parses with AdminPhotoDTOSchema — the schema the app renders from", async () => {
    scriptDb("admin", [adminPhotoRow(), adminPhotoRow({ id: PHOTO_ID.replace("9", "8") })]);

    const res = await queueGet(req("/api/v1/admin/review/queue"));
    expect(res.status).toBe(200);
    const body = await res.json();

    const parsed = AdminPhotoDTOSchema.array().safeParse(body.data);
    expect(parsed.success ? null : parsed.error.issues).toBe(null);
    expect(body.meta).toEqual({ total_pending: 1 });
    expect(body.next_cursor).toBeNull();
  });

  it("an approved photo still satisfies the same schema (status + rejection shape)", async () => {
    scriptDb("admin", [
      adminPhotoRow({ status: "rejected", rejection_reason: "blurry", rejection_note: null }),
    ]);

    const body = await (await queueGet(req("/api/v1/admin/review/queue"))).json();
    expect(AdminPhotoDTOSchema.array().safeParse(body.data).success).toBe(true);
  });
});

describe("POST /admin/photos/:id/approve", () => {
  it("the mutation response parses with the same schema as the list", async () => {
    scriptDb("admin", [], [["reviewed_at", [adminPhotoRow({ status: "approved" })]]]);

    const res = await approvePost(
      new NextRequest(`http://api.local/api/v1/admin/photos/${PHOTO_ID}/approve`, { method: "POST" }),
      { params: Promise.resolve({ id: PHOTO_ID }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(AdminPhotoDTOSchema.safeParse(body.data).success).toBe(true);
  });
});

describe("GET /admin/review/count", () => {
  it("answers { data: { pending } } — the shape the tab badge renders", async () => {
    scriptDb("admin");
    const body = await (await countGet(req("/api/v1/admin/review/count"))).json();
    expect(body.data).toEqual({ pending: 1 });
  });
});

describe("GET /lookups", () => {
  it("categories and clubs are Refs (id + name), which is what the pickers bind to", async () => {
    const db = scriptDb("student");
    db.calls.length = 0;
    getDbMock.mockImplementation(() =>
      fakeDb((sql) => {
        if (sql.includes("public.categories"))
          return [{ id: CATEGORY_ID, name: "Candid" }] as never;
        if (sql.includes("public.clubs")) return [{ id: "club-1", name: "Robotics Club" }] as never;
        return [] as never;
      }) as never,
    );

    const body = await (await lookupsGet(req("/api/v1/lookups"))).json();
    expect(RefSchema.array().safeParse(body.data.categories).success).toBe(true);
    expect(RefSchema.array().safeParse(body.data.clubs).success).toBe(true);
  });
});

describe("error envelope", () => {
  it("a student calling an admin route returns the documented envelope", async () => {
    scriptDb("student");

    const res = await queueGet(req("/api/v1/admin/review/queue"));
    expect(res.status).toBe(403);
    const body = await res.json();

    const parsed = ErrorEnvelopeSchema.safeParse(body);
    expect(parsed.success ? null : parsed.error.issues).toBe(null);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("GET /health", () => {
  it("stays public and answers { data: { ok: true } }", async () => {
    const body = await (await healthGet(req("/api/v1/health"))).json();
    expect(body.data).toEqual({ ok: true });
  });
});

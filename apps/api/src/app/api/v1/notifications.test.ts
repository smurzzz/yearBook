/* Slice 5g gate tests — notifications & push (TC-NOT-02/03/04/06/07 + authz). */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { GET as listGet } from "@/app/api/v1/notifications/route";
import { POST as readAllPost } from "@/app/api/v1/notifications/read-all/route";
import { POST as readPost } from "@/app/api/v1/notifications/[id]/read/route";
import { PUT as tokenPut, DELETE as tokenDelete } from "@/app/api/v1/me/push-token/route";
import { GET as cronGet } from "@/app/api/cron/daily/route";
import { sendPush } from "@/server/lib/push";
import { deliverPush, runDailyCron } from "@/server/services/notifications";

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

const req = (path: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) =>
  new NextRequest(`http://api.local${path}`, init);
const withParams = (id: string) => ({ params: Promise.resolve({ id }) });

const USER_ID = "00000000-0000-4000-8000-000000000001";
const NOTIF_ID = "77777777-6666-4555-8444-333333333333";
const EVENT_ID = "11111111-2222-4333-8444-555555555555";

const userRow = {
  id: USER_ID,
  email: "m@student.stmichaels.edu.ph",
  full_name: "Mikaela Reyes",
  avatar_url: null,
  role: "student",
  club_id: null,
  club_name: null,
  notify_deadlines: true,
  notify_reviews: true,
  consented_at: "2026-10-01T00:00:00.000Z",
};

const notifRow = (over: Record<string, unknown> = {}) => ({
  id: NOTIF_ID,
  type: "photo_needs_replacement",
  title: "Photo needs replacing",
  body: "Your photo from Science Fair needs a new photo: Blurry.",
  data: { photo_id: "99999999-8888-4777-8666-555555555555" },
  read: false,
  created_at: "2026-10-14T00:00:00.000Z",
  ...over,
});

let db: FakeDb;

type OverrideRows = unknown[] | (() => unknown[]);

const scriptDb = (overrides: Array<[string, OverrideRows]> = []) => {
  db = fakeDb((sql) => {
    for (const [pattern, rows] of overrides) {
      if (sql.includes(pattern)) return (typeof rows === "function" ? rows() : rows) as never;
    }
    if (sql.includes("from public.users")) return [userRow] as never;
    return [] as never;
  });
  getDbMock.mockReturnValue(db);
};

const post = (path: string, body: unknown, headers?: Record<string, string>) =>
  new NextRequest(`http://api.local${path}`, { method: "POST", body: JSON.stringify(body), headers });

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  scriptDb();
  authMock.mockResolvedValue({ userId: USER_ID } as unknown as Awaited<ReturnType<typeof auth>>);
  clerkClientMock.mockResolvedValue({
    users: { deleteUser: vi.fn().mockResolvedValue(undefined) },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
});

describe("GET /notifications", () => {
  it("returns own notifications with unread meta and maps read/data", async () => {
    scriptDb([
      ["order by n.created_at desc", [notifRow(), notifRow({ id: NOTIF_ID, read: true })]],
      ["as unread", [{ unread: 1 }]],
    ]);
    const res = await listGet(req("/api/v1/notifications"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0]).toEqual({
      id: NOTIF_ID,
      type: "photo_needs_replacement",
      title: "Photo needs replacing",
      body: "Your photo from Science Fair needs a new photo: Blurry.",
      data: { photo_id: "99999999-8888-4777-8666-555555555555" },
      read: false,
      created_at: "2026-10-14T00:00:00.000Z",
    });
    expect(body.meta).toEqual({ unread: 1 });
    const listCall = db.calls.find((c) => c.sql.includes("order by n.created_at desc"))!;
    expect(listCall.values[0]).toBe(USER_ID); // scope: own rows only
  });

  it("mark all read → 204; mark one read own → 204, foreign → 404", async () => {
    scriptDb([
      ["set read_at = now()", [{ skipped: true }]],
      ["coalesce(read_at, now())", [{ id: NOTIF_ID }]],
    ]);
    const all = await readAllPost(req("/api/v1/notifications/read-all", { method: "POST" }));
    expect(all.status).toBe(204);
    expect(db.calls[0].values).toContain(USER_ID);

    const one = await readPost(post(`/api/v1/notifications/${NOTIF_ID}/read`, {}, {}), withParams(NOTIF_ID));
    expect(one.status).toBe(204);

    scriptDb([["coalesce(read_at, now())", []]]);
    const foreign = await readPost(post(`/api/v1/notifications/${NOTIF_ID}/read`, {}, {}), withParams(NOTIF_ID));
    expect(foreign.status).toBe(404);
  });
});

describe("PUT/DELETE /me/push-token", () => {
  it("PUT upserts by token → 204; DELETE removes own token → 204", async () => {
    scriptDb([
      ["on conflict (expo_token)", [{ id: "tok" }]],
      ["delete from public.push_tokens", [{ id: "tok" }]],
    ]);
    const body = { expo_token: "ExponentPushToken[abc]", platform: "android" };
    const put = await tokenPut(req("/api/v1/me/push-token", { method: "POST", body: JSON.stringify(body) }));
    expect(put.status).toBe(204);
    const upsert = db.calls.find((c) => c.sql.includes("on conflict (expo_token)"))!;
    expect(upsert.sql).toContain("do update set user_id = excluded.user_id"); // reassign
    expect(upsert.values).toEqual([USER_ID, body.expo_token, "android"]);

    const del = await tokenDelete(req("/api/v1/me/push-token", { method: "DELETE", body: JSON.stringify(body) }));
    expect(del.status).toBe(204);
    const removed = db.calls.find((c) => c.sql.includes("delete from public.push_tokens"))!;
    expect(removed.values).toEqual([body.expo_token, USER_ID]); // scoped to owner
  });

  it("invalid platform → 422", async () => {
    const res = await tokenPut(
      req("/api/v1/me/push-token", { method: "POST", body: JSON.stringify({ expo_token: "t", platform: "web" }) }),
    );
    expect(res.status).toBe(422);
  });
});

describe("push delivery", () => {
  it("TC-NOT-04: toggle off → skipped, provider never called", async () => {
    scriptDb([["select notify_reviews, notify_deadlines", [{ notify_reviews: false, notify_deadlines: true }]]]);
    const send = vi.fn();
    const result = await deliverPush(
      { userId: USER_ID, message: { title: "t", body: "b", data: {} }, toggle: "notify_reviews" },
      { sendPush: send as never },
    );
    expect(result).toEqual({ delivered: 0, skipped: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("TC-NOT-06: DeviceNotRegistered tokens are pruned", async () => {
    scriptDb([
      ["select notify_reviews, notify_deadlines", [{ notify_reviews: true, notify_deadlines: true }]],
      ["select expo_token from public.push_tokens", [{ expo_token: "dead" }, { expo_token: "alive" }]],
    ]);
    const send = vi.fn().mockResolvedValue({ delivered: 1, invalidTokens: ["dead"] });
    const prune = vi.fn().mockResolvedValue(undefined);
    const result = await deliverPush(
      { userId: USER_ID, message: { title: "t", body: "b", data: {} }, toggle: "notify_reviews" },
      { sendPush: send as never, deleteTokens: prune },
    );
    expect(result).toEqual({ delivered: 1, skipped: false });
    expect(prune).toHaveBeenCalledWith(["dead"]);
  });
});

describe("sendPush (unit)", () => {
  it("batches 100 per request and collects DeviceNotRegistered", async () => {
    const tokens = Array.from({ length: 250 }, (_, i) => `tok-${i}`);
    const fetchImpl = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const sent = (JSON.parse(String(init.body)) as Array<{ to: string }>).map((m) => m.to);
      return {
        ok: true,
        json: async () => ({
          data: sent.map((t) =>
            t === "tok-3"
              ? { status: "error", details: { error: "DeviceNotRegistered" } }
              : { status: "ok" },
          ),
        }),
      };
    });
    const result = await sendPush(
      tokens,
      { title: "t", body: "b", data: {} },
      { fetchImpl: fetchImpl as never },
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 100 + 100 + 50
    expect(result.invalidTokens).toEqual(["tok-3"]);
    expect(result.delivered).toBe(249); // 250 tokens, one dead device
  });

  it("provider failure never throws (best-effort)", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("down"));
    const result = await sendPush(["tok"], { title: "t", body: "b", data: {} }, { fetchImpl: fetchImpl as never });
    expect(result).toEqual({ delivered: 0, invalidTokens: [] });
  });
});

describe("GET /api/cron/daily", () => {
  it("TC-NOT-07: 401 without or with a wrong secret; 200 with the right one", async () => {
    process.env.CRON_SECRET = "s3cret";
    const noSecret = await cronGet(req("/api/cron/daily"));
    expect(noSecret.status).toBe(401);

    const wrong = await cronGet(req("/api/cron/daily", { headers: { authorization: "Bearer nope" } }));
    expect(wrong.status).toBe(401);

    scriptDb();
    const okRes = await cronGet(req("/api/cron/daily", { headers: { authorization: "Bearer s3cret" } }));
    expect(okRes.status).toBe(200);
    expect(await okRes.json()).toEqual({
      data: { reminders_sent: 0, events_notified: 0, cleaned: 0 },
    });
  });

  it("fails closed when no CRON_SECRET is configured", async () => {
    const res = await cronGet(req("/api/cron/daily", { headers: { authorization: "Bearer " } }));
    expect(res.status).toBe(401);
  });
});

describe("runDailyCron (service)", () => {
  it("TC-NOT-02: one reminder row per student for due events; reminder_sent_at set; cleanup runs", async () => {
    const event = { id: EVENT_ID, name: "Intramurals", deadline: "2026-10-16T17:00:00.000Z" };
    let inserts = 0;
    const order: string[] = [];
    scriptDb([
      ["and reminder_sent_at is null", [event]],
      ["where role = 'student' and notify_deadlines", [{ id: USER_ID }, { id: "00000000-0000-4000-8000-000000000002" }]],
      ["insert into public.notifications", () => { inserts += 1; return [{ id: "n" }]; }],
      ["set reminder_sent_at = now()", [{ id: EVENT_ID }]],
      ["select notify_reviews, notify_deadlines", [{ notify_reviews: true, notify_deadlines: true }]],
      ["select expo_token from public.push_tokens", [{ expo_token: "tok" }]],
      ["select id, original_path, thumb_path from public.photos", [{ id: "p1", original_path: "o.jpg", thumb_path: "t.jpg" }]],
      ["delete from public.photos", () => { order.push("row"); return [{ id: "p1" }]; }],
    ]);
    const deleteObjects = vi.fn().mockImplementation(async () => {
      order.push("storage");
    });
    const sendPushMock = vi.fn().mockResolvedValue({ delivered: 1, invalidTokens: [] });

    const result = await runDailyCron({ deleteObjects, sendPush: sendPushMock as never });
    expect(result.events_notified).toBe(1);
    expect(result.reminders_sent).toBe(2);
    expect(result.cleaned).toBe(1);
    expect(inserts).toBe(2);
    expect(order).toEqual(["storage", "row"]); // cleanup is storage-first
    expect(sendPushMock).toHaveBeenCalledTimes(2);

    // reminder body uses the spec §11 copy with a Manila deadline label
    const notifInserts = db.calls.filter((c) => c.sql.includes("insert into public.notifications"));
    expect(String(notifInserts[0].values[3])).toContain("closes in 2 days");
    expect(JSON.parse(String(notifInserts[0].values[4]))).toEqual({ event_id: EVENT_ID });

    // BR-11 window + idempotency guard live in the SQL (TC-NOT-03)
    const dueSql = db.calls.find((c) => c.sql.includes("and reminder_sent_at is null"))!.sql;
    expect(dueSql).toContain("interval '48 hours'");
    expect(dueSql).toContain("now() < deadline");
  });

  it("cleanup keeps rows when storage deletion fails", async () => {
    scriptDb([
      ["and reminder_sent_at is null", []],
      ["select id, original_path, thumb_path from public.photos", [{ id: "p1", original_path: "o.jpg", thumb_path: "t.jpg" }]],
    ]);
    const deleteObjects = vi.fn().mockRejectedValue(new Error("down"));
    const result = await runDailyCron({ deleteObjects });
    expect(result.cleaned).toBe(0);
    expect(db.calls.some((c) => c.sql.includes("delete from public.photos"))).toBe(false);
  });
});

describe("authz", () => {
  it("no token → 401 on notification endpoints", async () => {
    authMock.mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    for (const res of await Promise.all([
      listGet(req("/api/v1/notifications")),
      readAllPost(req("/api/v1/notifications/read-all", { method: "POST" })),
      tokenPut(req("/api/v1/me/push-token", { method: "POST", body: "{}" })),
    ])) {
      expect(res.status).toBe(401);
    }
  });
});

/* Bootstrap gate tests (TC-AUTH-05…08) for POST /me + GET /me.
   Real route → withRoute → auth → services → sql; only Clerk and the DB socket
   are faked. The fake DB is stateful: users rows and admin_emails per test. */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/server/lib/db";
import { fakeDb, type FakeDb } from "@/server/lib/fakeDb";
import { GET as meGet, POST as mePost } from "@/app/api/v1/me/route";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), clerkClient: vi.fn() }));
vi.mock("@/server/lib/db", () => ({ getDb: vi.fn(), pingDb: vi.fn() }));

const authMock = vi.mocked(auth);
const clerkClientMock = vi.mocked(clerkClient);
const getDbMock = vi.mocked(getDb);

type Row = Record<string, unknown>;

interface Harness {
  db: FakeDb;
  users: Row | null;
  adminEmails: Set<string>;
}

let h: Harness;

const clerkUser = (email: string) => ({
  primaryEmailAddress: { emailAddress: email, verification: { status: "verified" } },
  emailAddresses: [],
  firstName: "Mikaela",
  lastName: "Reyes",
  imageUrl: "https://img.example/avatar.png",
});

const postMe = (body: unknown) =>
  mePost(
    new NextRequest("http://api.local/api/v1/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const validBody = {
  full_name: "Mikaela Reyes",
  club_id: "3f1c8f9e-2a4b-4c6d-8e0f-1a2b3c4d5e6f",
  consent: true,
  consent_version: "2026-10-v1",
};

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {}); // silence request log lines
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  h = { users: null, adminEmails: new Set(), db: fakeDb() };

  h.db = fakeDb((sql, values) => {
    if (sql.includes("admin_emails")) {
      return [{ is_admin: h.adminEmails.has(String(values[0])) }];
    }
    if (sql.includes("insert into public.users")) {
      h.users = {
        id: values[0],
        email: values[1],
        full_name: values[2],
        avatar_url: values[3],
        role: values[4],
        club_id: values[5],
        club_name: values[5] ? "Drama Club" : null,
        notify_deadlines: true,
        notify_reviews: true,
        consented_at: values[6],
      };
      return [h.users];
    }
    if (sql.includes("from public.users")) return h.users ? [h.users] : [];
    return [];
  });
  getDbMock.mockReturnValue(h.db);

  authMock.mockResolvedValue({ userId: "user_1" } as unknown as Awaited<ReturnType<typeof auth>>);
  clerkClientMock.mockResolvedValue({
    users: { getUser: vi.fn().mockResolvedValue(clerkUser("mikaela.reyes@student.stmichaels.edu.ph")) },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
});

afterEach(() => {
  delete process.env.ALLOWED_EMAIL_DOMAINS;
});

describe("TC-AUTH-05 — bootstrap with email in admin_emails → role admin", () => {
  it("assigns role=admin and ignores club_id for admins", async () => {
    h.adminEmails.add("mikaela.reyes@student.stmichaels.edu.ph");

    const res = await postMe(validBody);
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data.role).toBe("admin");
    expect(data.club).toBeNull(); // admins ignore club_id (authentication.md §6.6)
    expect(data.email).toBe("mikaela.reyes@student.stmichaels.edu.ph");
  });
});

describe("TC-AUTH-06 — other email → student; client cannot send role", () => {
  it("assigns role=student even when the body spoofs role=admin", async () => {
    const res = await postMe({ ...validBody, role: "admin" });
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data.role).toBe("student");
    // the value actually inserted into the DB is student
    const insert = h.db.calls.find((c) => c.sql.includes("insert into public.users"));
    expect(insert?.values[4]).toBe("student");
  });
});

describe("TC-AUTH-07 — disallowed domain → 403", () => {
  it("rejects a non-school email when ALLOWED_EMAIL_DOMAINS is set", async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "school.edu";
    clerkClientMock.mockResolvedValue({
      users: { getUser: vi.fn().mockResolvedValue(clerkUser("someone@gmail.com")) },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);

    const res = await postMe(validBody);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("EMAIL_DOMAIN_NOT_ALLOWED");
    expect(h.db.calls.some((c) => c.sql.includes("insert into public.users"))).toBe(false);
  });

  it("allows the school domain from the same list", async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "other.edu,student.stmichaels.edu.ph";
    const res = await postMe(validBody);
    expect(res.status).toBe(201);
  });
});

describe("TC-AUTH-08 — consent", () => {
  it("without consent:true → 422 CONSENT_REQUIRED and no insert", async () => {
    for (const consent of [false, undefined]) {
      const res = await postMe({ ...validBody, consent });
      expect(res.status).toBe(422);
      expect((await res.json()).error.code).toBe("CONSENT_REQUIRED");
    }
    expect(h.db.calls.some((c) => c.sql.includes("insert into public.users"))).toBe(false);
  });

  it("with consent → consented_at is stored", async () => {
    const res = await postMe(validBody);
    expect(res.status).toBe(201);
    const insert = h.db.calls.find((c) => c.sql.includes("insert into public.users"));
    const consentedAt = insert?.values[6];
    expect(typeof consentedAt).toBe("string");
    expect(Number.isNaN(Date.parse(String(consentedAt)))).toBe(false);
    expect((await res.json()).data.consented_at).toBeTruthy();
  });
});

describe("POST /me idempotency", () => {
  it("returns 200 with the existing row and does not re-insert", async () => {
    h.users = {
      id: "user_1",
      email: "mikaela.reyes@student.stmichaels.edu.ph",
      full_name: "Original Name",
      avatar_url: null,
      role: "student",
      club_id: null,
      club_name: null,
      notify_deadlines: true,
      notify_reviews: true,
      consented_at: "2026-01-01T00:00:00.000Z",
    };

    const res = await postMe({ ...validBody, full_name: "Different Name" });
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.full_name).toBe("Original Name");
    expect(h.db.calls.some((c) => c.sql.includes("insert into public.users"))).toBe(false);
  });
});

describe("GET /me", () => {
  it("404 USER_NOT_FOUND before first-time setup", async () => {
    const res = await meGet(new NextRequest("http://api.local/api/v1/me"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("USER_NOT_FOUND");
  });

  it("200 UserDTO once the row exists", async () => {
    h.users = {
      id: "user_1",
      email: "mikaela.reyes@student.stmichaels.edu.ph",
      full_name: "Mikaela Reyes",
      avatar_url: null,
      role: "student",
      club_id: null,
      club_name: null,
      notify_deadlines: true,
      notify_reviews: true,
      consented_at: "2026-10-01T00:00:00.000Z",
    };
    const res = await meGet(new NextRequest("http://api.local/api/v1/me"));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toMatchObject({ id: "user_1", role: "student", full_name: "Mikaela Reyes" });
  });
});

describe("validation", () => {
  it("invalid body → 422 VALIDATION_ERROR with field details", async () => {
    const res = await postMe({ ...validBody, full_name: "" });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fields.full_name).toBeTruthy();
  });
});

/* This instance signs up Google-only with the Clerk email attribute disabled,
   so a real Google user's address lives on the oauth external account only
   (the live gate's POST /me 401 was exactly this). */
describe("email from the Google external account (no Clerk email addresses)", () => {
  const googleOnlyUser = (email: string) => ({
    primaryEmailAddress: null,
    emailAddresses: [],
    externalAccounts: [
      { provider: "google", emailAddress: email, verification: { status: "verified" } },
    ],
    firstName: "Gate",
    lastName: "Student",
    imageUrl: null,
  });

  const mockClerkUser = (user: unknown) => {
    clerkClientMock.mockResolvedValue({
      users: { getUser: vi.fn().mockResolvedValue(user) },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);
  };

  it("bootstraps with the external account's email", async () => {
    mockClerkUser(googleOnlyUser("mikaela.reyes@student.stmichaels.edu.ph"));

    const res = await postMe(validBody);
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data.email).toBe("mikaela.reyes@student.stmichaels.edu.ph");
  });

  it("still enforces ALLOWED_EMAIL_DOMAINS on that email", async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "school.edu";
    mockClerkUser(googleOnlyUser("someone@gmail.com"));

    const res = await postMe(validBody);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("EMAIL_DOMAIN_NOT_ALLOWED");
  });

  it("no email anywhere → 401 UNAUTHENTICATED", async () => {
    mockClerkUser({
      primaryEmailAddress: null,
      emailAddresses: [],
      externalAccounts: [],
      firstName: null,
      lastName: null,
      imageUrl: null,
    });

    const res = await postMe(validBody);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });
});

/* Account resolution — GET /me decides what happens after the Google sign-in
   (authentication.md §3).

   The classification is shared by the Sign In screen and the session bridge,
   so it is pinned here: a missing users row is "first-time", a foreign
   address is "not-allowed", and an unreachable server is an *error* the
   screen can explain — never a silent "cancelled sign-in". */

import { afterEach, describe, expect, it } from "vitest";
import { resolveAccount } from "./account";
import { configureMockApi, resetApi, type ApiClient } from "./index";
import { ApiError, CLIENT_CODES, isOffline } from "./errors";

/** A client whose /me answers with one scripted outcome. */
const clientWhere = (getMe: () => Promise<unknown>): ApiClient =>
  ({ getMe } as unknown as ApiClient);

afterEach(() => resetApi());

describe("resolveAccount", () => {
  it("reads the role, name and club of an existing account", async () => {
    configureMockApi(
      clientWhere(async () => ({
        role: "student",
        full_name: "Mikaela Reyes",
        club: { id: "c1", name: "Robotics Club" },
      })),
    );

    const result = await resolveAccount();
    expect(result).toEqual({
      kind: "ok",
      profile: {
        role: "student",
        fullName: "Mikaela Reyes",
        club: "Robotics Club",
      },
    });
  });

  it("reports a missing club as none instead of failing", async () => {
    configureMockApi(
      clientWhere(async () => ({ role: "student", full_name: "Mikaela Reyes" })),
    );

    const result = await resolveAccount();
    expect(result).toEqual({
      kind: "ok",
      profile: { role: "student", fullName: "Mikaela Reyes", club: null },
    });
  });

  it("treats a missing users row as the first-time setup gate", async () => {
    configureMockApi(
      clientWhere(async () => {
        throw new ApiError("USER_NOT_FOUND", 404, "No user row");
      }),
    );

    expect(await resolveAccount()).toEqual({ kind: "first-time" });
  });

  it("treats a non-school address as not-allowed so the screen can sign out", async () => {
    configureMockApi(
      clientWhere(async () => {
        throw new ApiError("EMAIL_DOMAIN_NOT_ALLOWED", 403, "Use your school account");
      }),
    );

    expect(await resolveAccount()).toEqual({ kind: "not-allowed" });
  });

  it("keeps an unreachable server an error the screen can explain", async () => {
    /* The API is down (or the phone is on the wrong network). This is NOT a
       cancelled sign-in and NOT a first-time student: the caller has to be
       able to tell them apart, so the error travels with the result. */
    configureMockApi(
      clientWhere(async () => {
        throw new ApiError(CLIENT_CODES.NETWORK, 0, "Can't reach the server");
      }),
    );

    const result = await resolveAccount();
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected an error result");
    expect(isOffline(result.error)).toBe(true);
  });

  it("keeps a server failure an error too", async () => {
    configureMockApi(
      clientWhere(async () => {
        throw new ApiError("INTERNAL", 500, "boom");
      }),
    );

    const result = await resolveAccount();
    expect(result.kind).toBe("error");
  });
});

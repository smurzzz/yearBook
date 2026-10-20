/* Auth primitives per docs/technical/authentication.md §5.
   requireClerkUserId reads the Bearer session token via Clerk's auth();
   if a future @clerk/nextjs version stops accepting non-browser tokens,
   swap the body for @clerk/backend authenticateRequest — same contract. */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserRow, type UserRow } from "@/server/services/users";
import { AppError, forbidden, unauthenticated } from "./errors";

export type Role = "student" | "admin";

export interface Ctx {
  userId: string | null;
  role: Role | null;
  email?: string;
}

/** 401 UNAUTHENTICATED when the Bearer token is missing/invalid. */
export async function requireClerkUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw unauthenticated();
  return userId;
}

/** Loads the users row (404 USER_NOT_FOUND before first-time setup). */
export async function requireUser(userId: string): Promise<UserRow> {
  const row = await getUserRow(userId);
  if (!row) {
    throw new AppError("USER_NOT_FOUND", 404, "Finish setting up your account first.");
  }
  return row;
}

/** 403 FORBIDDEN for anything but admins (TC-AUTHZ-02). */
export async function requireAdmin(ctx: Ctx): Promise<void> {
  if (ctx.role !== "admin") throw forbidden();
}

/** 403 FORBIDDEN for admin callers on student-only endpoints (api.md role column S). */
export async function requireStudent(ctx: Ctx): Promise<void> {
  if (ctx.role !== "student") throw forbidden();
}

export interface ClerkProfile {
  /** Lowercased, verified primary email — never taken from the request body. */
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

/** Server-side Clerk lookup for bootstrap (authentication.md §6.1). */
export async function getClerkProfile(userId: string): Promise<ClerkProfile> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const primary = user.primaryEmailAddress;
  const verified =
    primary?.verification?.status === "verified"
      ? primary
      : (user.emailAddresses.find((e) => e.verification?.status === "verified") ?? null);
  /* This instance signs up Google-only with the email attribute disabled, so a
     real Google user's address lives on the oauth external account, not on
     emailAddresses (the live gate's POST /me 401 was exactly this). Google
     verifies the address at the provider; fall back to it after Clerk's own
     verified/primary email. */
  const external =
    user.externalAccounts?.find(
      (a) =>
        (a.verification?.status === "verified" || a.provider === "google") &&
        typeof a.emailAddress === "string" &&
        a.emailAddress.includes("@"),
    ) ?? null;
  const email = verified?.emailAddress ?? primary?.emailAddress ?? external?.emailAddress;
  if (!email) {
    throw new AppError("UNAUTHENTICATED", 401, "No verified email on the Google account.");
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
  return { email: email.toLowerCase(), fullName, avatarUrl: user.imageUrl || null };
}

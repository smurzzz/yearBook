/* GET/POST /api/v1/me — current user and first-time bootstrap (api.md §3).
   Auth: Clerk session token only — the users row may not exist yet (404 on GET). */

import { LIMITS } from "@yearbookhub/shared";
import { z } from "zod";
import { getClerkProfile } from "@/server/lib/auth";
import { AppError, unauthenticated, validationError } from "@/server/lib/errors";
import {
  bootstrapUser,
  deleteAccount,
  getUserRow,
  toUserDto,
  updateUserById,
} from "@/server/services/users";
import { created, noContent, ok, withRoute } from "@/server/lib/withRoute";

/** Client cannot send `role` — zod strips unknown keys; role comes from admin_emails. */
const BodySchema = z.object({
  full_name: z.string().trim().min(1).max(LIMITS.FULL_NAME_MAX),
  club_id: z.string().uuid().nullable(),
  // optional so a missing value yields CONSENT_REQUIRED (spec), not VALIDATION_ERROR
  consent: z.boolean().optional(),
  consent_version: z.string().min(1),
});

const fieldErrors = (err: z.ZodError): Record<string, string> =>
  Object.fromEntries(err.issues.map((issue) => [issue.path.join(".") || "_", issue.message]));

export const GET = withRoute({ auth: "clerk" }, async (_req, ctx) => {
  const userId = ctx.userId;
  if (!userId) throw unauthenticated();
  const row = await getUserRow(userId);
  if (!row) throw new AppError("USER_NOT_FOUND", 404, "Finish setting up your account first.");
  return ok(toUserDto(row));
});

export const POST = withRoute({ auth: "clerk" }, async (req, ctx) => {
  const userId = ctx.userId;
  if (!userId) throw unauthenticated();

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
      fields: fieldErrors(parsed.error),
    });
  }
  const body = parsed.data;

  if (body.consent !== true) {
    throw new AppError(
      "CONSENT_REQUIRED",
      422,
      "Please confirm you have permission to share these photos.",
    );
  }

  // Verified email/avatar come from Clerk — never from the request (authentication.md §6.1).
  const profile = await getClerkProfile(userId);
  const result = await bootstrapUser({
    id: userId,
    email: profile.email,
    fullName: body.full_name,
    avatarUrl: profile.avatarUrl,
    clubId: body.club_id,
    consentVersion: body.consent_version,
  });

  return result.created ? created(result.user) : ok(result.user);
});

/** PATCH /me — profile + notification prefs (T-026); admin club_id ignored. */
export const PatchSchema = z.object({
  full_name: z.string().trim().min(1).max(LIMITS.FULL_NAME_MAX).optional(),
  club_id: z.string().uuid().nullable().optional(),
  notify_deadlines: z.boolean().optional(),
  notify_reviews: z.boolean().optional(),
});

export const PATCH = withRoute({ auth: "user" }, async (req, ctx) => {
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);
  const user = await updateUserById(ctx.userId!, parsed.data, ctx.role ?? "student");
  return ok(user);
});

/** DELETE /me — student only; storage-first account removal (TC-AUTH-11). */
export const DELETE = withRoute({ role: "student" }, async (_req, ctx) => {
  await deleteAccount(ctx.userId!);
  return noContent();
});

/* Users service — framework-free business rules (architecture.md §3).
   Receives an optional Db so unit tests inject a fake (no database needed). */

import type { Ref, UserDTO } from "@yearbookhub/shared";
import { getDb, type Db } from "@/server/lib/db";
import { allowedDomains } from "@/server/lib/env";
import { nowIso } from "@/server/lib/time";
import {
  deleteUserRow,
  insertUser,
  selectAdminUserSummary,
  selectIsAdminEmail,
  selectUserById,
  selectUserPhotoPaths,
  updateUser,
} from "@/server/sql/users";
import { AppError, notFound } from "@/server/lib/errors";
import { clerkClient } from "@clerk/nextjs/server";
import { deleteObjects } from "@/server/lib/storage";

export type Role = "student" | "admin";

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  club_id: string | null;
  club_name?: string | null;
  notify_deadlines: boolean;
  notify_reviews: boolean;
  consented_at: string;
}

export const toUserDto = (row: UserRow): UserDTO => ({
  id: row.id,
  email: row.email,
  full_name: row.full_name,
  avatar_url: row.avatar_url,
  role: row.role,
  club: row.club_id ? { id: row.club_id, name: row.club_name ?? "" } : null,
  notify_deadlines: row.notify_deadlines,
  notify_reviews: row.notify_reviews,
  consented_at: row.consented_at,
});

/** Returns null when the Clerk user has no row yet (GET /me → 404 USER_NOT_FOUND). */
export async function getUserRow(id: string, db: Db = getDb()): Promise<UserRow | null> {
  const rows = await selectUserById(db, id);
  return (rows[0] as unknown as UserRow | undefined) ?? null;
}

export interface BootstrapInput {
  id: string;
  /** Verified email from Clerk — never from the request body (authentication.md §6). */
  email: string;
  fullName: string;
  avatarUrl: string | null;
  clubId: string | null;
  consentVersion: string;
}

export interface BootstrapResult {
  user: UserDTO;
  created: boolean;
}

export interface AdminUserSummary {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  club: Ref | null;
  photo_count: number;
  event_count: number;
}

/** PATCH /me — profile + notification prefs. Admin club_id is ignored
 *  (authentication.md §6.6 / api.md §3). */
export async function updateUserById(
  userId: string,
  patch: {
    full_name?: string;
    club_id?: string | null;
    notify_deadlines?: boolean;
    notify_reviews?: boolean;
  },
  role: Role = "student",
  db: Db = getDb(),
): Promise<UserDTO> {
  const sets = { ...patch };
  if (role === "admin") delete sets.club_id;
  try {
    await updateUser(db, userId, sets);
  } catch (err) {
    if ((err as { code?: string }).code === "23503") {
      throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
        fields: { club_id: "Unknown club" },
      });
    }
    throw err;
  }
  const row = await getUserRow(userId, db);
  if (!row) throw notFound();
  return toUserDto(row);
}

const DELETE_BATCH = 100; // storage object batches (api.md §3 DELETE /me)

export interface AccountDeps {
  db?: Db;
  deleteObjects?: (paths: string[]) => Promise<void>;
  deleteClerkUser?: (userId: string) => Promise<void>;
}

/** DELETE /me (TC-AUTH-11): storage files first (BR-08), then the row
 *  (cascade), then the Clerk user. A Clerk failure is logged server-side and
 *  does not undo the already-consistent deletion. */
export async function deleteAccount(userId: string, deps: AccountDeps = {}): Promise<void> {
  const db = deps.db ?? getDb();
  const removeObjects = deps.deleteObjects ?? deleteObjects;
  const removeClerk =
    deps.deleteClerkUser ??
    (async (id: string) => {
      const client = await clerkClient();
      await client.users.deleteUser(id);
    });

  const pathRows = (await selectUserPhotoPaths(db, userId)) as unknown as Array<{
    original_path: string;
    thumb_path: string;
  }>;
  const paths = pathRows.flatMap((p) => [p.original_path, p.thumb_path]);
  for (let i = 0; i < paths.length; i += DELETE_BATCH) {
    try {
      await removeObjects(paths.slice(i, i + DELETE_BATCH));
    } catch {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        503,
        "We couldn't delete your photos. Please try again.",
      );
    }
  }

  await deleteUserRow(db, userId);

  try {
    await removeClerk(userId);
  } catch {
    // Logged without PII (error-handling.md §5); re-sign-up self-heals.
    console.error("clerk user deletion failed after database deletion");
  }
}

/** GET /admin/users/:id — uploader summary for the Uploader Photos sheet. */
export async function getAdminUserSummary(
  userId: string,
  db: Db = getDb(),
): Promise<AdminUserSummary> {
  const rows = (await selectAdminUserSummary(db, userId)) as unknown as Array<{
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    club_id: string | null;
    club_name: string | null;
    photo_count: number;
    event_count: number;
  }>;
  const row = rows[0];
  if (!row) throw notFound();
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    avatar_url: row.avatar_url,
    club: row.club_id ? { id: row.club_id, name: row.club_name ?? "" } : null,
    photo_count: Number(row.photo_count),
    event_count: Number(row.event_count),
  };
}

/**
 * First-time bootstrap (authentication.md §6):
 * domain allowlist → role from admin_emails → idempotent insert.
 * An existing row always wins: returned unchanged, created=false (→ 200).
 */
export async function bootstrapUser(
  input: BootstrapInput,
  db: Db = getDb(),
): Promise<BootstrapResult> {
  const existing = await getUserRow(input.id, db);
  if (existing) return { user: toUserDto(existing), created: false };

  const domains = allowedDomains();
  const domain = input.email.split("@")[1]?.toLowerCase() ?? "";
  if (domains.length > 0 && !domains.includes(domain)) {
    throw new AppError("EMAIL_DOMAIN_NOT_ALLOWED", 403, "Please use your school Google account.");
  }

  const adminFlag = await selectIsAdminEmail(db, input.email);
  const isAdmin = adminFlag[0]?.is_admin === true;
  const role: Role = isAdmin ? "admin" : "student";
  // Admin accounts ignore club_id (authentication.md §6.6).
  const clubId = isAdmin ? null : input.clubId;

  try {
    const inserted = await insertUser(db, {
      id: input.id,
      email: input.email,
      fullName: input.fullName,
      avatarUrl: input.avatarUrl,
      role,
      clubId,
      consentedAt: nowIso(),
      consentVersion: input.consentVersion,
    });

    if (inserted.length === 0) {
      // Lost a race with a concurrent POST /me — the existing row wins.
      const raced = await getUserRow(input.id, db);
      if (!raced) throw new AppError("INTERNAL", 500, "Something went wrong. Please try again.");
      return { user: toUserDto(raced), created: false };
    }

    // Re-read for the joined club name used by the DTO.
    const row = (await getUserRow(input.id, db)) ?? (inserted[0] as unknown as UserRow);
    return { user: toUserDto(row), created: true };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23503") {
      // FK violation — the only FK here is club_id.
      throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
        fields: { club_id: "Unknown club" },
      });
    }
    throw err;
  }
}

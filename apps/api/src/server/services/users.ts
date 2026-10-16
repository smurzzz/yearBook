/* Users service — framework-free business rules (architecture.md §3).
   Receives an optional Db so unit tests inject a fake (no database needed). */

import type { UserDTO } from "@yearbookhub/shared";
import { getDb, type Db } from "@/server/lib/db";
import { allowedDomains } from "@/server/lib/env";
import { AppError } from "@/server/lib/errors";
import { nowIso } from "@/server/lib/time";
import { insertUser, selectIsAdminEmail, selectUserById } from "@/server/sql/users";

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

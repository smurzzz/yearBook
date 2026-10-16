/* Pagination (api.md §1): ?limit=30&cursor=<opaque>; limit max 60; invalid → 422. */

import { AppError } from "./errors";

export const DEFAULT_LIMIT = 30;
export const MAX_LIMIT = 60;

export interface Page {
  limit: number;
  cursor: string | null;
}

export const parsePage = (url: URL, defaultLimit: number = DEFAULT_LIMIT): Page => {
  const raw = url.searchParams.get("limit");
  let limit = defaultLimit;
  if (raw !== null) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
      throw new AppError("VALIDATION_ERROR", 422, "limit must be an integer between 1 and 60.", {
        fields: { limit: `1–${MAX_LIMIT}` },
      });
    }
    limit = n;
  }
  return { limit, cursor: url.searchParams.get("cursor") };
};

/** Opaque cursor: base64url JSON. Keep payloads small — callers pass primitives. */
export const encodeCursor = (value: Record<string, string | number>): string =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

export const decodeCursor = (cursor: string): Record<string, string | number> => {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
    return parsed as Record<string, string | number>;
  } catch {
    throw new AppError("VALIDATION_ERROR", 422, "Invalid cursor.", { fields: { cursor: "invalid" } });
  }
};

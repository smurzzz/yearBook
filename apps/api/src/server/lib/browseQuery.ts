/* Shared query parsing for GET /admin/photos and GET /admin/users/:id/photos
   (api.md §3): all filters optional, AND-combined; q ≤ 80; `to` covers the
   whole Manila day; invalid values → 422 with details.fields. */

import { PHOTO_STATUS } from "@yearbookhub/shared";
import { AppError } from "./errors";
import { parsePage, type Page } from "./pagination";
import { manilaDayEndExclusive } from "./time";
import type { AdminFilter } from "@/server/sql/photos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const invalid = (field: string): AppError =>
  new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
    fields: { [field]: "invalid" },
  });

export interface BrowseQuery {
  filter: AdminFilter;
  page: Page;
  countOnly: boolean;
}

/** `fixedUploaderId` pins uploader_id (uploader photos sheet) and ignores the param. */
export const parseBrowseQuery = (url: URL, fixedUploaderId: string | null = null): BrowseQuery => {
  const p = url.searchParams;

  const uuidField = (name: string): string | null => {
    const v = p.get(name);
    if (v && !UUID.test(v)) throw invalid(name);
    return v;
  };

  const status = p.get("status");
  if (status && !(PHOTO_STATUS as readonly string[]).includes(status)) throw invalid("status");

  const q = p.get("q");
  if (q !== null && q.length > 80) throw invalid("q");

  const from = p.get("from");
  if (from && Number.isNaN(Date.parse(from))) throw invalid("from");

  const toRaw = p.get("to");
  let to: string | null = null;
  if (toRaw) {
    to = manilaDayEndExclusive(toRaw);
    if (!to) throw invalid("to");
  }

  return {
    filter: {
      status,
      eventId: uuidField("event_id"),
      categoryId: uuidField("category_id"),
      clubId: uuidField("club_id"),
      uploaderId: fixedUploaderId ?? uuidField("uploader_id"),
      q,
      from,
      to,
      reported: p.get("reported") === "true",
    },
    page: parsePage(url),
    countOnly: p.get("count_only") === "true",
  };
};

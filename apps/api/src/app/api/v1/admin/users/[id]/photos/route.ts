/* GET /api/v1/admin/users/:id/photos — the uploader's photos, same shape as
   /admin/photos with uploader_id pinned (api.md §3). */

import { notFound } from "@/server/lib/errors";
import { parseBrowseQuery } from "@/server/lib/browseQuery";
import { listAdminPhotos } from "@/server/services/photos";
import { list, withRoute } from "@/server/lib/withRoute";

// User ids are Clerk ids (`user_…`), with legacy UUIDs still accepted.
const USER_ID = /^(user_[A-Za-z0-9_-]{8,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export const GET = withRoute({ role: "admin" }, async (req, ctx) => {
  const id = ctx.params?.id;
  if (!id || !USER_ID.test(id)) throw notFound();

  const { filter, page, countOnly } = parseBrowseQuery(req.nextUrl, id);
  const result = await listAdminPhotos(filter, page, countOnly);
  return list(result.tiles, result.nextCursor, result.meta);
});

/* GET /api/v1/admin/photos — browse/filter/search (api.md §3).
   meta.total + meta.summary cover the whole filtered set (TC-BRW-04);
   count_only=true returns meta only (Filter sheet live count). */

import { parseBrowseQuery } from "@/server/lib/browseQuery";
import { listAdminPhotos } from "@/server/services/photos";
import { list, withRoute } from "@/server/lib/withRoute";

export const GET = withRoute({ role: "admin" }, async (req) => {
  const { filter, page, countOnly } = parseBrowseQuery(req.nextUrl);
  const result = await listAdminPhotos(filter, page, countOnly);
  return list(result.tiles, result.nextCursor, result.meta);
});

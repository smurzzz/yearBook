/* GET /api/v1/notifications — own list with unread meta (api.md §3). */

import { listNotifications } from "@/server/services/notifications";
import { parsePage } from "@/server/lib/pagination";
import { list, withRoute } from "@/server/lib/withRoute";

export const GET = withRoute({ auth: "user" }, async (req, ctx) => {
  const { limit, cursor } = parsePage(req.nextUrl);
  const result = await listNotifications(ctx.userId!, { limit, cursor });
  return list(result.notifications, result.nextCursor, { unread: result.unread });
});

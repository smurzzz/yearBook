/* GET /api/v1/photos/mine — own completed photos, tiles + stats (api.md §3).
   Student tiles carry no status anywhere (TC-AUTHZ-04). */

import { listMine } from "@/server/services/photos";
import { AppError } from "@/server/lib/errors";
import { parsePage } from "@/server/lib/pagination";
import { list, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withRoute({ role: "student" }, async (req, ctx) => {
  const url = req.nextUrl;
  const { limit, cursor } = parsePage(url);

  const eventId = url.searchParams.get("event_id");
  if (eventId && !UUID.test(eventId)) {
    throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
      fields: { event_id: "invalid" },
    });
  }

  const result = await listMine(ctx.userId!, { eventId: eventId ?? null, limit, cursor });
  return list(result.tiles, result.nextCursor, result.meta);
});

/* GET /api/v1/admin/review/queue — pending photos, oldest first (api.md §3).
   Default limit 20; meta.total_pending drives the progress label. */

import { listReviewQueue } from "@/server/services/review";
import { AppError } from "@/server/lib/errors";
import { parsePage } from "@/server/lib/pagination";
import { list, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withRoute({ role: "admin" }, async (req) => {
  const url = req.nextUrl;
  const { limit, cursor } = parsePage(url, 20);

  const eventId = url.searchParams.get("event_id");
  if (eventId && !UUID.test(eventId)) {
    throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
      fields: { event_id: "invalid" },
    });
  }

  const result = await listReviewQueue({ eventId: eventId ?? null, limit, cursor });
  return list(result.photos, result.nextCursor, { total_pending: result.totalPending });
});

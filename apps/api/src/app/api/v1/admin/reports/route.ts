/* GET /api/v1/admin/reports — removal requests (api.md §3).
   status=open (default) | resolved | all; items carry the photo tile. */

import { AppError } from "@/server/lib/errors";
import { parsePage } from "@/server/lib/pagination";
import { listReports } from "@/server/services/reports";
import { signDownloadUrl } from "@/server/lib/storage";
import { list, withRoute } from "@/server/lib/withRoute";

const STATUSES = new Set(["open", "resolved", "all"]);

export const GET = withRoute({ role: "admin" }, async (req) => {
  const url = req.nextUrl;
  const { limit, cursor } = parsePage(url);
  const status = url.searchParams.get("status");
  if (status && !STATUSES.has(status)) {
    throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
      fields: { status: "invalid" },
    });
  }

  const result = await listReports({ status, limit, cursor }, { signDownloadUrl });
  return list(result.reports, result.nextCursor);
});

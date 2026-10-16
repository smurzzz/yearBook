/* GET /api/v1/health — public liveness + DB check (api.md §3).
   Stays 200 during maintenance; 503 when the database is unreachable. */

import { pingDb } from "@/server/lib/db";
import { AppError } from "@/server/lib/errors";
import { ok, withRoute } from "@/server/lib/withRoute";

export const GET = withRoute({ auth: "public" }, async () => {
  try {
    await pingDb();
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE", 503, "Service unavailable. Please try again.");
  }
  return ok({ ok: true });
});

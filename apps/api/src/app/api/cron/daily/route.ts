/* GET /api/cron/daily — reminders (BR-11) + incomplete-upload cleanup
   (api.md §3). Outside /v1; guarded by CRON_SECRET (TC-NOT-07: 401 without).
   No secret configured → deny every call (fail closed). */

import { env } from "@/server/lib/env";
import { unauthenticated } from "@/server/lib/errors";
import { runDailyCron } from "@/server/services/notifications";
import { ok, withRoute } from "@/server/lib/withRoute";

export const GET = withRoute({ auth: "public" }, async (req) => {
  const secret = env().CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || header !== `Bearer ${secret}`) throw unauthenticated();
  return ok(await runDailyCron());
});

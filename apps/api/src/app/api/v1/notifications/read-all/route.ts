/* POST /api/v1/notifications/read-all — mark every own notification read. */

import { markAllReadForUser } from "@/server/services/notifications";
import { noContent, withRoute } from "@/server/lib/withRoute";

export const POST = withRoute({ auth: "user" }, async (_req, ctx) => {
  await markAllReadForUser(ctx.userId!);
  return noContent();
});

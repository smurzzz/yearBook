/* POST /api/v1/notifications/:id/read — own notification only (404 otherwise). */

import { markOneRead } from "@/server/services/notifications";
import { noContent, withRoute } from "@/server/lib/withRoute";

export const POST = withRoute({ auth: "user" }, async (_req, ctx) => {
  await markOneRead(ctx.userId!, ctx.params?.id ?? "");
  return noContent();
});

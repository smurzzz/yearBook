/* POST /api/v1/admin/photos/:id/approve — approve (api.md §3). No notification (BR-10). */

import { notFound } from "@/server/lib/errors";
import { decide } from "@/server/services/review";
import { ok, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = withRoute({ role: "admin" }, async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id || !UUID.test(id)) throw notFound();
  return ok(await decide({ photoId: id, adminId: ctx.userId!, action: "approve" }));
});

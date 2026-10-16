/* GET /api/v1/admin/users/:id — uploader summary (api.md §3). */

import { notFound } from "@/server/lib/errors";
import { getAdminUserSummary } from "@/server/services/users";
import { ok, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withRoute({ role: "admin" }, async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id || !UUID.test(id)) throw notFound();
  return ok(await getAdminUserSummary(id));
});

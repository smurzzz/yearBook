/* GET /api/v1/admin/users/:id — uploader summary (api.md §3). */

import { notFound } from "@/server/lib/errors";
import { getAdminUserSummary } from "@/server/services/users";
import { ok, withRoute } from "@/server/lib/withRoute";

// User ids are Clerk ids (`user_…`), with legacy UUIDs still accepted.
const USER_ID = /^(user_[A-Za-z0-9_-]{8,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export const GET = withRoute({ role: "admin" }, async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id || !USER_ID.test(id)) throw notFound();
  return ok(await getAdminUserSummary(id));
});

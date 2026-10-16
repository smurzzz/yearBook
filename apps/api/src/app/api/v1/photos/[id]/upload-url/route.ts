/* POST /api/v1/photos/:id/upload-url — fresh signed URLs for an own incomplete
   photo (api.md §3); 409 ALREADY_COMPLETE when the upload already finished. */

import { notFound } from "@/server/lib/errors";
import { freshUploadUrls } from "@/server/services/uploads";
import { ok, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = withRoute({ role: "student" }, async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id || !UUID.test(id)) throw notFound();
  const urls = await freshUploadUrls(ctx.userId!, id);
  return ok(urls);
});

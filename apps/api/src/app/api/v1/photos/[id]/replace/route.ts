/* POST /api/v1/photos/:id/replace — intent for replacing a rejected photo
   (api.md §3). Response shape = single-item upload-intents result. */

import { z } from "zod";
import { notFound, validationError } from "@/server/lib/errors";
import { replacePhoto } from "@/server/services/photos";
import { IntentFileSchema } from "../../upload-intents/route";
import { created, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ReplaceBodySchema = z.object({ file: IntentFileSchema });

export const POST = withRoute({ role: "student" }, async (req, ctx) => {
  const id = ctx.params?.id;
  if (!id || !UUID.test(id)) throw notFound();

  const parsed = ReplaceBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);

  const result = await replacePhoto(ctx.userId!, id, parsed.data.file);
  return created(result);
});

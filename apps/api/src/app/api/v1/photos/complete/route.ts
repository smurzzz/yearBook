/* POST /api/v1/photos/complete — confirm uploaded photos (api.md §3).
   Partial success is normal: per-photo results, not a batch verdict. */

import { LIMITS } from "@yearbookhub/shared";
import { z } from "zod";
import { validationError } from "@/server/lib/errors";
import { completeUploads } from "@/server/services/uploads";
import { ok, withRoute } from "@/server/lib/withRoute";

export const CompleteBodySchema = z.object({
  photo_ids: z.array(z.string().uuid()).min(1).max(LIMITS.MAX_PHOTOS_PER_BATCH),
});

export const POST = withRoute({ role: "student" }, async (req, ctx) => {
  const parsed = CompleteBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);

  const results = await completeUploads(ctx.userId!, parsed.data.photo_ids);
  return ok({ results });
});

/* POST /api/v1/photos/upload-intents — validate batch, get signed upload URLs
   (api.md §3). Length checks are ordered after the event lookup, so the schema
   parses shapes only; the service enforces BATCH_TOO_LARGE / VALIDATION_ERROR. */

import { LIMITS } from "@yearbookhub/shared";
import { z } from "zod";
import { validationError } from "@/server/lib/errors";
import { createUploadIntents } from "@/server/services/uploads";
import { created, withRoute } from "@/server/lib/withRoute";

export const IntentFileSchema = z.object({
  client_id: z.string().uuid(),
  caption: z.string().max(LIMITS.CAPTION_MAX).optional(),
  width: z.number().int().min(1).max(6000),
  height: z.number().int().min(1).max(6000),
  original_bytes: z.number().int().positive(),
  thumb_bytes: z.number().int().positive(),
});

export const IntentBodySchema = z.object({
  event_id: z.string().uuid(),
  category_id: z.string().uuid(),
  club_id: z.string().uuid().nullable().optional(),
  consent: z.boolean().optional(),
  files: z.array(IntentFileSchema),
});

export const POST = withRoute({ role: "student" }, async (req, ctx) => {
  const parsed = IntentBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);

  const result = await createUploadIntents({
    uploaderId: ctx.userId!,
    eventId: parsed.data.event_id,
    categoryId: parsed.data.category_id,
    clubId: parsed.data.club_id ?? null,
    consent: parsed.data.consent,
    requireConsent: true,
    files: parsed.data.files,
  });
  return created(result);
});

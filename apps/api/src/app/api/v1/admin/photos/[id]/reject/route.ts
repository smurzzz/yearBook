/* POST /api/v1/admin/photos/:id/reject — reject with BR-05 rules (api.md §3):
   reason required; `other` requires a non-empty note. Creates the uploader's
   photo_needs_replacement notification row before responding (BR-10). */

import { REJECTION_REASONS } from "@yearbookhub/shared";
import { z } from "zod";
import { notFound, validationError } from "@/server/lib/errors";
import { decide } from "@/server/services/review";
import { ok, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const RejectSchema = z
  .object({
    reason: z.enum(REJECTION_REASONS as unknown as [string, ...string[]]),
    note: z.string().max(300).optional(),
  })
  .refine((b) => b.reason !== "other" || (b.note ?? "").trim().length > 0, {
    message: "A note is required for Other.",
    path: ["note"],
  });

export const POST = withRoute({ role: "admin" }, async (req, ctx) => {
  const id = ctx.params?.id;
  if (!id || !UUID.test(id)) throw notFound();

  const parsed = RejectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);

  const photo = await decide({
    photoId: id,
    adminId: ctx.userId!,
    action: "reject",
    reason: parsed.data.reason,
    note: parsed.data.note ?? null,
  });
  return ok(photo);
});

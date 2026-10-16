/* GET/PATCH/DELETE /api/v1/photos/:id — student photo detail and edits (api.md §3).
   Foreign ids → 404; approved photos → 409 PHOTO_LOCKED; deletes storage-first. */

import { LIMITS } from "@yearbookhub/shared";
import { z } from "zod";
import { notFound, validationError } from "@/server/lib/errors";
import {
  deleteStudentPhoto,
  getStudentPhoto,
  updateStudentPhoto,
} from "@/server/services/photos";
import { noContent, ok, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requireId = (params: Record<string, string> | undefined): string => {
  const id = params?.id;
  if (!id || !UUID.test(id)) throw notFound();
  return id;
};

/** BR-12: no event_id field here — admins retag events via /admin/photos/:id. */
export const PatchSchema = z.object({
  caption: z.string().max(LIMITS.CAPTION_MAX).optional(),
  category_id: z.string().uuid().optional(),
  club_id: z.string().uuid().nullable().optional(),
});

export const GET = withRoute({ role: "student" }, async (_req, ctx) => {
  const photo = await getStudentPhoto(ctx.userId!, requireId(ctx.params));
  return ok(photo);
});

export const PATCH = withRoute({ role: "student" }, async (req, ctx) => {
  const id = requireId(ctx.params);
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);
  const photo = await updateStudentPhoto(ctx.userId!, id, parsed.data);
  return ok(photo);
});

export const DELETE = withRoute({ role: "student" }, async (_req, ctx) => {
  await deleteStudentPhoto(ctx.userId!, requireId(ctx.params));
  return noContent();
});

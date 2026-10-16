/* GET/PATCH/DELETE /api/v1/admin/photos/:id — detail, tag edits, delete
   (api.md §3). Delete is storage-first and closes open reports (BR-08). */

import { z } from "zod";
import { notFound, validationError } from "@/server/lib/errors";
import { noContent, ok, withRoute } from "@/server/lib/withRoute";
import {
  deleteAdminPhoto,
  getAdminPhoto,
  updateAdminPhoto,
} from "@/server/services/photos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requireId = (params: Record<string, string> | undefined): string => {
  const id = params?.id;
  if (!id || !UUID.test(id)) throw notFound();
  return id;
};

/** Admins may change the event (BR-12 correction for "wrong event"). */
export const AdminPatchSchema = z.object({
  event_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  club_id: z.string().uuid().nullable().optional(),
  caption: z.string().max(200).optional(),
});

export const GET = withRoute({ role: "admin" }, async (_req, ctx) =>
  ok(await getAdminPhoto(requireId(ctx.params))),
);

export const PATCH = withRoute({ role: "admin" }, async (req, ctx) => {
  const id = requireId(ctx.params);
  const parsed = AdminPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);
  return ok(await updateAdminPhoto(id, parsed.data));
});

export const DELETE = withRoute({ role: "admin" }, async (_req, ctx) => {
  await deleteAdminPhoto(requireId(ctx.params), ctx.userId!);
  return noContent();
});

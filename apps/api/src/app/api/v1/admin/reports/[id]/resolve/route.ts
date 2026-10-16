/* POST /api/v1/admin/reports/:id/resolve — remove (storage-first, all open
   reports on the photo close) or dismiss; reporter notified (api.md §3). */

import { z } from "zod";
import { notFound, validationError } from "@/server/lib/errors";
import { resolveReport } from "@/server/services/reports";
import { ok, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ResolveBodySchema = z.object({
  action: z.enum(["remove", "dismiss"]),
  note: z.string().max(300).optional(),
});

export const POST = withRoute({ role: "admin" }, async (req, ctx) => {
  const id = ctx.params?.id;
  if (!id || !UUID.test(id)) throw notFound();

  const parsed = ResolveBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);

  const report = await resolveReport({
    reportId: id,
    adminId: ctx.userId!,
    action: parsed.data.action,
    note: parsed.data.note ?? null,
  });
  return ok(report);
});

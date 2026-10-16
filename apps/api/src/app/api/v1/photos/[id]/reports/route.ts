/* POST /api/v1/photos/:id/reports — request removal of an own completed photo
   (api.md §3). BR-07 duplicate → 409 REPORT_EXISTS; foreign photo → 404. */

import { REPORT_REASONS } from "@yearbookhub/shared";
import { z } from "zod";
import { notFound, validationError } from "@/server/lib/errors";
import { createReport } from "@/server/services/reports";
import { created, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ReportBodySchema = z.object({
  reason: z.enum(REPORT_REASONS as unknown as [string, ...string[]]),
  notes: z.string().max(300).optional(),
});

export const POST = withRoute({ role: "student" }, async (req, ctx) => {
  const id = ctx.params?.id;
  if (!id || !UUID.test(id)) throw notFound();

  const parsed = ReportBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);

  const report = await createReport(ctx.userId!, id, {
    reason: parsed.data.reason,
    notes: parsed.data.notes ?? null,
  });
  return created(report);
});

/* GET/PATCH/DELETE /api/v1/events/:id — detail and admin mutations (api.md §3).
   Unknown or malformed ids → 404 (never a Postgres uuid cast error → 500). */

import { notFound, validationError } from "@/server/lib/errors";
import { deleteEvent, getEvent, toEventDto, updateEventById } from "@/server/services/events";
import { EventPatchSchema } from "../route";
import { noContent, ok, withRoute } from "@/server/lib/withRoute";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requireId = (params: Record<string, string> | undefined): string => {
  const id = params?.id;
  if (!id || !UUID.test(id)) throw notFound();
  return id;
};

export const GET = withRoute({ auth: "user" }, async (_req, ctx) => {
  const id = requireId(ctx.params);
  const row = await getEvent(id, ctx.userId!);
  if (!row) throw notFound();
  return ok(toEventDto(row, ctx.role ?? "student"));
});

export const PATCH = withRoute({ role: "admin" }, async (req, ctx) => {
  const id = requireId(ctx.params);
  const parsed = EventPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);
  const event = await updateEventById(id, parsed.data);
  return ok(event);
});

export const DELETE = withRoute({ role: "admin" }, async (_req, ctx) => {
  const id = requireId(ctx.params);
  await deleteEvent(id);
  return noContent();
});

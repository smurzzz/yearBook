/* GET/POST /api/v1/events — catalog (api.md §3).
   GET: both roles (students get my_photo_count, admins get photo_count + meta).
   POST: admin only (authorization.md §1 role gate). */

import { EVENT_COVERS, LIMITS } from "@yearbookhub/shared";
import { z } from "zod";
import { validationError } from "@/server/lib/errors";
import { createEvent, listEvents } from "@/server/services/events";
import { created, list, withRoute } from "@/server/lib/withRoute";

export const EventCreateSchema = z.object({
  name: z.string().trim().min(LIMITS.EVENT_NAME_MIN).max(LIMITS.EVENT_NAME_MAX),
  description: z.string().trim().min(1).max(LIMITS.EVENT_DESC_MAX),
  cover_key: z.enum(EVENT_COVERS as unknown as [string, ...string[]]),
  deadline: z.string().datetime({ offset: true }),
  max_photos: z
    .number()
    .int()
    .min(LIMITS.MAX_PHOTOS_PER_EVENT_MIN)
    .max(LIMITS.MAX_PHOTOS_PER_EVENT_MAX),
  is_open: z.boolean(),
});

/** Any subset; deadline has no future restriction on update (past = closed). */
export const EventPatchSchema = EventCreateSchema.partial();

export const GET = withRoute({ auth: "user" }, async (req, ctx) => {
  const q = req.nextUrl.searchParams.get("q");
  const { events, meta } = await listEvents(ctx.role ?? "student", ctx.userId!, q);
  return list(events, null, meta);
});

export const POST = withRoute({ role: "admin" }, async (req, ctx) => {
  const parsed = EventCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);
  const event = await createEvent(parsed.data, ctx.userId!);
  return created(event);
});

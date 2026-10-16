/* PUT/DELETE /api/v1/me/push-token — register or remove the device token
   (api.md §3). Upsert by token: a device belongs to one user at a time. */

import { z } from "zod";
import { validationError } from "@/server/lib/errors";
import { getDb } from "@/server/lib/db";
import { deletePushToken, upsertPushToken } from "@/server/sql/notifications";
import { noContent, withRoute } from "@/server/lib/withRoute";

export const TokenBodySchema = z.object({
  expo_token: z.string().min(1).max(300),
  platform: z.enum(["android", "ios"]),
});

export const PUT = withRoute({ auth: "user" }, async (req, ctx) => {
  const parsed = TokenBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);
  await upsertPushToken(getDb(), {
    userId: ctx.userId!,
    expoToken: parsed.data.expo_token,
    platform: parsed.data.platform,
  });
  return noContent();
});

export const DELETE = withRoute({ auth: "user" }, async (req, ctx) => {
  const parsed = TokenBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);
  await deletePushToken(getDb(), ctx.userId!, parsed.data.expo_token);
  return noContent();
});

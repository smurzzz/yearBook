/* withRoute — the single wrapper every route handler goes through
   (architecture.md §3): maintenance → auth → role → handler → error mapping →
   request log. Services throw AppError; anything else collapses to INTERNAL. */

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireClerkUserId, requireUser, type Ctx } from "./auth";
import { AppError, isAppError, toErrorEnvelope } from "./errors";
import { env } from "./env";
import { logRequest } from "./logger";

/** public = no token (health only). clerk = valid session token, no users row yet
 *  (GET/POST /me before setup, /lookups). user = users row required (ctx populated). */
export type AuthMode = "public" | "clerk" | "user";

export interface RouteOptions {
  auth?: AuthMode;
  /** Admin-only routes imply auth "user" plus the role check (403 FORBIDDEN). */
  role?: "admin";
}

export interface RouteCtx extends Ctx {
  requestId: string;
}

export type RouteHandler = (req: NextRequest, ctx: RouteCtx) => Promise<Response> | Response;

/* Response helpers — handlers return these; withRoute adds x-request-id. */
export const ok = (data: unknown): NextResponse => NextResponse.json({ data });
export const created = (data: unknown): NextResponse => NextResponse.json({ data }, { status: 201 });
export const noContent = (): NextResponse => new NextResponse(null, { status: 204 });
export const list = (data: unknown[], nextCursor: string | null, meta?: Record<string, unknown>): NextResponse =>
  NextResponse.json(nextCursor === null ? { data, next_cursor: null, ...(meta ? { meta } : {}) } : { data, next_cursor: nextCursor, ...(meta ? { meta } : {}) });

export function withRoute(options: RouteOptions, handler: RouteHandler) {
  return async function routeHandler(req: NextRequest): Promise<Response> {
    const requestId = req.headers.get("x-request-id") ?? randomUUID();
    const route = req.nextUrl.pathname;
    const method = req.method;
    const started = Date.now();

    let ctx: Ctx = { userId: null, role: null };
    let status = 500;
    let code: string | undefined;

    try {
      const mode: AuthMode = options.role ? "user" : (options.auth ?? "public");

      // Maintenance (error-handling.md: health stays 200 — it is public).
      if (mode !== "public" && env().MAINTENANCE_MODE) {
        throw new AppError(
          "MAINTENANCE_MODE",
          503,
          "We're doing some maintenance. Please try again soon.",
        );
      }

      if (mode !== "public") {
        const userId = await requireClerkUserId();
        ctx = { userId, role: null };
        if (mode === "user") {
          const user = await requireUser(userId);
          ctx = { userId: user.id, role: user.role, email: user.email };
          if (options.role === "admin") await requireAdmin(ctx);
        }
      }

      const res = await handler(req, { ...ctx, requestId });
      status = res.status;
      try {
        res.headers.set("x-request-id", requestId);
      } catch {
        /* immutable headers on a plain Response — skip */
      }
      return res;
    } catch (err) {
      const envelope = toErrorEnvelope(err);
      status = envelope.status;
      code = envelope.body.error.code;
      if (!isAppError(err)) {
        // Full error server-side, generic message on the wire (error-handling.md §3).
        console.error(`[${requestId}] ${method} ${route} failed:`, err);
      }
      return NextResponse.json(envelope.body, {
        status: envelope.status,
        headers: { "x-request-id": requestId },
      });
    } finally {
      logRequest({
        requestId,
        route,
        method,
        status,
        ms: Date.now() - started,
        userId: ctx.userId,
        code,
      });
    }
  };
}

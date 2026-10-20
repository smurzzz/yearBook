/* Clerk middleware (authentication.md §5): attaches the session to every /api
   request so auth() can read the Bearer token in route handlers. Nothing is
   "protected" here — withRoute enforces auth per route.

   CORS: the native app never needs it, but the SAME API backs the Expo web
   build (origin localhost:808x → API on :3000), which the browser blocks
   without explicit headers (security.md: no wildcard CORS). Allowlist only:
   the loopback dev origins plus whatever ALLOWED_ORIGINS lists (e.g. the
   laptop's LAN origin when testing from a phone browser). */

import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const LOOPBACK_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:8090",
  "http://localhost:8082",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8090",
  "http://127.0.0.1:8082",
];

const allowedOrigins = (): Set<string> => {
  const extra = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return new Set([...LOOPBACK_ORIGINS, ...extra]);
};

const corsHeaders = (origin: string): Record<string, string> => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-request-id",
  "Access-Control-Expose-Headers": "x-request-id",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const clerk = clerkMiddleware();

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const origin = req.headers.get("origin");
  const allowed = origin !== null && allowedOrigins().has(origin);

  // Preflight carries no Authorization — answer it without the Clerk round-trip.
  if (allowed && req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const res = await clerk(req, ev);
  if (allowed && origin !== null && res) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      res.headers.set(key, value);
    }
  }
  return res ?? NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };

/* Clerk middleware (authentication.md §5): attaches the session to every /api
   request so auth() can read the Bearer token in route handlers. Nothing is
   "protected" here — withRoute enforces auth per route. */

import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = { matcher: ["/api/:path*"] };

/* GET /api/v1/lookups — categories + clubs for pickers (api.md §3).
   Requires a session token but no users row: the First-Time Setup sheet needs
   the club list before POST /me exists. */

import { getLookups } from "@/server/services/lookups";
import { ok, withRoute } from "@/server/lib/withRoute";

export const GET = withRoute({ auth: "clerk" }, async () => ok(await getLookups()));

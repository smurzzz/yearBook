/* GET /api/v1/admin/review/count — pending count for the tab badge. */

import { pendingCount } from "@/server/services/review";
import { ok, withRoute } from "@/server/lib/withRoute";

export const GET = withRoute({ role: "admin" }, async () => ok({ pending: await pendingCount() }));

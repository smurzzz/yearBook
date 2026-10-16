/* Lookups service: categories + clubs for pickers (GET /lookups). */

import type { Ref } from "@yearbookhub/shared";
import { getDb, type Db } from "@/server/lib/db";

export interface Lookups {
  categories: Ref[];
  clubs: Ref[];
}

export async function getLookups(db: Db = getDb()): Promise<Lookups> {
  const categories = await db.unsafe(`select id, name from public.categories order by sort_order, name`);
  const clubs = await db.unsafe(`select id, name from public.clubs order by sort_order, name`);
  return {
    categories: categories as unknown as Ref[],
    clubs: clubs as unknown as Ref[],
  };
}

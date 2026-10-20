/* Lookups — the id ↔ name bridge.

   The store keeps categories and clubs by NAME (that is what the chips and
   the pickers show), but the API works with uuids: upload-intents wants a
   `category_id`, and a photo carries a `club_id`. GET /lookups answers both
   lists with their ids, so one fetch per app session is enough. */

import { api } from "./index";
import type { Lookups } from "./endpoints";

let cache: Lookups | null = null;
let inflight: Promise<Lookups> | null = null;

/** The lookups, fetched once. Concurrent callers share one request. */
export const ensureLookups = async (): Promise<Lookups> => {
  if (cache) return cache;
  if (!inflight) {
    inflight = api
      .lookups()
      .then((result) => {
        cache = result;
        inflight = null;
        return result;
      })
      .catch((error) => {
        inflight = null;
        throw error;
      });
  }
  return inflight;
};

/** The uuid of a category or club by its name; null when unknown. */
export const lookupId = (kind: keyof Lookups, name: string | null): string | null => {
  if (!name || !cache) return null;
  return cache[kind].find((ref) => ref.name === name)?.id ?? null;
};

/** The names, for the chips (the API's list, not the bundled seed). */
export const lookupNames = (kind: keyof Lookups): string[] =>
  cache?.[kind].map((ref) => ref.name) ?? [];

/** Tests and the dev menu reset the cache. */
export const resetLookups = () => {
  cache = null;
  inflight = null;
};

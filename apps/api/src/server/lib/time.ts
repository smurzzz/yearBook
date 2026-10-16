/* Time helpers — all timestamps UTC ISO; display timezone lives in APP_TIMEZONE. */

export const nowIso = (): string => new Date().toISOString();

export const daysFromNowIso = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString();

/** Effective open flag for an event deadline (BR-01 query pattern). */
export const isPast = (iso: string): boolean => new Date(iso).getTime() <= Date.now();

const MANILA_OFFSET_MS = 8 * 3600_000; // UTC+8, no DST

/** Human deadline label for notification copy (spec §11), Manila time. */
export const manilaLabel = (iso: string): string =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(iso));

/** Browse `to` filter: inclusive end of the given Manila day, returned as the
 *  exclusive upper bound (api.md §3 GET /admin/photos). null when unparseable. */
export const manilaDayEndExclusive = (iso: string): string | null => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const local = new Date(t + MANILA_OFFSET_MS);
  const nextMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  return new Date(nextMidnight - MANILA_OFFSET_MS).toISOString();
};

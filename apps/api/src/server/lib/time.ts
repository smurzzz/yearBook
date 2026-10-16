/* Time helpers — all timestamps UTC ISO; display timezone lives in APP_TIMEZONE. */

export const nowIso = (): string => new Date().toISOString();

export const daysFromNowIso = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString();

/** Effective open flag for an event deadline (BR-01 query pattern). */
export const isPast = (iso: string): boolean => new Date(iso).getTime() <= Date.now();

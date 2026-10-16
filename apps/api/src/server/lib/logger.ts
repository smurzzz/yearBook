/* JSON request log line: { ts, requestId, route, method, status, ms, userHash, code? }
   Never logs bodies, emails, captions, tokens, or URLs (error-handling.md §5). */

import { createHash } from "node:crypto";

/** First 8 chars of SHA-256(userId); null when unauthenticated. */
export const userHash = (userId: string | null | undefined): string | null =>
  userId ? createHash("sha256").update(userId).digest("hex").slice(0, 8) : null;

export interface RequestLog {
  requestId: string;
  route: string;
  method: string;
  status: number;
  ms: number;
  userId?: string | null;
  code?: string;
}

export const logRequest = (entry: RequestLog): void => {
  const { userId, ...rest } = entry;
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...rest, userHash: userHash(userId) }));
};

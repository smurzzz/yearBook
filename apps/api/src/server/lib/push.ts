/* Expo Push Notifications sender (technical/integrations.md §3).
   Batches ≤ 100, 8 s timeout, and token pruning on DeviceNotRegistered
   (TC-NOT-06). Push failures never fail the calling request. */

import { env } from "./env";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const TIMEOUT_MS = 8000;
export const PUSH_BATCH_SIZE = 100;

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface PushResult {
  delivered: number;
  invalidTokens: string[];
}

export interface PushDeps {
  fetchImpl?: typeof fetch;
}

interface ExpoReceipt {
  status: string;
  details?: { error?: string };
}

export const sendPush = async (
  tokens: string[],
  message: PushMessage,
  deps: PushDeps = {},
): Promise<PushResult> => {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const invalidTokens: string[] = [];
  let delivered = 0;
  const accessToken = env().EXPO_ACCESS_TOKEN;

  for (let i = 0; i < tokens.length; i += PUSH_BATCH_SIZE) {
    const batch = tokens.slice(i, i + PUSH_BATCH_SIZE);
    let receipts: ExpoReceipt[] = [];
    try {
      const res = await fetchImpl(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(batch.map((to) => ({ to, sound: "default", ...message }))),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) continue; // transient provider failure — never fail the request
      const body = (await res.json()) as { data: ExpoReceipt[] };
      receipts = body.data ?? [];
    } catch {
      continue; // network/timeout — push is best-effort
    }

    receipts.forEach((receipt, index) => {
      if (receipt.status === "ok") delivered += 1;
      else if (receipt.details?.error === "DeviceNotRegistered") invalidTokens.push(batch[index]);
    });
  }

  return { delivered, invalidTokens };
};

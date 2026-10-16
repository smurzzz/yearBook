/* Supabase Storage REST helpers (service role, server-side only).
   Signed upload-url minting for the P5 upload slices lives with those endpoints;
   here are the two primitives every flow needs: signed reads and deletes.
   All external calls use an 8 s timeout (error-handling.md §3). */

import { env } from "./env";

const TIMEOUT_MS = 8000;

const withTimeout = (signal: AbortSignal | undefined) =>
  AbortSignal.any([AbortSignal.timeout(TIMEOUT_MS), ...(signal ? [signal] : [])]);

const storageRequest = async (path: string, init: RequestInit): Promise<Response> => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_BUCKET } = env();
  const res = await fetch(`${SUPABASE_URL}/storage/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...init.headers,
    },
    signal: withTimeout(init.signal ?? undefined),
  });
  if (!res.ok) throw new Error(`storage ${init.method ?? "GET"} failed: ${res.status} (${STORAGE_BUCKET})`);
  return res;
};

/** Short-lived signed download URL for a private-bucket object. */
export const signDownloadUrl = async (objectPath: string): Promise<string> => {
  const { STORAGE_BUCKET, SIGNED_URL_TTL_SECONDS } = env();
  const res = await storageRequest(
    `/object/sign/${STORAGE_BUCKET}/${encodeURIComponent(objectPath)}`,
    { method: "POST", body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }) },
  );
  const body = (await res.json()) as { signedURL: string };
  const url = body.signedURL.startsWith("/") ? body.signedURL : `/${body.signedURL}`;
  return `${env().SUPABASE_URL}/storage/v1${url}`;
};

/** Deletes objects (storage-first delete flows, batched by callers). */
export const deleteObjects = async (objectPaths: string[]): Promise<void> => {
  if (!objectPaths.length) return;
  const { STORAGE_BUCKET } = env();
  await storageRequest(`/object/${STORAGE_BUCKET}`, { method: "DELETE", body: JSON.stringify(objectPaths) });
};

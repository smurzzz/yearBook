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

/** Signed upload URL for a new object: client PUTs the file bytes to `upload_url`.
 *  Response shape per api.md §3 (POST /photos/upload-intents items). */
export const signUploadUrl = async (
  objectPath: string,
): Promise<{ path: string; upload_url: string; token: string }> => {
  const { STORAGE_BUCKET, SIGNED_URL_TTL_SECONDS, SUPABASE_URL } = env();
  const res = await storageRequest(
    `/object/sign/upload/${STORAGE_BUCKET}/${encodeURIComponent(objectPath)}`,
    { method: "POST", body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }) },
  );
  const body = (await res.json()) as { signedURL: string; token: string };
  const url = body.signedURL.startsWith("/") ? body.signedURL : `/${body.signedURL}`;
  return { path: objectPath, upload_url: `${SUPABASE_URL}/storage/v1${url}`, token: body.token };
};

/** True when the object exists (complete verification). 404 → false; any other
 *  storage failure throws so callers can abort with SERVICE_UNAVAILABLE. */
export const objectExists = async (objectPath: string): Promise<boolean> => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_BUCKET } = env();
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodeURIComponent(objectPath)}`,
    {
      method: "HEAD",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      signal: withTimeout(undefined),
    },
  );
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`storage HEAD failed: ${res.status} (${STORAGE_BUCKET})`);
  return true;
};

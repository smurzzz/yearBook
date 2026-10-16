/* HTTP primitives for the app — docs/architecture.md §4 and
   docs/technical/error-handling.md §4 (client rules).

   One place decides: how the bearer token is attached, what an error envelope
   becomes, which requests are retried and how far backoff goes, and which
   global state a failure implies (session expired, maintenance, offline).

   Everything is injected (`fetch`, `getToken`, `sleep`) so the rules are unit
   testable without a server or a device. */

import { ApiError, CLIENT_CODES } from "./errors";

/* ------------------------------ transport ------------------------------ */

export interface HttpResponse {
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<HttpResponse>;

/** Fresh per request: Clerk caches and refreshes, tokens are short-lived. */
export type TokenProvider = (opts?: { skipCache?: boolean }) => Promise<string | null>;

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  query?: Query;
  /** JSON body; omitted for GET/DELETE-without-body. */
  body?: unknown;
  signal?: AbortSignal;
  /** Caller override for the retry budget (uploads use manual Retry). */
  retry?: boolean;
}

export interface HttpClientHooks {
  /** 401 after a fresh-token retry → sign out of Clerk, show Session expired. */
  onUnauthorized?: () => void;
  /** 503 MAINTENANCE_MODE → maintenance screen. */
  onMaintenance?: () => void;
  /** Transport failure after retries → offline banner. */
  onOffline?: () => void;
}

export interface HttpClientOptions extends HttpClientHooks {
  /** `{root}/api/v1` — every path below is appended to it. */
  baseUrl: string;
  getToken: TokenProvider;
  fetch?: FetchLike;
  /** Injectable for tests; default `setTimeout`. */
  sleep?: (ms: number) => Promise<void>;
  /** Hard cap per attempt; a timeout counts as a network failure. */
  timeoutMs?: number;
}

/* ------------------------------- policy ------------------------------- */

/** error-handling.md §4: retry GET only, 2 retries, 500 ms then 1.5 s. */
export const RETRY_DELAYS_MS = [500, 1_500];
const RETRY_STATUSES = new Set([502, 503, 504]);
const DEFAULT_TIMEOUT_MS = 20_000;

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const buildQuery = (query?: Query): string => {
  if (!query) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
};

/* ------------------------------ the client ----------------------------- */

export interface HttpClient {
  request<T>(method: string, path: string, options?: RequestOptions): Promise<T>;
}

export const createHttpClient = (options: HttpClientOptions): HttpClient => {
  const {
    baseUrl,
    getToken,
    sleep = defaultSleep,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    onUnauthorized,
    onMaintenance,
    onOffline,
  } = options;

  const doFetch: FetchLike =
    options.fetch ??
    ((url, init) => fetch(url, init as Parameters<typeof fetch>[1]) as Promise<HttpResponse>);

  const url = (path: string, query?: Query) =>
    `${baseUrl.replace(/\/+$/, "")}${path}${buildQuery(query)}`;

  const requestIdOf = (res: HttpResponse) => res.headers.get("x-request-id") ?? undefined;

  /** Turn a non-2xx response into the documented envelope error. */
  const toError = async (res: HttpResponse): Promise<ApiError> => {
    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    const envelope = (body as { error?: { code?: string; message?: string; details?: Record<string, unknown> } })
      ?.error;

    if (envelope?.code) {
      return new ApiError(
        envelope.code,
        res.status,
        envelope.message ?? "Request failed",
        envelope.details as ApiError["details"],
        requestIdOf(res),
      );
    }
    return new ApiError(
      res.status === 401 ? "UNAUTHENTICATED" : res.status === 403 ? "FORBIDDEN" : "INTERNAL",
      res.status,
      text || `Request failed (${res.status})`,
      undefined,
      requestIdOf(res),
    );
  };

  const parse = async <T>(res: HttpResponse): Promise<T> => {
    if (res.status === 204) return undefined as T;

    const text = await res.text().catch(() => "");
    if (res.ok) {
      if (!text) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new ApiError(CLIENT_CODES.BAD_RESPONSE, res.status, "Malformed response", undefined, requestIdOf(res));
      }
    }

    const error = await toError(res);
    if (error.code === "MAINTENANCE_MODE") onMaintenance?.();
    throw error;
  };

  const request = async <T>(method: string, path: string, req: RequestOptions = {}): Promise<T> => {
    const canRetry = (req.retry ?? true) && method === "GET";
    const delays = canRetry ? RETRY_DELAYS_MS : [];
    let retriesUsed = 0;
    let refreshed = false;
    let token = await getToken();
    let target = url(path, req.query);

    for (;;) {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      let body: string | undefined;
      if (req.body !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(req.body);
      }

      // A hung socket must not pin a screen forever: per-attempt watchdog.
      // The caller's own signal wins (navigation aborts are not failures).
      const controller =
        timeoutMs > 0 && typeof AbortController !== "undefined" && !req.signal
          ? new AbortController()
          : undefined;
      const timer = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : undefined;

      let res: HttpResponse;
      try {
        res = await doFetch(target, {
          method,
          headers,
          body,
          signal: req.signal ?? controller?.signal,
        });
      } catch {
        if (req.signal?.aborted) {
          throw new ApiError(CLIENT_CODES.ABORTED, 0, "Request cancelled");
        }
        if (retriesUsed < delays.length) {
          await sleep(delays[retriesUsed]);
          retriesUsed += 1;
          continue;
        }
        onOffline?.();
        throw new ApiError(CLIENT_CODES.NETWORK, 0, "Can't reach the server", undefined, undefined);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }

      // Token expired: fetch a fresh one and retry exactly once (authentication.md §4).
      if (res.status === 401 && !refreshed) {
        refreshed = true;
        const fresh = await getToken({ skipCache: true });
        if (fresh && fresh !== token) {
          token = fresh;
          continue;
        }
      }
      if (res.status === 401) {
        onUnauthorized?.();
        throw await toError(res);
      }

      if (RETRY_STATUSES.has(res.status) && retriesUsed < delays.length) {
        await sleep(delays[retriesUsed]);
        retriesUsed += 1;
        continue;
      }

      return await parse<T>(res);
    }
  };

  return { request };
};

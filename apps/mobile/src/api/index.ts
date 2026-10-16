/* API entry point — one client for the whole app (phases.md P6 step 1).

   `USE_MOCK` keeps the prototype store authoritative for demos and tests; when
   it is false the HTTP client from http.ts becomes the app's data source.
   The session layer calls `configureApi` once with the Clerk token source and
   the global error handlers, so no module ever imports Clerk directly. */

import { createHttpClient, type HttpClientHooks, type TokenProvider } from "./client";
import { createHttpApiClient } from "./http";
import type { ApiClient } from "./endpoints";

/** `EXPO_PUBLIC_USE_MOCK` defaults to the mockup build: demos and CI never
 *  need a backend (P2A, DD-017). Set it to "false" to run against the API. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== "false";

/** `{root}` only — `/api/v1` is added by the client (api.md §1). */
export const API_ROOT = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

export interface ConfigureApiOptions extends HttpClientHooks {
  getToken: TokenProvider;
}

let client: ApiClient | null = null;

/** Called once by the session provider, before any screen can dispatch. */
export const configureApi = ({ getToken, ...hooks }: ConfigureApiOptions): ApiClient => {
  client = createHttpApiClient(
    createHttpClient({ baseUrl: `${API_ROOT}/api/v1`, getToken, ...hooks }),
  );
  return client;
};

/** The demo adapter (mock.ts) serves the SAME ApiClient interface from the
 *  live prototype store, configured synchronously by the prototype provider
 *  before any child renders. That keeps every read/mutation call site
 *  flag-free: only the upload pipeline branches (its mock path is a
 *  simulation by design). Also the surface T-211's mock-side contract test
 *  validates against the shared zod schemas. */
export const configureMockApi = (adapter: ApiClient): ApiClient => {
  client = adapter;
  return client;
};

/** The configured client. Throws early and loudly if a screen beat the
 *  provider to it — that is a wiring bug, not something to swallow. */
export const api = new Proxy({} as ApiClient, {
  get: (_target, property) => {
    const key = String(property);
    if (!client) {
      throw new Error(
        `api.${key}() was used before configureApi() — mount SessionProvider above the navigator.`,
      );
    }
    const value = (client as unknown as Record<string, unknown>)[key];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

/** Tests and the dev menu reset the singleton. */
export const resetApi = () => {
  client = null;
};

export type { ApiClient } from "./endpoints";
export * from "./errors";

/* Transport rules — docs/technical/error-handling.md §4.
   Everything is faked: no server, no device, no timers beyond the injected
   sleep, so these run in CI exactly like they run on a phone. */

import { describe, expect, it, vi } from "vitest";
import { buildQuery, createHttpClient, type HttpResponse } from "./client";
import { ApiError, CLIENT_CODES, isApiError, isMaintenance, isOffline, isSessionExpired } from "./errors";

const json = (status: number, body?: unknown, headers: Record<string, string> = {}): HttpResponse => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  text: async () => (body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body)),
});

const envelope = (
  code: string,
  message = "nope",
  details?: Record<string, unknown>,
  status = 400,
) => json(status, { error: { code, message, details } });

const harness = (responses: (HttpResponse | Error)[], options: Partial<Parameters<typeof createHttpClient>[0]> = {}) => {
  const calls: { url: string; init: { method: string; headers: Record<string, string>; body?: string } }[] = [];
  const sleeps: number[] = [];
  const queue = [...responses];

  const client = createHttpClient({
    baseUrl: "http://api.test/api/v1/",
    getToken: async () => "token-1",
    fetch: async (url, init) => {
      calls.push({ url, init });
      const next = queue.shift();
      if (!next) throw new Error("no more scripted responses");
      if (next instanceof Error) throw next;
      return next;
    },
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    ...options,
  });

  return { client, calls, sleeps };
};

describe("buildQuery", () => {
  it("drops empty values and encodes the rest", () => {
    expect(buildQuery()).toBe("");
    expect(buildQuery({ a: 1, b: "x y", c: undefined, d: null, e: "" })).toBe("?a=1&b=x%20y");
  });
});

describe("headers and envelopes", () => {
  it("attaches a fresh bearer token per request and joins the base url", async () => {
    const tokens: string[] = [];
    let n = 0;
    const { client, calls } = harness([json(200, { data: { ok: true } })], {
      getToken: async () => `token-${++n}`,
    });
    void tokens;

    await client.request("GET", "/health");
    expect(calls[0].url).toBe("http://api.test/api/v1/health");
    expect(calls[0].init.headers.Authorization).toBe("Bearer token-1");
  });

  it("omits the Authorization header when signed out", async () => {
    const { client, calls } = harness([json(200, { data: {} })], { getToken: async () => null });
    await client.request("GET", "/me");
    expect(calls[0].init.headers.Authorization).toBeUndefined();
  });

  it("serialises the JSON body and sets Content-Type", async () => {
    const { client, calls } = harness([json(201, { data: { id: "1" } })]);
    await client.request("POST", "/me", { body: { full_name: "A" } });
    expect(calls[0].init.body).toBe(JSON.stringify({ full_name: "A" }));
    expect(calls[0].init.headers["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for 204 No Content", async () => {
    const { client } = harness([json(204)]);
    await expect(client.request("DELETE", "/photos/1")).resolves.toBeUndefined();
  });

  it("turns the error envelope into an ApiError with code, status and details", async () => {
    const { client } = harness([
      envelope("PHOTO_LIMIT_REACHED", "Too many", { max: 10, remaining: 2 }, 409),
    ]);
    const error = await client.request("POST", "/photos/upload-intents", { body: {} }).catch((e) => e);

    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).code).toBe("PHOTO_LIMIT_REACHED");
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).details).toEqual({ max: 10, remaining: 2 });
    expect(isSessionExpired(error)).toBe(false);
  });

  it("falls back to INTERNAL for an error without the envelope", async () => {
    const { client } = harness([json(500, "<html>boom</html>")]);
    const error = await client.request("GET", "/events").catch((e) => e);
    expect((error as ApiError).code).toBe("INTERNAL");
    expect((error as ApiError).status).toBe(500);
  });

  it("reports a 200 with an unparsable body as BAD_RESPONSE", async () => {
    const { client } = harness([json(200, "not json")]);
    const error = await client.request("GET", "/events").catch((e) => e);
    expect((error as ApiError).code).toBe(CLIENT_CODES.BAD_RESPONSE);
  });

  it("surfaces the request id from the response headers for support logs", async () => {
    const { client } = harness([
      json(500, { error: { code: "INTERNAL", message: "x" } }, { "x-request-id": "req_123" }),
    ]);
    const error = await client.request("GET", "/events").catch((e: ApiError) => e);
    expect((error as ApiError).requestId).toBe("req_123");
  });
});

describe("retries (error-handling.md §4)", () => {
  it("retries a GET twice with 500 ms then 1.5 s backoff", async () => {
    const { client, calls, sleeps } = harness([
      json(503),
      json(502),
      json(200, { data: [{ id: "e1" }] }),
    ]);

    const body = await client.request<{ data: unknown[] }>("GET", "/events");
    expect(body.data).toHaveLength(1);
    expect(calls).toHaveLength(3);
    expect(sleeps).toEqual([500, 1_500]);
  });

  it("retries a network failure and then succeeds", async () => {
    const { client, calls } = harness([new TypeError("Network request failed"), json(200, { data: { ok: true } })]);
    await expect(client.request("GET", "/health")).resolves.toEqual({ data: { ok: true } });
    expect(calls).toHaveLength(2);
  });

  it("never retries a mutation", async () => {
    const { client, calls, sleeps } = harness([json(503)]);
    const error = await client.request("POST", "/photos/complete", { body: {} }).catch((e) => e);
    expect((error as ApiError).status).toBe(503);
    expect(calls).toHaveLength(1);
    expect(sleeps).toHaveLength(0);
  });

  it("honours retry:false for caller-driven flows (upload PUT retry is manual)", async () => {
    const { client, calls } = harness([json(504)]);
    await client.request("GET", "/photos/mine", { retry: false }).catch(() => undefined);
    expect(calls).toHaveLength(1);
  });
});

describe("401 handling", () => {
  it("refreshes the token once and replays the request", async () => {
    const tokens = ["stale", "fresh"];
    let i = 0;
    const { client, calls } = harness([json(401, { error: { code: "UNAUTHENTICATED", message: "x" } }), json(200, { data: { ok: true } })], {
      getToken: async (opts) => (opts?.skipCache ? tokens[++i] : tokens[i]),
      onUnauthorized: () => {
        throw new Error("should not be signed out");
      },
    });

    await expect(client.request("GET", "/me")).resolves.toEqual({ data: { ok: true } });
    expect(calls).toHaveLength(2);
    expect(calls[1].init.headers.Authorization).toBe("Bearer fresh");
  });

  it("calls onUnauthorized and throws UNAUTHENTICATED when the fresh token is refused", async () => {
    const tokens = ["stale", "fresh"];
    let i = 0;
    const onUnauthorized = vi.fn();
    const { client, calls } = harness(
      [json(401, { error: { code: "UNAUTHENTICATED", message: "expired" } }), json(401, { error: { code: "UNAUTHENTICATED", message: "expired" } })],
      {
        getToken: async (opts) => (opts?.skipCache ? tokens[++i] : tokens[i]),
        onUnauthorized,
      },
    );

    const error = await client.request("GET", "/me").catch((e) => e);
    expect((error as ApiError).code).toBe("UNAUTHENTICATED");
    expect(isSessionExpired(error)).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2); // exactly one refresh attempt, no loop
  });

  it("does not replay the request when there is no fresh token to use", async () => {
    const onUnauthorized = vi.fn();
    const { client, calls } = harness(
      [json(401, { error: { code: "UNAUTHENTICATED", message: "expired" } })],
      { getToken: async () => "same-token", onUnauthorized },
    );

    const error = await client.request("GET", "/me").catch((e) => e);
    expect((error as ApiError).code).toBe("UNAUTHENTICATED");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1); // no point re-sending the same credential
  });

  it("does not sign the user out when the request never carried a token", async () => {
    /* A signed-out visitor asking a private endpoint is a caller bug, not a
       dead session: showing "Session expired" on a first launch would be a
       lie. The error still surfaces to the caller. */
    const onUnauthorized = vi.fn();
    const { client, calls } = harness([json(401, { error: { code: "UNAUTHENTICATED", message: "x" } })], {
      getToken: async () => null,
      onUnauthorized,
    });

    const error = await client.request("GET", "/me").catch((e) => e);
    expect((error as ApiError).code).toBe("UNAUTHENTICATED");
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
    expect(calls[0].init.headers.Authorization).toBeUndefined();
  });
});

describe("global states", () => {
  it("maps an exhausted network failure to offline (banner), not an error screen", async () => {
    const onOffline = vi.fn();
    const { client, calls, sleeps } = harness([new TypeError("Network request failed")], { onOffline });

    const error = await client.request("GET", "/events").catch((e) => e);
    expect((error as ApiError).code).toBe(CLIENT_CODES.NETWORK);
    expect(isOffline(error)).toBe(true);
    expect(onOffline).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(3); // 1 + 2 retries
    expect(sleeps).toEqual([500, 1_500]);
  });

  it("reports the server as reachable again once a response comes back", async () => {
    /* The offline banner is sticky: a transport failure set it, and without
       this hook nothing cleared it — the app kept saying "can't reach the
       server" long after the server was back. */
    const onOnline = vi.fn();
    const { client } = harness([json(200, { data: { ok: true } })], { onOnline });

    await client.request("GET", "/health");
    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it("reports the server as reachable even when it answers with an error status", async () => {
    const onOnline = vi.fn();
    const { client } = harness([envelope("MAINTENANCE_MODE", "Back soon")], { onOnline });

    await client.request("GET", "/events").catch(() => undefined);
    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it("does not report the server as reachable when the request never got an answer", async () => {
    const onOnline = vi.fn();
    const { client } = harness([new TypeError("Network request failed")], { onOnline });

    await client.request("GET", "/events").catch(() => undefined);
    expect(onOnline).not.toHaveBeenCalled();
  });

  it("maps 503 MAINTENANCE_MODE to the maintenance state", async () => {
    const onMaintenance = vi.fn();
    const { client } = harness([envelope("MAINTENANCE_MODE", "Back soon")], { onMaintenance });

    const error = await client.request("GET", "/events").catch((e) => e);
    expect(isMaintenance(error)).toBe(true);
    expect(onMaintenance).toHaveBeenCalled();
  });

  it("treats a caller abort as cancellation, not a failure", async () => {
    const controller = new AbortController();
    const { client } = harness(
      [
        new Promise<never>((_resolve, reject) => {
          controller.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }) as unknown as HttpResponse,
      ],
      { onOffline: () => { throw new Error("abort is not offline"); } },
    );
    controller.abort();

    const error = await client.request("GET", "/events", { signal: controller.signal }).catch((e) => e);
    expect((error as ApiError).code).toBe(CLIENT_CODES.ABORTED);
  });

  it("times a hung request out as a network failure instead of hanging the screen", async () => {
    const { client } = harness(
      [
        new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 40);
        }) as unknown as HttpResponse,
      ],
      { timeoutMs: 5 },
    );

    const error = await client.request("GET", "/events").catch((e) => e);
    expect((error as ApiError).code).toBe(CLIENT_CODES.NETWORK);
  });
});

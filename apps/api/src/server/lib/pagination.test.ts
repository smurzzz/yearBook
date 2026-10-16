import { describe, expect, it } from "vitest";
import { AppError } from "./errors";
import { DEFAULT_LIMIT, MAX_LIMIT, decodeCursor, encodeCursor, parsePage } from "./pagination";

const url = (query = "") => new URL(`http://api.local/api/v1/things${query}`);

describe("parsePage", () => {
  it("defaults to limit 30, cursor null", () => {
    expect(parsePage(url())).toEqual({ limit: DEFAULT_LIMIT, cursor: null });
  });

  it("accepts a valid limit", () => {
    expect(parsePage(url("?limit=10&cursor=abc"))).toEqual({ limit: 10, cursor: "abc" });
  });

  it.each([-1, 0, 61, 2.5, "abc"])("rejects %s with 422 VALIDATION_ERROR", (bad) => {
    expect(() => parsePage(url(`?limit=${bad}`))).toThrowError(AppError);
    try {
      parsePage(url(`?limit=${bad}`));
    } catch (err) {
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
      expect((err as AppError).status).toBe(422);
    }
  });

  it("accepts the documented maximum", () => {
    expect(parsePage(url("?limit=60")).limit).toBe(MAX_LIMIT);
  });
});

describe("cursors", () => {
  it("round-trips", () => {
    const value = { created_at: "2026-10-01T00:00:00.000Z", id: "p_123" };
    expect(decodeCursor(encodeCursor(value))).toEqual(value);
  });

  it("rejects garbage with 422", () => {
    expect(() => decodeCursor("not-a-cursor")).toThrowError(AppError);
  });
});

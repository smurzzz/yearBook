import { LIMITS, TIMEZONE, CONSENT_VERSION } from "./constants";
import { describe, it, expect } from "vitest";

describe("constants", () => {
  it("has expected limits", () => {
    expect(LIMITS.MAX_PHOTOS_PER_BATCH).toBe(20);
    expect(LIMITS.CAPTION_MAX).toBe(200);
    expect(TIMEZONE).toBe("Asia/Manila");
    expect(CONSENT_VERSION).toBe("2026-10-v1");
  });
});

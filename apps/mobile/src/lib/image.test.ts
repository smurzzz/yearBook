/* Image pipeline (T-042/T-043) — the pure helpers: how a photo is scaled
   down and when the result is still too big for the API.

   The native modules (expo-image-manipulator, expo-file-system) are loaded
   lazily, so this file runs in a plain Node test. */

import { describe, expect, it } from "vitest";
import { LIMITS } from "@yearbookhub/shared";
import { planResize, withinLimits } from "./image";

describe("planResize", () => {
  it("leaves a photo that is already small enough alone", () => {
    expect(planResize(800, 600, 1920)).toEqual({ width: 800, height: 600 });
  });

  it("scales the long edge down and keeps the aspect ratio", () => {
    expect(planResize(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 });
  });

  it("scales a portrait photo on its long edge too", () => {
    expect(planResize(3000, 4000, 1920)).toEqual({ width: 1440, height: 1920 });
  });

  it("never scales a photo up", () => {
    expect(planResize(100, 80, 1920)).toEqual({ width: 100, height: 80 });
  });

  it("never rounds a dimension down to zero", () => {
    const plan = planResize(10_000, 37, 1920);
    expect(plan.width).toBe(1920);
    expect(plan.height).toBe(7);
  });

  it("survives a broken size instead of dividing by zero", () => {
    expect(planResize(0, 0, 1920)).toEqual({ width: 0, height: 0 });
    expect(planResize(100, 100, 0)).toEqual({ width: 0, height: 0 });
  });
});

describe("withinLimits", () => {
  it("accepts a pair inside the server caps", () => {
    expect(withinLimits(1_000_000, 50_000)).toBe(true);
  });

  it("accepts exactly the caps", () => {
    expect(withinLimits(LIMITS.ORIGINAL_MAX_BYTES, LIMITS.THUMB_MAX_BYTES)).toBe(true);
  });

  it("rejects an original above the cap", () => {
    expect(withinLimits(LIMITS.ORIGINAL_MAX_BYTES + 1, 50_000)).toBe(false);
  });

  it("rejects a thumb above the cap", () => {
    expect(withinLimits(1_000_000, LIMITS.THUMB_MAX_BYTES + 1)).toBe(false);
  });

  it("rejects a file that came back empty", () => {
    expect(withinLimits(0, 0)).toBe(false);
    expect(withinLimits(1_000_000, 0)).toBe(false);
  });
});

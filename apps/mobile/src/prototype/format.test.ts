import { describe, expect, it } from "vitest";
import {
  countdown,
  formatDate,
  formatShortDate,
  initials,
  plural,
  relativeTime,
} from "./format";

const DAY = 86_400_000;

describe("countdown", () => {
  it("reads a past deadline as Closed", () => {
    const c = countdown(new Date(Date.now() - 1000).toISOString());
    expect(c.closed).toBe(true);
    expect(c.days).toBe(0);
    expect(c.urgent).toBe(false);
    expect(c.label).toBe("Closed");
    expect(c.short).toBe("Closed");
  });

  it("flags under 3 days as urgent and keeps pluralization right", () => {
    const two = countdown(new Date(Date.now() + 2 * DAY + 3_600_000).toISOString());
    expect(two.closed).toBe(false);
    expect(two.urgent).toBe(true);
    expect(two.days).toBe(2);
    expect(two.label).toBe("2 days left");
    expect(two.short).toBe("2d left");

    const one = countdown(new Date(Date.now() + DAY + 60_000).toISOString());
    expect(one.label).toBe("1 day left");
    expect(one.short).toBe("1d left");
    expect(one.urgent).toBe(true);
  });

  it("says 'under a day' for the last day", () => {
    const c = countdown(new Date(Date.now() + 3_600_000).toISOString());
    expect(c.days).toBe(0);
    expect(c.closed).toBe(false);
    expect(c.label).toBe("Closes in under a day");
    expect(c.short).toBe("<1d left");
  });

  it("is not urgent a week out", () => {
    const c = countdown(new Date(Date.now() + 7 * DAY).toISOString());
    expect(c.urgent).toBe(false);
    expect(c.label).toBe("7 days left");
  });
});

describe("relativeTime", () => {
  it("handles the standard buckets", () => {
    expect(relativeTime(new Date().toISOString())).toBe("just now");
    expect(relativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe("5 min ago");
    expect(relativeTime(new Date(Date.now() - 2 * 3_600_000).toISOString())).toBe("2 hours ago");
    expect(relativeTime(new Date(Date.now() - 26 * 3_600_000).toISOString())).toBe("Yesterday");
    expect(relativeTime(new Date(Date.now() - 3 * DAY).toISOString())).toBe("3 days ago");
  });

  it("falls back to a date beyond a month and never goes negative", () => {
    const old = new Date(Date.now() - 90 * DAY).toISOString();
    expect(relativeTime(old)).toBe(formatDate(old));
    expect(relativeTime(new Date(Date.now() + DAY).toISOString())).toBe("just now");
  });
});

describe("formatting helpers", () => {
  it("formats dates and initials", () => {
    expect(formatDate("2026-03-14T12:00:00.000Z")).toContain("Mar");
    expect(formatShortDate("2026-03-14T12:00:00.000Z")).toBe("Mar 14");
    expect(initials("Mikaela Reyes")).toBe("MR");
    expect(initials("Prince")).toBe("P");
  });

  it("pluralizes counts", () => {
    expect(plural(1, "photo")).toBe("1 photo");
    expect(plural(0, "photo")).toBe("0 photos");
    expect(plural(12, "event")).toBe("12 events");
  });
});

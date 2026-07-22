import { describe, it, expect } from "vitest";
import {
  CODE_RE,
  randomCode,
  randomStatsKey,
  classifyDevice,
  todayUTC,
  buildDailySeries,
} from "@/lib/links";

describe("randomCode / randomStatsKey", () => {
  it("generates 8-char lowercase alphanumeric codes", () => {
    for (let i = 0; i < 50; i++) expect(randomCode()).toMatch(CODE_RE);
  });

  it("generates 16-char stats keys", () => {
    expect(randomStatsKey()).toMatch(/^[a-z0-9]{16}$/);
  });

  it("is not obviously constant", () => {
    expect(new Set(Array.from({ length: 20 }, randomCode)).size).toBeGreaterThan(1);
  });
});

describe("classifyDevice", () => {
  it.each([
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/125", "android"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)", "ios"],
    ["Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X)", "ios"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "desktop"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "desktop"],
  ])("classifies %s as %s", (ua, expected) => {
    expect(classifyDevice(ua)).toBe(expected);
  });

  it("treats null as desktop", () => {
    expect(classifyDevice(null)).toBe("desktop");
  });
});

describe("todayUTC", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayUTC()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("buildDailySeries", () => {
  it("returns N days ending today, zero-filled, oldest first", () => {
    const series = buildDailySeries({ "2026-07-22": 5, "2026-07-20": 2 }, 3, "2026-07-22");
    expect(series).toEqual([
      { date: "2026-07-20", count: 2 },
      { date: "2026-07-21", count: 0 },
      { date: "2026-07-22", count: 5 },
    ]);
  });

  it("crosses month boundaries", () => {
    const series = buildDailySeries({}, 2, "2026-07-01");
    expect(series.map((d) => d.date)).toEqual(["2026-06-30", "2026-07-01"]);
  });
});

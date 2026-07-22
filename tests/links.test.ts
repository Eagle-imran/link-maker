import { describe, it, expect } from "vitest";
import {
  CODE_RE,
  randomCode,
  randomStatsKey,
  classifyDevice,
  todayUTC,
  buildDailySeries,
  createLink,
  getLink,
  recordClick,
  getStats,
  checkRateLimit,
} from "@/lib/links";
import { FakeRedis } from "./fake-redis";

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

describe("createLink / getLink", () => {
  it("stores and retrieves a link", async () => {
    const redis = new FakeRedis();
    const { code, statsKey } = await createLink(
      redis,
      { kind: "video", id: "dQw4w9WgXcQ" },
      false
    );
    expect(code).toMatch(CODE_RE);
    const link = await getLink(redis, code);
    expect(link).toMatchObject({
      kind: "video",
      id: "dQw4w9WgXcQ",
      sub: false,
      statsKey,
    });
    expect(link!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("preserves the sub flag for channels", async () => {
    const redis = new FakeRedis();
    const { code } = await createLink(redis, { kind: "channel", id: "@MrBeast" }, true);
    expect((await getLink(redis, code))!.sub).toBe(true);
  });

  it("returns null for unknown or malformed codes", async () => {
    const redis = new FakeRedis();
    expect(await getLink(redis, "zzzzzzzz")).toBeNull();
    expect(await getLink(redis, "../etc")).toBeNull();
    expect(await getLink(redis, "TOOLONGCODE123")).toBeNull();
  });

  it("returns null for corrupt stored JSON", async () => {
    const redis = new FakeRedis();
    await redis.set("link:abcd1234", "{not json");
    expect(await getLink(redis, "abcd1234")).toBeNull();
  });
});

describe("recordClick / getStats", () => {
  it("increments total, today, and device", async () => {
    const redis = new FakeRedis();
    await recordClick(redis, "abcd1234", "android");
    await recordClick(redis, "abcd1234", "android");
    await recordClick(redis, "abcd1234", "ios");
    const stats = await getStats(redis, "abcd1234");
    expect(stats.total).toBe(3);
    expect(stats.devices).toEqual({ android: 2, ios: 1, desktop: 0 });
    expect(stats.daily[todayUTC()]).toBe(3);
  });

  it("returns zeroes for never-clicked codes", async () => {
    const stats = await getStats(new FakeRedis(), "abcd1234");
    expect(stats).toEqual({
      total: 0,
      daily: {},
      devices: { android: 0, ios: 0, desktop: 0 },
    });
  });
});

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks, and sets a TTL window", async () => {
    const redis = new FakeRedis();
    for (let i = 0; i < 20; i++) {
      expect(await checkRateLimit(redis, "1.2.3.4")).toBe(true);
    }
    expect(await checkRateLimit(redis, "1.2.3.4")).toBe(false);
    expect(await checkRateLimit(redis, "5.6.7.8")).toBe(true); // other IP unaffected
    expect(redis.ttls.get("ratelimit:1.2.3.4")).toBe(3600);
  });
});

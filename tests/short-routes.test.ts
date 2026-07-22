import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST as createPOST } from "@/app/api/links/route";
import { GET as shortGET } from "@/app/s/[code]/route";
import { setRedisForTesting } from "@/lib/redis";
import { createLink, getStats, todayUTC, recordClick } from "@/lib/links";
import { FakeRedis } from "./fake-redis";
import StatsPage from "@/app/s/[code]/stats/page";

let redis: FakeRedis;

beforeEach(() => {
  redis = new FakeRedis();
  setRedisForTesting(redis);
});

afterEach(() => setRedisForTesting(null));

function createReq(body: unknown, ip = "1.2.3.4") {
  return createPOST(
    new Request("http://localhost/api/links", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/links", () => {
  it("creates a tracked link and returns short + stats URLs", async () => {
    const res = await createReq({ url: "https://youtu.be/dQw4w9WgXcQ", sub: false });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.shortUrl).toMatch(/^http:\/\/localhost\/s\/[a-z0-9]{8}$/);
    expect(json.statsUrl).toMatch(
      /^http:\/\/localhost\/s\/[a-z0-9]{8}\/stats\?key=[a-z0-9]{16}$/
    );
  });

  it("rejects non-YouTube URLs with 400", async () => {
    const res = await createReq({ url: "https://vimeo.com/123" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("YouTube");
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await createPOST(
      new Request("http://localhost/api/links", { method: "POST", body: "{nope" })
    );
    expect(res.status).toBe(400);
  });

  it("rate limits per IP with 429", async () => {
    for (let i = 0; i < 20; i++) {
      expect((await createReq({ url: "https://youtu.be/dQw4w9WgXcQ" })).status).toBe(200);
    }
    expect((await createReq({ url: "https://youtu.be/dQw4w9WgXcQ" })).status).toBe(429);
    expect(
      (await createReq({ url: "https://youtu.be/dQw4w9WgXcQ" }, "9.9.9.9")).status
    ).toBe(200);
  });
});

function shortReq(code: string, ua = "Mozilla/5.0 (Linux; Android 14)") {
  return shortGET(
    new Request(`http://localhost/s/${code}`, { headers: { "user-agent": ua } }),
    { params: Promise.resolve({ code }) }
  );
}

describe("GET /s/[code]", () => {
  it("serves the redirect page and records the click", async () => {
    const { code } = await createLink(redis, { kind: "video", id: "dQw4w9WgXcQ" }, false);
    const res = await shortReq(code);
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toContain("intent://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const stats = await getStats(redis, code);
    expect(stats.total).toBe(1);
    expect(stats.devices.android).toBe(1);
    expect(stats.daily[todayUTC()]).toBe(1);
  });

  it("passes the sub flag through to the redirect URLs", async () => {
    const { code } = await createLink(redis, { kind: "channel", id: "@MrBeast" }, true);
    const body = await (await shortReq(code)).text();
    expect(body).toContain("sub_confirmation=1");
  });

  it("serves the fallback page for unknown codes without recording", async () => {
    const res = await shortReq("zzzzzzzz");
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).not.toContain("intent://");
    expect((await getStats(redis, "zzzzzzzz")).total).toBe(0);
  });

  it("serves the fallback page when redis is down", async () => {
    redis.get = async () => {
      throw new Error("boom");
    };
    const res = await shortReq("abcd1234");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("https://www.youtube.com");
  });
});

function renderStats(code: string, key?: string) {
  return StatsPage({
    params: Promise.resolve({ code }),
    searchParams: Promise.resolve(key === undefined ? {} : { key }),
  });
}

/** Flatten a React element tree to its text content (no renderer needed). */
function textOf(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "type" in (node as object)) {
    const { type, props } = node as { type: unknown; props: { children?: unknown } };
    // Function components (e.g. <NotFound />) aren't rendered yet — call them
    // to resolve their output before flattening.
    if (typeof type === "function") {
      return textOf((type as (p: unknown) => unknown)(props));
    }
    return textOf(props?.children);
  }
  return "";
}

describe("StatsPage key gate", () => {
  it("renders stats for the correct key", async () => {
    const { code, statsKey } = await createLink(
      redis,
      { kind: "video", id: "dQw4w9WgXcQ" },
      false
    );
    await recordClick(redis, code, "ios");
    const text = textOf(await renderStats(code, statsKey));
    expect(text).toContain("Link stats");
    expect(text).toContain("total clicks");
    expect(text).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("renders NotFound for a wrong key", async () => {
    const { code } = await createLink(redis, { kind: "video", id: "dQw4w9WgXcQ" }, false);
    const text = textOf(await renderStats(code, "0000000000000000"));
    expect(text).toContain("Stats not found");
    expect(text).not.toContain("total clicks");
  });

  it("renders NotFound for a missing key and unknown code", async () => {
    expect(textOf(await renderStats("zzzzzzzz", "0000000000000000"))).toContain(
      "Stats not found"
    );
    const { code } = await createLink(redis, { kind: "video", id: "dQw4w9WgXcQ" }, false);
    expect(textOf(await renderStats(code))).toContain("Stats not found");
  });

  it("renders NotFound for a corrupted stored record", async () => {
    await redis.set(
      "link:corrupt1",
      JSON.stringify({ kind: "video", id: 12345, sub: false, statsKey: "k".repeat(16), createdAt: "x" })
    );
    const text = textOf(await renderStats("corrupt1", "k".repeat(16)));
    expect(text).toContain("Stats not found");
  });

  it("labels stats unavailable when redis fails mid-page", async () => {
    const { code, statsKey } = await createLink(redis, { kind: "video", id: "dQw4w9WgXcQ" }, false);
    redis.hgetall = async () => {
      throw new Error("boom");
    };
    const text = textOf(await renderStats(code, statsKey));
    expect(text).toContain("temporarily unavailable");
  });
});

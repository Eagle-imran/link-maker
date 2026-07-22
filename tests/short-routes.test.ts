import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST as createPOST } from "@/app/api/links/route";
import { GET as shortGET } from "@/app/s/[code]/route";
import { setRedisForTesting } from "@/lib/redis";
import { createLink, getStats, todayUTC } from "@/lib/links";
import { FakeRedis } from "./fake-redis";

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

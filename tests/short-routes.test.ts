import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST as createPOST } from "@/app/api/links/route";
import { setRedisForTesting } from "@/lib/redis";
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

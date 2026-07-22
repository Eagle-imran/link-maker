# Tracked Short Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opt-in `/s/{code}` short links with click analytics (total, 30-day daily, device split), secret stats URLs, and a localStorage "My links" list.

**Architecture:** Upstash Redis behind an injected `RedisLike` interface (tests use an in-memory fake). `POST /api/links` creates links; `GET /s/[code]` resolves, records the click without delaying the redirect, and reuses the existing `renderRedirectPage`; `GET /s/[code]/stats` is a key-gated server component. Existing `/v/` and `/c/` routes unchanged.

**Tech Stack:** Next.js 15 (existing), `@upstash/redis` (only new dependency), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-22-tracked-short-links-design.md`

---

## File structure

| File | Responsibility |
|---|---|
| `lib/links.ts` | `RedisLike` interface; code/stats-key generation; device classification; link create/get; click recording; stats read + `buildDailySeries`; rate limit. Pure logic, client injected. |
| `lib/redis.ts` | Real Upstash adapter (`getRedis()`), plus `setRedisForTesting()` override hook. |
| `lib/defer.ts` | `deferOrRun(fn)` — Next `after()` in production, inline await in tests. |
| `lib/redirect-page.ts` | Modify: `htmlResponse` gains optional `cacheControl` param. |
| `app/api/links/route.ts` | POST create endpoint with validation + rate limit. |
| `app/s/[code]/route.ts` | Short-link resolver: record click, serve redirect page, `no-store`. |
| `app/s/[code]/stats/page.tsx` | Key-gated stats page (server component, CSS bars). |
| `app/page.tsx` | Modify: "Track clicks" toggle, created-link panel, "My links" localStorage section, footer copy. |
| `app/globals.css` | Modify: styles for the above. |
| `tests/fake-redis.ts` | In-memory `RedisLike` implementation. |
| `tests/links.test.ts` | Unit tests for `lib/links.ts`. |
| `tests/short-routes.test.ts` | Tests for the API route and `/s/[code]` route. |

Current suite: 50 tests across `tests/youtube.test.ts`, `tests/redirect-page.test.ts`, `tests/routes.test.ts`.

---

### Task 1: Dependency, fake Redis, pure helpers

**Files:**
- Modify: `package.json` (via npm install)
- Create: `tests/fake-redis.ts`, `lib/links.ts` (helpers only), `tests/links.test.ts`

- [ ] **Step 1: Install the dependency**

Run: `npm install @upstash/redis`
Expected: added to `dependencies`, no errors.

- [ ] **Step 2: Create `tests/fake-redis.ts`**

```ts
import type { RedisLike } from "@/lib/links";

/** In-memory RedisLike for tests. Not thread-safe; fine for vitest. */
export class FakeRedis implements RedisLike {
  strings = new Map<string, string>();
  hashes = new Map<string, Map<string, number>>();
  ttls = new Map<string, number>();

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    opts?: { nx?: boolean }
  ): Promise<string | null> {
    if (opts?.nx && this.strings.has(key)) return null;
    this.strings.set(key, value);
    return "OK";
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const h = this.hashes.get(key) ?? new Map<string, number>();
    const next = (h.get(field) ?? 0) + increment;
    h.set(field, next);
    this.hashes.set(key, h);
    return next;
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const h = this.hashes.get(key);
    if (!h) return null;
    return Object.fromEntries([...h].map(([f, v]) => [f, String(v)]));
  }

  async incr(key: string): Promise<number> {
    const next = (Number(this.strings.get(key)) || 0) + 1;
    this.strings.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.ttls.set(key, seconds);
    return 1;
  }
}
```

- [ ] **Step 3: Write the failing tests**

Create `tests/links.test.ts`:

```ts
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
```

- [ ] **Step 4: Run `npm test`** — Expected: FAIL, cannot resolve `@/lib/links`.

- [ ] **Step 5: Create `lib/links.ts`** (helpers + interface; storage functions come in Task 2)

```ts
/** Minimal Redis surface used by Link Maker. Injected everywhere so tests
 * can use tests/fake-redis.ts and production uses lib/redis.ts. */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { nx?: boolean }): Promise<string | null>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

export type Device = "android" | "ios" | "desktop";

export const CODE_RE = /^[a-z0-9]{8}$/;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomFromAlphabet(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function randomCode(): string {
  return randomFromAlphabet(8);
}

export function randomStatsKey(): string {
  return randomFromAlphabet(16);
}

export function classifyDevice(ua: string | null): Device {
  if (!ua) return "desktop";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  return "desktop";
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildDailySeries(
  daily: Record<string, number>,
  days: number,
  today = todayUTC()
): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  const end = new Date(`${today}T00:00:00Z`).getTime();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, count: daily[date] ?? 0 });
  }
  return out;
}
```

- [ ] **Step 6: Run `npm test`** — Expected: PASS, 62 tests (50 + 12 new).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/links.ts tests/fake-redis.ts tests/links.test.ts
git commit -m "feat: links helpers, RedisLike interface, fake redis"
```

---

### Task 2: Link storage, click recording, stats, rate limit

**Files:**
- Modify: `lib/links.ts` (append)
- Test: `tests/links.test.ts` (append)

- [ ] **Step 1: Append failing tests** to `tests/links.test.ts`:

```ts
import {
  createLink,
  getLink,
  recordClick,
  getStats,
  checkRateLimit,
} from "@/lib/links";
import { FakeRedis } from "./fake-redis";

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
```

- [ ] **Step 2: Run `npm test`** — Expected: FAIL, `createLink` not exported.

- [ ] **Step 3: Append to `lib/links.ts`:**

```ts
import type { Target } from "./youtube";

export type StoredLink = {
  kind: Target["kind"];
  id: string;
  sub: boolean;
  statsKey: string;
  createdAt: string;
};

export async function createLink(
  redis: RedisLike,
  target: Target,
  sub: boolean
): Promise<{ code: string; statsKey: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const statsKey = randomStatsKey();
    const stored: StoredLink = {
      kind: target.kind,
      id: target.id,
      sub,
      statsKey,
      createdAt: new Date().toISOString(),
    };
    const ok = await redis.set(`link:${code}`, JSON.stringify(stored), { nx: true });
    if (ok) return { code, statsKey };
  }
  throw new Error("could not allocate a short code");
}

export async function getLink(
  redis: RedisLike,
  code: string
): Promise<StoredLink | null> {
  if (!CODE_RE.test(code)) return null;
  const raw = await redis.get(`link:${code}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredLink;
  } catch {
    return null;
  }
}

export async function recordClick(
  redis: RedisLike,
  code: string,
  device: Device
): Promise<void> {
  const key = `clicks:${code}`;
  await Promise.all([
    redis.hincrby(key, "total", 1),
    redis.hincrby(key, `d:${todayUTC()}`, 1),
    redis.hincrby(key, `dev:${device}`, 1),
  ]);
}

export type LinkStats = {
  total: number;
  daily: Record<string, number>;
  devices: Record<Device, number>;
};

export async function getStats(redis: RedisLike, code: string): Promise<LinkStats> {
  const h = (await redis.hgetall(`clicks:${code}`)) ?? {};
  const stats: LinkStats = {
    total: 0,
    daily: {},
    devices: { android: 0, ios: 0, desktop: 0 },
  };
  for (const [field, value] of Object.entries(h)) {
    const n = Number(value) || 0;
    if (field === "total") stats.total = n;
    else if (field.startsWith("d:")) stats.daily[field.slice(2)] = n;
    else if (field.startsWith("dev:")) {
      const dev = field.slice(4) as Device;
      if (dev in stats.devices) stats.devices[dev] = n;
    }
  }
  return stats;
}

export async function checkRateLimit(
  redis: RedisLike,
  ip: string,
  limit = 20,
  windowSeconds = 3600
): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSeconds);
  return n <= limit;
}
```

- [ ] **Step 4: Run `npm test`** — Expected: PASS, 69 tests (62 + 7 new).

- [ ] **Step 5: Commit**

```bash
git add lib/links.ts tests/links.test.ts
git commit -m "feat: link storage, click recording, stats, rate limit"
```

---

### Task 3: Redis adapter, defer helper, cache-control param

**Files:**
- Create: `lib/redis.ts`, `lib/defer.ts`
- Modify: `lib/redirect-page.ts` (htmlResponse signature)
- Test: `tests/redirect-page.test.ts` (append), `tests/links.test.ts` (append)

- [ ] **Step 1: Append failing tests**

To `tests/redirect-page.test.ts`, inside the `describe("htmlResponse", ...)` block add:

```ts
  it("accepts a cache-control override", () => {
    const res = htmlResponse("<p>hi</p>", "no-store");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
```

To `tests/links.test.ts` append:

```ts
import { deferOrRun } from "@/lib/defer";

describe("deferOrRun", () => {
  it("runs the fn inline outside a Next request scope", async () => {
    let ran = false;
    await deferOrRun(async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });
});
```

- [ ] **Step 2: Run `npm test`** — Expected: FAIL (missing module / wrong header).

- [ ] **Step 3: Implement**

In `lib/redirect-page.ts`, change `htmlResponse` to:

```ts
export function htmlResponse(
  html: string,
  cacheControl = "public, max-age=3600, s-maxage=31536000, immutable"
): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Default: browser 1h, Vercel edge 1 year (content immutable per ID).
      // /s/ passes "no-store" — every click must reach the function to count.
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
```

Create `lib/defer.ts`:

```ts
/** Run fn after the response in production (Next's `after`), inline otherwise
 * (vitest has no request scope — `after` throws, and awaiting keeps tests
 * deterministic). Errors are swallowed: deferred work must never break a response. */
export async function deferOrRun(fn: () => Promise<void>): Promise<void> {
  const safe = () => fn().catch(() => {});
  try {
    const { after } = await import("next/server");
    after(safe);
  } catch {
    await safe();
  }
}
```

Create `lib/redis.ts`:

```ts
import { Redis } from "@upstash/redis";
import type { RedisLike } from "./links";

let override: RedisLike | null = null;
let cached: RedisLike | null = null;

/** Tests inject a FakeRedis here; pass null to restore the real client. */
export function setRedisForTesting(redis: RedisLike | null): void {
  override = redis;
}

export function getRedis(): RedisLike {
  if (override) return override;
  if (cached) return cached;
  const client = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL / _TOKEN
  cached = {
    // Upstash auto-deserializes JSON-looking values; normalize back to strings.
    get: async (k) => {
      const v = await client.get<unknown>(k);
      if (v === null || v === undefined) return null;
      return typeof v === "string" ? v : JSON.stringify(v);
    },
    set: (k, v, opts) =>
      opts?.nx ? client.set(k, v, { nx: true }) : client.set(k, v),
    hincrby: (k, f, n) => client.hincrby(k, f, n),
    hgetall: async (k) => {
      const h = await client.hgetall<Record<string, string>>(k);
      return h ?? null;
    },
    incr: (k) => client.incr(k),
    expire: (k, s) => client.expire(k, s),
  };
  return cached;
}
```

- [ ] **Step 4: Run `npm test`** — Expected: PASS, 71 tests. Also `npx tsc --noEmit` clean.

Note: if `client.set(...)` return type clashes with `Promise<string | null>`, wrap it: `set: async (k, v, opts) => { const r = opts?.nx ? await client.set(k, v, { nx: true }) : await client.set(k, v); return r === "OK" ? "OK" : null; }`.

- [ ] **Step 5: Commit**

```bash
git add lib/redis.ts lib/defer.ts lib/redirect-page.ts tests/redirect-page.test.ts tests/links.test.ts
git commit -m "feat: upstash adapter, defer helper, cache-control override"
```

---

### Task 4: POST /api/links

**Files:**
- Create: `app/api/links/route.ts`
- Test: `tests/short-routes.test.ts`

- [ ] **Step 1: Create `tests/short-routes.test.ts`** with failing tests:

```ts
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
```

- [ ] **Step 2: Run `npm test`** — Expected: FAIL, cannot resolve the route module.

- [ ] **Step 3: Create `app/api/links/route.ts`:**

```ts
import { parseYouTubeUrl } from "@/lib/youtube";
import { createLink, checkRateLimit } from "@/lib/links";
import { getRedis } from "@/lib/redis";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url =
    typeof (body as { url?: unknown })?.url === "string"
      ? (body as { url: string }).url
      : "";
  const sub = (body as { sub?: unknown })?.sub === true;

  const target = parseYouTubeUrl(url);
  if (!target) {
    return Response.json(
      { error: "That doesn't look like a YouTube link." },
      { status: 400 }
    );
  }

  const redis = getRedis();
  try {
    if (!(await checkRateLimit(redis, clientIp(req)))) {
      return Response.json(
        { error: "Rate limit reached — try again in an hour." },
        { status: 429 }
      );
    }
    const { code, statsKey } = await createLink(redis, target, sub);
    const origin = new URL(req.url).origin;
    return Response.json({
      shortUrl: `${origin}/s/${code}`,
      statsUrl: `${origin}/s/${code}/stats?key=${statsKey}`,
    });
  } catch {
    return Response.json(
      { error: "Tracking is unavailable right now — try an untracked link." },
      { status: 503 }
    );
  }
}
```

- [ ] **Step 4: Run `npm test`** — Expected: PASS, 75 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/links/route.ts tests/short-routes.test.ts
git commit -m "feat: POST /api/links create endpoint with rate limit"
```

---

### Task 5: GET /s/[code] resolver

**Files:**
- Create: `app/s/[code]/route.ts`
- Test: `tests/short-routes.test.ts` (append)

- [ ] **Step 1: Append failing tests** to `tests/short-routes.test.ts`:

```ts
import { GET as shortGET } from "@/app/s/[code]/route";
import { createLink, getStats, todayUTC } from "@/lib/links";

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
```

- [ ] **Step 2: Run `npm test`** — Expected: FAIL, cannot resolve the route module.

- [ ] **Step 3: Create `app/s/[code]/route.ts`:**

```ts
import type { Target } from "@/lib/youtube";
import { getLink, recordClick, classifyDevice, type StoredLink } from "@/lib/links";
import { getRedis } from "@/lib/redis";
import { deferOrRun } from "@/lib/defer";
import {
  renderRedirectPage,
  renderFallbackPage,
  htmlResponse,
} from "@/lib/redirect-page";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  let link: StoredLink | null = null;
  try {
    link = await getLink(getRedis(), code);
  } catch {
    link = null; // redis down: redirecting beats counting
  }
  if (!link) return htmlResponse(renderFallbackPage(), "no-store");

  const device = classifyDevice(req.headers.get("user-agent"));
  await deferOrRun(() => recordClick(getRedis(), code, device));

  const target: Target = { kind: link.kind, id: link.id };
  return htmlResponse(renderRedirectPage(target, link.sub), "no-store");
}
```

- [ ] **Step 4: Run `npm test`** — Expected: PASS, 79 tests. `npm run build` succeeds with `/s/[code]` in the route table (stop any dev server first).

- [ ] **Step 5: Commit**

```bash
git add app/s tests/short-routes.test.ts
git commit -m "feat: /s/[code] resolver with click recording"
```

---

### Task 6: Stats page

**Files:**
- Create: `app/s/[code]/stats/page.tsx`
- Modify: `app/globals.css` (append)

No route-level unit tests (server component); logic (`buildDailySeries`, `getStats`, key check) is already unit-tested. Verification is build + manual (Task 8).

- [ ] **Step 1: Create `app/s/[code]/stats/page.tsx`:**

```tsx
import { getRedis } from "@/lib/redis";
import { getLink, getStats, buildDailySeries, type LinkStats } from "@/lib/links";
import { webUrl, type Target } from "@/lib/youtube";

export const dynamic = "force-dynamic";

function NotFound() {
  return (
    <main className="wrap">
      <h1>Stats not found</h1>
      <p className="tagline">
        Check that you opened the full stats URL, including its key.
      </p>
    </main>
  );
}

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { code } = await params;
  const { key } = await searchParams;

  let link = null;
  try {
    link = await getLink(getRedis(), code);
  } catch {}
  if (!link || typeof key !== "string" || key !== link.statsKey) {
    return <NotFound />;
  }

  let stats: LinkStats = {
    total: 0,
    daily: {},
    devices: { android: 0, ios: 0, desktop: 0 },
  };
  try {
    stats = await getStats(getRedis(), code);
  } catch {}

  const series = buildDailySeries(stats.daily, 30);
  const max = Math.max(1, ...series.map((d) => d.count));
  const target: Target = { kind: link.kind, id: link.id };
  const targetUrl = webUrl(target, link.sub);

  return (
    <main className="wrap">
      <h1>Link stats</h1>
      <p className="tagline">
        <code>/s/{code}</code> → <a href={targetUrl}>{targetUrl}</a>
      </p>

      <section className="stat-grid">
        <div className="stat">
          <strong>{stats.total}</strong>
          <span>total clicks</span>
        </div>
        <div className="stat">
          <strong>{stats.devices.android}</strong>
          <span>Android</span>
        </div>
        <div className="stat">
          <strong>{stats.devices.ios}</strong>
          <span>iOS</span>
        </div>
        <div className="stat">
          <strong>{stats.devices.desktop}</strong>
          <span>Desktop</span>
        </div>
      </section>

      <section className="info">
        <h2>Last 30 days</h2>
        <div className="chart" role="img" aria-label="Daily clicks, last 30 days">
          {series.map((d) => (
            <div key={d.date} className="bar-col" title={`${d.date}: ${d.count}`}>
              <div className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="chart-labels">
          <span>{series[0].date}</span>
          <span>{series[series.length - 1].date}</span>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Append to `app/globals.css`:**

```css
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat {
  background: var(--card);
  border: 1px solid #333;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}
.stat strong { font-size: 1.5rem; }
.stat span { color: var(--muted); font-size: 0.8rem; }

.chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 120px;
  padding: 8px;
  background: var(--card);
  border: 1px solid #333;
  border-radius: 10px;
}
.bar-col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.bar { width: 100%; min-height: 2px; background: var(--accent); border-radius: 2px 2px 0 0; }
.chart-labels { display: flex; justify-content: space-between; color: var(--muted); font-size: 0.75rem; margin-top: 4px; }
```

- [ ] **Step 3: Verify** — `npm test` still 79; `npx tsc --noEmit` clean; `npm run build` succeeds with `/s/[code]/stats` listed (dev server stopped).

- [ ] **Step 4: Commit**

```bash
git add app/s/[code]/stats/page.tsx app/globals.css
git commit -m "feat: key-gated stats page with CSS bar chart"
```

---

### Task 7: Generator UI — track toggle, created panel, My links

**Files:**
- Modify: `app/page.tsx` (full replacement below)
- Modify: `app/globals.css` (append)

No unit tests (thin view over tested API); manual verification in Step 3.

- [ ] **Step 1: Replace `app/page.tsx` entirely with:**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";

type SavedLink = {
  code: string;
  shortUrl: string;
  statsUrl: string;
  target: string;
  createdAt: string;
};

const STORAGE_KEY = "linkmaker:links";

function loadSaved(): SavedLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSaved(list: SavedLink[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {}
}

export default function Home() {
  const [input, setInput] = useState("");
  const [sub, setSub] = useState(false);
  const [track, setTrack] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ shortUrl: string; statsUrl: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedLink[]>([]);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const target = useMemo(() => parseYouTubeUrl(input), [input]);
  const showError = input.trim() !== "" && target === null;

  const link = useMemo(() => {
    if (!target) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return target.kind === "video"
      ? `${origin}/v/${target.id}`
      : `${origin}/c/${target.id}${sub ? "?sub=1" : ""}`;
  }, [target, sub]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  useEffect(() => {
    setCopied(null);
    setCreated(null);
    setApiError(null);
    clearTimeout(copyTimer.current);
    return () => clearTimeout(copyTimer.current);
  }, [link, track]);

  async function copy(text: string, tag: string) {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Restricted contexts (in-app browsers): legacy fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    }
    if (!ok) return;
    setCopied(tag);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 1500);
  }

  async function createTracked() {
    setCreating(true);
    setApiError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: input, sub }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error ?? "Something went wrong — try again.");
        return;
      }
      setCreated(json);
      const code = json.shortUrl.split("/").pop() as string;
      const entry: SavedLink = {
        code,
        shortUrl: json.shortUrl,
        statsUrl: json.statsUrl,
        target:
          target!.kind === "video" ? `Video ${target!.id}` : target!.id,
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...saved.filter((l) => l.code !== code)];
      setSaved(next);
      persistSaved(next);
    } catch {
      setApiError("Network error — try again.");
    } finally {
      setCreating(false);
    }
  }

  function removeSaved(code: string) {
    const next = saved.filter((l) => l.code !== code);
    setSaved(next);
    persistSaved(next);
  }

  return (
    <main className="wrap">
      <h1>Link Maker</h1>
      <p className="tagline">
        Turn any YouTube link into one that opens the <strong>YouTube app</strong>{" "}
        — not the in-app browser. Viewers stay logged in, so they can actually
        subscribe, like, and comment.
      </p>

      <label className="field">
        <span>Paste a YouTube link</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://youtube.com/watch?v=... or youtube.com/@yourchannel"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-invalid={showError}
          aria-describedby={showError ? "url-error" : undefined}
          autoFocus
        />
      </label>

      {showError && (
        <p className="error" id="url-error" role="alert">
          That doesn&apos;t look like a YouTube link.
        </p>
      )}

      {target?.kind === "channel" && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={sub}
            onChange={(e) => setSub(e.target.checked)}
          />
          <span>
            Ask visitors to confirm subscribing
            <small>
              Desktop browsers only — in the YouTube app, viewers land on your
              channel with the Subscribe button
            </small>
          </span>
        </label>
      )}

      {target && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={track}
            onChange={(e) => setTrack(e.target.checked)}
          />
          <span>
            Track clicks
            <small>
              Creates a short link with a private stats page — total clicks,
              daily chart, device split
            </small>
          </span>
        </label>
      )}

      {target && !track && (
        <div className="result">
          <code>{link}</code>
          <button type="button" onClick={() => copy(link, "plain")} aria-live="polite">
            {copied === "plain" ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      {target && track && !created && (
        <button
          type="button"
          className="create-btn"
          onClick={createTracked}
          disabled={creating}
        >
          {creating ? "Creating…" : "Create tracked link"}
        </button>
      )}

      {apiError && (
        <p className="error" role="alert">
          {apiError}
        </p>
      )}

      {created && (
        <>
          <div className="result">
            <code>{created.shortUrl}</code>
            <button
              type="button"
              onClick={() => copy(created.shortUrl, "short")}
              aria-live="polite"
            >
              {copied === "short" ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="result">
            <code>{created.statsUrl}</code>
            <button
              type="button"
              onClick={() => copy(created.statsUrl, "stats")}
              aria-live="polite"
            >
              {copied === "stats" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="note">
            Save the stats URL — it&apos;s the only way to see your stats.
            (It&apos;s also remembered in &ldquo;My links&rdquo; below, in this
            browser.)
          </p>
        </>
      )}

      {saved.length > 0 && (
        <section className="info">
          <h2>My links</h2>
          <p className="fine">
            Saved in this browser only — bookmark your stats URL to access it
            anywhere.
          </p>
          <ul className="mylinks">
            {saved.map((l) => (
              <li key={l.code}>
                <div className="mylink-meta">
                  <span className="mylink-target">{l.target}</span>
                  <code>{l.shortUrl}</code>
                </div>
                <div className="mylink-actions">
                  <button type="button" onClick={() => copy(l.shortUrl, l.code)}>
                    {copied === l.code ? "Copied!" : "Copy"}
                  </button>
                  <a href={l.statsUrl}>Stats</a>
                  <button
                    type="button"
                    className="remove"
                    aria-label={`Forget ${l.shortUrl}`}
                    onClick={() => removeSaved(l.code)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="info">
        <h2>Why smart links?</h2>
        <p>
          When someone taps your YouTube link inside Instagram or TikTok, it
          opens in the app&apos;s built-in browser — where they&apos;re{" "}
          <strong>not logged in to YouTube</strong>. They can&apos;t subscribe,
          like, or comment. Most just leave.
        </p>
        <p>
          A smart link skips the in-app browser and opens your video or channel
          in the <strong>YouTube app</strong>, where viewers are already logged
          in. One tap to subscribe — more subscribers and watch time from the
          exact same clicks.
        </p>
      </section>

      <section className="info">
        <h2>How it works</h2>
        <ol>
          <li>Paste any YouTube link — video, Short, or channel</li>
          <li>Copy your smart link</li>
          <li>Use it in your bio, stories, and captions</li>
        </ol>
        <p className="fine">
          If the YouTube app isn&apos;t installed, the link falls back to
          youtube.com — nobody hits a dead end.
        </p>
      </section>

      <footer>
        Free · no visitor profiling · works on Instagram, TikTok &amp; more
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Append to `app/globals.css`:**

```css
.create-btn {
  padding: 14px 18px;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.create-btn:disabled { opacity: 0.6; cursor: default; }

.note { margin: 0; color: var(--muted); font-size: 0.85rem; }

.mylinks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.mylinks li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--card);
  border: 1px solid #333;
  border-radius: 10px;
}
.mylink-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mylink-target { color: var(--fg); font-size: 0.9rem; }
.mylink-meta code { color: var(--link); font-size: 0.85rem; overflow-wrap: anywhere; }
.mylink-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.mylink-actions button, .mylink-actions a {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: #2a2a2a;
  color: var(--fg);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: none;
}
.mylink-actions .remove { background: none; color: var(--muted); font-size: 1.1rem; padding: 4px 6px; }
```

- [ ] **Step 3: Manual verification** — `npm test` (still 79), `npx tsc --noEmit`, then `npm run dev` and check:
- Untracked flow unchanged (paste video → `/v/` link + copy).
- Paste a link, enable "Track clicks" → "Create tracked link" button. Without Upstash env vars this returns the 503 error message — that error path IS the check here; full success path is Task 8.
- "My links" hidden when empty.
- Footer reads "no visitor profiling".
Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: track-clicks toggle, created-link panel, My links section"
```

---

### Task 8: Upstash provisioning, end-to-end verify, deploy

**Files:** none (operations)

- [ ] **Step 1: Provision Upstash (USER ACTION — pause and ask)**

Ask the user to: Vercel dashboard → project `link-maker` → Storage tab → Create/Connect **Upstash for Redis** (free plan) → connect to the project (all environments). This injects `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

- [ ] **Step 2: Pull env locally**

Run: `vercel env pull .env.local` (in the project dir)
Expected: `.env.local` now contains both `UPSTASH_REDIS_REST_*` vars (file is gitignored).

- [ ] **Step 3: Local end-to-end against real Redis**

With `npm run dev` running:

```bash
curl -s -X POST http://localhost:3000/api/links -H 'content-type: application/json' -d '{"url":"https://youtu.be/dQw4w9WgXcQ"}'
```
Expected: JSON with `shortUrl` and `statsUrl`. Then:
```bash
curl -s <shortUrl> | grep -c intent://
```
Expected: `1`. Then open `<statsUrl>` in the browser — total = 1, one bar today, desktop = 1 (curl has no mobile UA). Stop the dev server.

- [ ] **Step 4: Full suite + build**

Run: `npm test && npm run build`
Expected: 79 tests pass; build lists `/api/links`, `/s/[code]`, `/s/[code]/stats`.

- [ ] **Step 5: Deploy + prod verify**

```bash
git push
```
Wait for Vercel auto-deploy, then repeat Step 3's curl flow against `https://link-maker-mu.vercel.app` and open the prod stats URL.

- [ ] **Step 6: Update README** — in the "Good to know" list of `README.md`, add:

```markdown
- Optional **click tracking**: toggle "Track clicks" to get a short link plus
  a private stats page (total clicks, daily chart, device split). Stats are
  aggregate counts only — no visitor profiling.
```

- [ ] **Step 7: Commit + push**

```bash
git add README.md
git commit -m "docs: click tracking in README"
git push
```

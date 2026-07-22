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
  // Vercel's Upstash marketplace integration injects KV_* names; direct
  // Upstash setups use UPSTASH_*. Accept either.
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Missing Redis env vars (UPSTASH_REDIS_REST_* or KV_REST_API_*)");
  }
  const client = new Redis({ url, token });
  cached = {
    // Upstash auto-deserializes JSON-looking values; normalize back to strings.
    get: async (k) => {
      const v = await client.get<unknown>(k);
      if (v === null || v === undefined) return null;
      return typeof v === "string" ? v : JSON.stringify(v);
    },
    set: async (k, v, opts) => {
      const r = opts?.nx ? await client.set(k, v, { nx: true }) : await client.set(k, v);
      return r === "OK" ? "OK" : null;
    },
    hincrby: (k, f, n) => client.hincrby(k, f, n),
    hgetall: async (k) => {
      const h = await client.hgetall<Record<string, unknown>>(k);
      if (!h) return null;
      // Upstash deserializes numeric-looking fields to numbers; RedisLike promises strings.
      return Object.fromEntries(
        Object.entries(h).map(([f, v]) => [f, typeof v === "string" ? v : JSON.stringify(v)])
      );
    },
    incr: (k) => client.incr(k),
    expire: (k, s) => client.expire(k, s),
  };
  return cached;
}

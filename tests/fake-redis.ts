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

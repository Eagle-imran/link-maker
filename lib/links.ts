import { randomBytes } from "node:crypto";

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
  const bytes = randomBytes(length);
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

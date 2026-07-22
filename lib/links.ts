import { randomBytes } from "node:crypto";
import type { Target } from "./youtube";

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
  if (!CODE_RE.test(code)) return; // never build redis keys from unvalidated input
  const key = `clicks:${code}`;
  // Three independent increments: partial failure can desync total vs breakdowns.
  // Accepted for aggregate-only stats; Task 3's adapter may pipeline these.
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
  // Non-atomic INCR+EXPIRE: a crash between them could leave one IP's counter
  // without a TTL (permanent lockout for that IP). Accepted: single-IP blast
  // radius, one-line window, free tier has no SET..EX..NX pipeline pressure.
  if (n === 1) await redis.expire(key, windowSeconds);
  return n <= limit;
}

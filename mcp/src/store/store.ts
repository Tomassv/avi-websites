import { Redis } from "@upstash/redis";

/**
 * The small key-value store (MCP-PLAN.md §4.4): one-time markers, refresh-token families,
 * revocations and rate-limit counters. Every key expires on its own.
 */
export interface Store {
  /** Sets the key only if it's absent. True when this call set it (i.e. first use). */
  setOnce(key: string, ttlSeconds: number): Promise<boolean>;
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Increments a counter, starting its TTL on first increment. */
  incr(key: string, ttlSeconds: number): Promise<number>;
}

export function upstashStore(url: string, token: string): Store {
  const redis = new Redis({ url, token });
  return {
    async setOnce(key, ttl) {
      return (await redis.set(key, 1, { nx: true, ex: ttl })) === "OK";
    },
    async get<T>(key: string) {
      return (await redis.get<T>(key)) ?? null;
    },
    async set(key, value, ttl) {
      await redis.set(key, value, { ex: Math.max(1, Math.floor(ttl)) });
    },
    async del(key) {
      await redis.del(key);
    },
    async incr(key, ttl) {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, ttl);
      return n;
    },
  };
}

/** In-process store for tests and DEV_MODE (REDIS=memory). */
export function memoryStore(now: () => number = Date.now): Store {
  const data = new Map<string, { value: unknown; expires: number }>();
  const live = (key: string) => {
    const e = data.get(key);
    if (e && e.expires <= now()) data.delete(key);
    return data.get(key);
  };
  return {
    async setOnce(key, ttl) {
      if (live(key)) return false;
      data.set(key, { value: 1, expires: now() + ttl * 1000 });
      return true;
    },
    async get<T>(key: string) {
      return (live(key)?.value as T) ?? null;
    },
    async set(key, value, ttl) {
      data.set(key, { value: structuredClone(value), expires: now() + ttl * 1000 });
    },
    async del(key) {
      data.delete(key);
    },
    async incr(key, ttl) {
      const e = live(key);
      const n = ((e?.value as number) ?? 0) + 1;
      data.set(key, { value: n, expires: e?.expires ?? now() + ttl * 1000 });
      return n;
    },
  };
}

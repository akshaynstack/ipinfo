import Redis from 'ioredis';
import { settings } from './config';

export interface IRateLimiter {
  allow(apiKeyId: number, limitPerMin: number): Promise<boolean>;
}

class RedisRateLimiter implements IRateLimiter {
  private redis: Redis;
  constructor(url: string) {
    this.redis = new Redis(url);
  }
  async allow(apiKeyId: number, limitPerMin: number): Promise<boolean> {
    const nowMin = Math.floor(Date.now() / 1000 / 60);
    const key = `ratelimit:${apiKeyId}:${nowMin}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 65);
    }
    return count <= limitPerMin;
  }
}

// Simple in-memory fallback for single-node/local testing
class MemoryRateLimiter implements IRateLimiter {
  private bucket = new Map<string, { count: number; expiresAt: number }>();
  async allow(apiKeyId: number, limitPerMin: number): Promise<boolean> {
    const now = Date.now();
    const nowMin = Math.floor(now / 1000 / 60);
    const key = `ratelimit:${apiKeyId}:${nowMin}`;
    const entry = this.bucket.get(key);
    if (!entry || entry.expiresAt < now) {
      this.bucket.set(key, { count: 1, expiresAt: now + 65_000 });
      return 1 <= limitPerMin;
    }
    entry.count += 1;
    return entry.count <= limitPerMin;
  }
}

const useMemory = !settings.redisUrl || settings.redisUrl.startsWith('memory://');
export const rateLimiter: IRateLimiter = useMemory
  ? new MemoryRateLimiter()
  : new RedisRateLimiter(settings.redisUrl);

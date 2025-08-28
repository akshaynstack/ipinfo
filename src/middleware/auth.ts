import type { Context, Next } from 'hono';
import { prisma } from '../db';
import { settings } from '../config';
import crypto from 'crypto';

export type AppBindings = {
  Variables: {
    apikey: {
      id: number;
      rateLimitPerMin: number;
      isActive: boolean;
    };
  };
};

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Simple in-memory TTL cache for API keys to avoid DB round-trips on every request
type ApiKeyRecord = { id: number; rateLimitPerMin: number; isActive: boolean };
type CacheEntry = { value: ApiKeyRecord; expiresAt: number };
const apiKeyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60s TTL
const CACHE_MAX_ITEMS = 1000; // Prevent unbounded growth

function cacheGet(keyHash: string): ApiKeyRecord | undefined {
  const entry = apiKeyCache.get(keyHash);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    apiKeyCache.delete(keyHash);
    return undefined;
  }
  return entry.value;
}

function cacheSet(keyHash: string, value: ApiKeyRecord) {
  if (apiKeyCache.size >= CACHE_MAX_ITEMS) {
    // Drop a random entry (cheap). For stricter LRU, track recency, but this is sufficient here.
    const firstKey = apiKeyCache.keys().next().value as string | undefined;
    if (firstKey) apiKeyCache.delete(firstKey);
  }
  apiKeyCache.set(keyHash, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function requireAdmin(c: Context, next: Next) {
  const adminHeader = c.req.header('X-Admin-Key');
  if (!settings.adminApiKey) return c.json({ detail: 'Admin key not configured' }, 503);
  if (!adminHeader || adminHeader !== settings.adminApiKey) return c.json({ detail: 'Invalid admin key' }, 401);
  return next();
}

export async function getCurrentApiKey(c: Context<AppBindings>, next: Next) {
  const url = new URL(c.req.url);
  const apiQuery = url.searchParams.get('api') || undefined;
  const apiHeader = c.req.header('X-API-Key') || undefined;
  const rawKey = apiQuery ?? apiHeader;
  if (!rawKey) return c.json({ detail: 'Missing API key (use X-API-Key header or ?api=)' }, 401);

  if (settings.enforceHttpsForApiKeys) {
    const xfProto = (c.req.header('x-forwarded-proto') || '').toLowerCase();
    const scheme = xfProto || url.protocol.replace(':', '').toLowerCase();
    if (scheme !== 'https') return c.json({ detail: 'HTTPS is required when using an API key' }, 403);
  }

  const keyHash = sha256(rawKey);
  // Fast path: in-memory cache
  let apikey = cacheGet(keyHash);
  if (!apikey) {
    const dbKey = await prisma.aPIKey.findUnique({ where: { keyHash } });
    if (!dbKey || !dbKey.isActive) return c.json({ detail: 'Invalid API key' }, 401);
    apikey = { id: dbKey.id, rateLimitPerMin: dbKey.rateLimitPerMin, isActive: dbKey.isActive };
    cacheSet(keyHash, apikey);
  }
  c.set('apikey', apikey);
  return next();
}

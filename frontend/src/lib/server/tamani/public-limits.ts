// Guards of the public popup routes (spec §6.5), on Upstash Redis. Without
// Redis each falls back to this instance's memory: a respondent's answer
// matters more than a perfect limit, and production runs with Upstash.
import 'server-only';
import { createHash } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/server/redis';
import { MemoryRateLimitStore, RedisRateLimitStore } from '@/lib/server/rate-limit-store';
import { tamaniError } from './errors';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_WRITES = 30;
const VIEW_TTL_S = 48 * 3600;
const DEVICE_NUMBERS_TTL_S = 90 * 24 * 3600;

const store = redis
  ? new RedisRateLimitStore({ redis, prefix: '', windowMs: WINDOW_MS })
  : new MemoryRateLimitStore({ windowMs: WINDOW_MS });
const memoryViews = new Map<string, number>();
const memoryNumbers = new Map<string, Set<string>>();

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** 30 writes per 10 minutes, per IP and per campaign; a 429 RATE_LIMITED beyond. */
export async function enforcePublicRateLimit(
  req: NextRequest,
  campaignId: string,
): Promise<NextResponse | null> {
  const { totalHits, resetTime } = await store.increment(
    `rl:public:${campaignId}:${clientIp(req)}`,
  );
  if (totalHits <= MAX_WRITES) return null;
  const res = tamaniError('RATE_LIMITED', 429);
  const retryAfter = Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
  res.headers.set('Retry-After', String(retryAfter));
  return res;
}

function yyyymmdd(now: Date): string {
  return now.toISOString().slice(0, 10).replaceAll('-', '');
}

/** True the first time this device opens this link on this (UTC) day. */
export async function isFirstViewToday(
  linkId: string,
  deviceId: string,
  now: Date,
): Promise<boolean> {
  const key = `tamani:view:${linkId}:${deviceId}:${yyyymmdd(now)}`;
  if (redis) return (await redis.set(key, '1', { nx: true, ex: VIEW_TTL_S })) !== null;
  const expiresAt = memoryViews.get(key);
  if (expiresAt !== undefined && expiresAt > Date.now()) return false;
  memoryViews.set(key, Date.now() + VIEW_TTL_S * 1000);
  return true;
}

/**
 * Remembers that this device gave this number on this campaign and returns
 * how many distinct numbers it gave. The number is stored hashed.
 */
export async function recordDeviceNumber(
  campaignId: string,
  deviceId: string,
  phoneE164: string,
): Promise<number> {
  const key = `tamani:device-numbers:${campaignId}:${deviceId}`;
  const member = createHash('sha256').update(phoneE164).digest('hex');
  if (redis) {
    await redis.sadd(key, member);
    await redis.expire(key, DEVICE_NUMBERS_TTL_S);
    return redis.scard(key);
  }
  const set = memoryNumbers.get(key) ?? new Set<string>();
  set.add(member);
  memoryNumbers.set(key, set);
  return set.size;
}

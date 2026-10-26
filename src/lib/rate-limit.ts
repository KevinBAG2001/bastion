type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { success: boolean; retryAfterMs: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { success: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { success: true, retryAfterMs: 0 };
}

/** For tests */
export function clearRateLimits() {
  buckets.clear();
}

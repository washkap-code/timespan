/**
 * Lightweight in-memory rate limiter for API routes.
 *
 * Caveat: Vercel serverless functions are stateless and can scale across
 * multiple instances, so this in-memory store only limits requests within a
 * single warm instance — it is a real, useful first line of defense against
 * casual abuse and runaway scripts, but not a hard guarantee under
 * distributed load. If traffic grows enough that this matters, swap the
 * store below for Upstash Redis or Vercel KV (same interface, durable and
 * shared across instances) without changing any call sites.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically sweep expired buckets so the Map doesn't grow unbounded on a
// long-lived warm instance.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

/**
 * @param key Unique identifier for the caller (e.g. `${route}:${userId}` or `${route}:${ip}`)
 * @param limit Max requests allowed within the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, limit, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Best-effort client IP extraction behind Vercel's proxy. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

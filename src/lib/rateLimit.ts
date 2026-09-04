// In-memory sliding-window rate limiter — keyed per call site (e.g. by IP,
// or IP+email), no new infrastructure required. Single-instance only: state
// resets on deploy/restart and doesn't share across instances. That's a
// real limitation, not an oversight — swap the Map for a Postgres or Redis
// -backed store the day this runs on more than one instance. Until then,
// this is what stands between the auth routes and naive brute-forcing.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// Best-effort client identifier behind a proxy (Railway, most hosts) — falls
// back to a constant so unmatched requests still share one (stricter) bucket
// instead of bypassing the limiter entirely.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

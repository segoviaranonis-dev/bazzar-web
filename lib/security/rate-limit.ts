/**
 * Rate limit in-process (dev / single instance).
 * Producción multi-instancia: migrar a @upstash/ratelimit + Redis.
 */

type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (bucket.count >= maxRequests) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  bucket.count++
  return { ok: true }
}

/** Limpieza ocasional — evita setInterval en middleware/serverless */
export function pruneRateLimitStore(now = Date.now()) {
  if (store.size < 500) return
  for (const [key, bucket] of Array.from(store.entries())) {
    if (now > bucket.resetAt) store.delete(key)
  }
}

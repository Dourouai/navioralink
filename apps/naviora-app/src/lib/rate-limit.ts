export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface InMemoryRateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  now?: () => number;
}

export interface InMemoryRateLimiter {
  consume: (key: string) => RateLimitDecision;
  clear: () => void;
}

export function createInMemoryRateLimiter(options: InMemoryRateLimiterOptions): InMemoryRateLimiter {
  const { windowMs, maxRequests, now = () => Date.now() } = options;
  const buckets = new Map<string, RateLimitBucket>();

  return {
    consume(key: string): RateLimitDecision {
      const current = now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= current) {
        buckets.set(key, {
          count: 1,
          resetAt: current + windowMs,
        });

        return {
          allowed: true,
          retryAfterSeconds: Math.ceil(windowMs / 1000),
        };
      }

      if (bucket.count >= maxRequests) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - current) / 1000)),
        };
      }

      bucket.count += 1;
      buckets.set(key, bucket);

      return {
        allowed: true,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - current) / 1000)),
      };
    },
    clear() {
      buckets.clear();
    },
  };
}

export function getClientIpFromHeaders(headers: Pick<Headers, "get">) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return "unknown";
  }

  return forwardedFor.split(",")[0]?.trim() || "unknown";
}

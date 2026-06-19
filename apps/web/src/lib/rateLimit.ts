// Simple in-memory rate limiter
// Uses a Map to track requests per IP

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetAt < now) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  limit: number;      // max requests
  windowMs: number;   // time window in ms
  /**
   * Optional identity to key the limit on. Pass user.id when the caller is
   * authenticated — otherwise users behind shared NAT (offices, mobile
   * carriers) throttle each other.
   *
   * When omitted, falls back to client IP from x-forwarded-for/x-real-ip.
   */
  identity?: string;
}

export function rateLimit(req: Request, options: RateLimitOptions): { success: boolean; remaining: number } {
  const ident = options.identity
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  const key = `${ident}:${new URL(req.url).pathname}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + options.windowMs });
    return { success: true, remaining: options.limit - 1 };
  }

  entry.count++;
  if (entry.count > options.limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: options.limit - entry.count };
}

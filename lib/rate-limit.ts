import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting configuration
 *
 * IMPORTANT: You need to set up Upstash Redis:
 * 1. Create account at https://upstash.com
 * 2. Create a Redis database
 * 3. Add to .env.local:
 *    UPSTASH_REDIS_REST_URL=your_url
 *    UPSTASH_REDIS_REST_TOKEN=your_token
 *
 * For local development without Upstash, this falls back to in-memory cache
 */

// Create Redis client (will use env vars automatically)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * Rate limiter for general API requests
 * 10 requests per 10 seconds per IP/user
 */
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

/**
 * Rate limiter for AI generation requests (expensive)
 * 3 requests per minute per user
 */
export const aiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 m'),
      analytics: true,
      prefix: 'ratelimit:ai',
    })
  : null;

/**
 * Rate limiter for authentication attempts
 * 5 attempts per 15 minutes per IP
 */
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

/**
 * Rate limiter for project saves
 * 30 saves per hour per user
 */
export const saveRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 h'),
      analytics: true,
      prefix: 'ratelimit:save',
    })
  : null;

/**
 * Apply rate limiting to a request
 * Returns { success: boolean, limit, remaining, reset }
 */
export async function rateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // If no Redis configured, allow all requests in development
  if (!limiter) {
    console.warn('⚠️  Rate limiting disabled - configure Upstash Redis');
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 10000,
    };
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Get identifier for rate limiting
 * Prefers userId, falls back to IP address
 */
export function getRateLimitIdentifier(
  userId?: string | null,
  request?: Request
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from various headers
  const ip =
    request?.headers.get('x-forwarded-for')?.split(',')[0] ||
    request?.headers.get('x-real-ip') ||
    'anonymous';

  return `ip:${ip}`;
}

/**
 * Create rate limit error response
 */
export function rateLimitExceeded(limit: number, reset: number) {
  const resetDate = new Date(reset);
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again after ${resetDate.toLocaleTimeString()}`,
      limit,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Middleware wrapper for rate limiting
 * Usage in API route:
 *
 * export async function POST(req: Request) {
 *   const rateLimitResult = await checkRateLimit(req, aiRateLimiter);
 *   if (!rateLimitResult.success) return rateLimitResult.response;
 *
 *   // ... rest of handler
 * }
 */
export async function checkRateLimit(
  request: Request,
  limiter: Ratelimit | null,
  userId?: string | null
): Promise<{
  success: boolean;
  response?: Response;
  limit: number;
  remaining: number;
}> {
  const identifier = getRateLimitIdentifier(userId, request);
  const result = await rateLimit(limiter, identifier);

  if (!result.success) {
    return {
      success: false,
      response: rateLimitExceeded(result.limit, result.reset),
      limit: result.limit,
      remaining: 0,
    };
  }

  return {
    success: true,
    limit: result.limit,
    remaining: result.remaining,
  };
}

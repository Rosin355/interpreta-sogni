/**
 * Rate Limiter utility using Upstash Redis
 * Implements sliding window rate limiting per user
 */

export interface RateLimitConfig {
  maxRequests: number;    // Max requests allowed in the window
  windowSeconds: number;  // Time window in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export class RateLimiter {
  private restUrl: string;
  private restToken: string;

  constructor() {
    this.restUrl = Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
    this.restToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';

    if (!this.restUrl || !this.restToken) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured');
    }
  }

  /**
   * Check if a user is allowed to make a request
   * @param userId - User ID to rate limit
   * @param functionName - Name of the function being rate limited
   * @param config - Rate limit configuration
   * @returns RateLimitResult with allowed status and metadata
   */
  async checkLimit(
    userId: string,
    functionName: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${functionName}:${userId}`;
    const now = Date.now();
    const windowStart = now - (config.windowSeconds * 1000);

    try {
      // Remove old entries outside the window
      await this.redisCommand('ZREMRANGEBYSCORE', key, '0', windowStart.toString());

      // Count current requests in window
      const count = await this.redisCommand('ZCARD', key);

      if (count >= config.maxRequests) {
        // Get the oldest timestamp to calculate reset time
        const oldestEntries = await this.redisCommand('ZRANGE', key, '0', '0', 'WITHSCORES');
        const oldestTimestamp = oldestEntries.length > 1 ? parseInt(oldestEntries[1]) : now;
        const resetAt = oldestTimestamp + (config.windowSeconds * 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt
        };
      }

      // Add current request
      await this.redisCommand('ZADD', key, now.toString(), `${now}-${Math.random()}`);

      // Set expiration to clean up old keys
      await this.redisCommand('EXPIRE', key, (config.windowSeconds + 60).toString());

      return {
        allowed: true,
        remaining: config.maxRequests - count - 1,
        resetAt: now + (config.windowSeconds * 1000)
      };

    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: now + (config.windowSeconds * 1000)
      };
    }
  }

  /**
   * Execute a Redis command via Upstash REST API
   */
  private async redisCommand(...args: string[]): Promise<any> {
    const response = await fetch(`${this.restUrl}/${args.join('/')}`, {
      headers: {
        Authorization: `Bearer ${this.restToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Redis command failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  }
}

// Default rate limit configs for different function types
export const RATE_LIMITS = {
  DREAM_OPERATIONS: { maxRequests: 50, windowSeconds: 3600 }, // 50 per hour
  TTS: { maxRequests: 50, windowSeconds: 3600 },              // 50 per hour
  STT: { maxRequests: 50, windowSeconds: 3600 },              // 50 per hour
} as const;

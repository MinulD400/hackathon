/**
 * In-memory rate limiter for API requests.
 * Tracks requests per user/IP with a sliding time window.
 *
 * @module src/infrastructure/ratelimit/RateLimiter
 */

/** Record of requests for a user within current window. */
interface RateLimitRecord {
  /** Number of requests made in current window. */
  count: number;
  /** Timestamp when the current window started. */
  windowStart: number;
}

/** Result of a rate limit check. */
export interface RateLimitCheckResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** If not allowed, seconds to wait before retry. */
  retryAfter?: number;
}

/**
 * In-memory rate limiter tracking requests by user identifier.
 * Implements a sliding window (1-hour duration).
 *
 * Limit: 100 objects per user per hour
 * This prevents abuse of expensive OpenAI API calls.
 */
export class RateLimiter {
  /** Tracking map: userIdentifier → RateLimitRecord. */
  private records = new Map<string, RateLimitRecord>();

  /** Maximum requests per window. */
  private readonly maxRequests = 100;

  /** Window duration in milliseconds (1 hour). */
  private readonly windowMs = 60 * 60 * 1000;

  /**
   * Checks if a user has exceeded the rate limit.
   * Does not record the request — caller must call record() if allowed.
   *
   * @param userIdentifier - Unique identifier (IP, session ID, etc.)
   * @returns Result with allowed status and retry-after if applicable
   */
  check(userIdentifier: string): RateLimitCheckResult {
    const record = this.records.get(userIdentifier);
    const now = Date.now();

    // No previous record — first request in a new window
    if (!record) {
      return { allowed: true };
    }

    // Check if window has expired
    if (now - record.windowStart > this.windowMs) {
      // Window expired, this is a new window
      return { allowed: true };
    }

    // Within current window
    if (record.count < this.maxRequests) {
      // Haven't hit limit yet
      return { allowed: true };
    }

    // Limit exceeded
    const retryAfter = Math.ceil((record.windowStart + this.windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  /**
   * Records a request for a user.
   * Must be called after check() returns allowed=true.
   * Automatically resets window if it has expired.
   *
   * @param userIdentifier - Unique identifier
   */
  record(userIdentifier: string): void {
    const record = this.records.get(userIdentifier);
    const now = Date.now();

    if (!record) {
      // First request
      this.records.set(userIdentifier, {
        count: 1,
        windowStart: now,
      });
      return;
    }

    if (now - record.windowStart > this.windowMs) {
      // Window expired, start new window
      this.records.set(userIdentifier, {
        count: 1,
        windowStart: now,
      });
      return;
    }

    // Same window, increment counter
    record.count++;
  }

  /**
   * Resets rate limit tracking for all users.
   * Useful for testing or admin operations.
   */
  reset(): void {
    this.records.clear();
  }

  /**
   * Gets current request count for a user within their window.
   * Useful for testing and debugging.
   *
   * @param userIdentifier - Unique identifier
   * @returns Request count, or 0 if no record or window expired
   */
  getRequestCount(userIdentifier: string): number {
    const record = this.records.get(userIdentifier);
    if (!record) return 0;

    const now = Date.now();
    if (now - record.windowStart > this.windowMs) {
      return 0; // Window expired
    }

    return record.count;
  }
}

/** Singleton instance of the rate limiter. */
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Gets or creates the singleton rate limiter instance.
 * @returns The singleton RateLimiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Tests for rate limiter.
 * Covers limiting logic and time window behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../RateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow first request', () => {
    const result = limiter.check('user1');
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  it('should record a request', () => {
    limiter.check('user1');
    limiter.record('user1');
    expect(limiter.getRequestCount('user1')).toBe(1);
  });

  it('should allow up to 10 requests per hour', () => {
    const userId = 'user1';
    for (let i = 0; i < 10; i++) {
      const result = limiter.check(userId);
      expect(result.allowed).toBe(true);
      limiter.record(userId);
    }
    expect(limiter.getRequestCount(userId)).toBe(10);
  });

  it('should reject 11th request within same hour', () => {
    const userId = 'user1';
    for (let i = 0; i < 10; i++) {
      limiter.check(userId);
      limiter.record(userId);
    }
    const result = limiter.check(userId);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should provide retry-after time for rejected request', () => {
    const userId = 'user1';
    for (let i = 0; i < 10; i++) {
      limiter.check(userId);
      limiter.record(userId);
    }
    const result = limiter.check(userId);
    expect(result.retryAfter).toBeLessThanOrEqual(3600); // 1 hour in seconds
  });

  it('should allow request after window expires', () => {
    const userId = 'user1';
    for (let i = 0; i < 10; i++) {
      limiter.check(userId);
      limiter.record(userId);
    }

    // Advance time by 1 hour + 1 second
    vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

    const result = limiter.check(userId);
    expect(result.allowed).toBe(true);
  });

  it('should reset count after window expires', () => {
    const userId = 'user1';
    for (let i = 0; i < 5; i++) {
      limiter.check(userId);
      limiter.record(userId);
    }
    expect(limiter.getRequestCount(userId)).toBe(5);

    // Advance time by 1 hour
    vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

    expect(limiter.getRequestCount(userId)).toBe(0);
  });

  it('should track multiple users independently', () => {
    const user1 = 'user1';
    const user2 = 'user2';

    limiter.check(user1);
    limiter.record(user1);
    limiter.check(user1);
    limiter.record(user1);

    limiter.check(user2);
    limiter.record(user2);

    expect(limiter.getRequestCount(user1)).toBe(2);
    expect(limiter.getRequestCount(user2)).toBe(1);
  });

  it('should allow user2 to reach limit independently', () => {
    const user1 = 'user1';
    const user2 = 'user2';

    // Fill user1's limit
    for (let i = 0; i < 10; i++) {
      limiter.check(user1);
      limiter.record(user1);
    }
    expect(limiter.check(user1).allowed).toBe(false);

    // User2 should still be able to make requests
    const result = limiter.check(user2);
    expect(result.allowed).toBe(true);

    // Fill user2's limit
    for (let i = 0; i < 10; i++) {
      limiter.check(user2);
      limiter.record(user2);
    }
    expect(limiter.check(user2).allowed).toBe(false);
  });

  it('should return 0 for non-existent user', () => {
    expect(limiter.getRequestCount('nonexistent')).toBe(0);
  });

  it('should reset all tracking via reset()', () => {
    limiter.check('user1');
    limiter.record('user1');
    limiter.check('user2');
    limiter.record('user2');

    expect(limiter.getRequestCount('user1')).toBe(1);
    expect(limiter.getRequestCount('user2')).toBe(1);

    limiter.reset();

    expect(limiter.getRequestCount('user1')).toBe(0);
    expect(limiter.getRequestCount('user2')).toBe(0);
  });

  it('should allow request after reset', () => {
    for (let i = 0; i < 10; i++) {
      limiter.check('user1');
      limiter.record('user1');
    }
    expect(limiter.check('user1').allowed).toBe(false);

    limiter.reset();

    expect(limiter.check('user1').allowed).toBe(true);
  });
});

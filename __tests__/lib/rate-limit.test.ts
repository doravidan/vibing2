import {
  rateLimit,
  getRateLimitIdentifier,
  rateLimitExceeded,
  checkRateLimit,
} from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  describe('getRateLimitIdentifier', () => {
    it('should use userId when provided', () => {
      const identifier = getRateLimitIdentifier('user-123');

      expect(identifier).toBe('user:user-123');
    });

    it('should fallback to IP when no userId', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const identifier = getRateLimitIdentifier(null, request);

      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should handle multiple IPs in x-forwarded-for', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      const identifier = getRateLimitIdentifier(null, request);

      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should use x-real-ip header as fallback', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-real-ip': '192.168.1.100',
        },
      });

      const identifier = getRateLimitIdentifier(null, request);

      expect(identifier).toBe('ip:192.168.1.100');
    });

    it('should use anonymous when no IP available', () => {
      const request = new Request('http://localhost:3000');

      const identifier = getRateLimitIdentifier(null, request);

      expect(identifier).toBe('ip:anonymous');
    });
  });

  describe('rateLimit', () => {
    it('should return success when no limiter configured', async () => {
      const result = await rateLimit(null, 'test-user');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(999);
      expect(result.remaining).toBe(999);
    });
  });

  describe('rateLimitExceeded', () => {
    it('should create proper error response', () => {
      const reset = Date.now() + 60000; // 1 minute from now
      const response = rateLimitExceeded(10, reset);

      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe(reset.toString());
    });

    it('should include retry-after header', async () => {
      const reset = Date.now() + 60000;
      const response = rateLimitExceeded(10, reset);

      const retryAfter = response.headers.get('Retry-After');
      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter!)).toBeGreaterThan(0);
    });

    it('should include error message in body', async () => {
      const reset = Date.now() + 60000;
      const response = rateLimitExceeded(10, reset);

      const body = await response.json();

      expect(body.error).toBe('Rate limit exceeded');
      expect(body.message).toContain('Too many requests');
      expect(body.limit).toBe(10);
    });
  });

  describe('checkRateLimit', () => {
    it('should return success when no limiter configured', async () => {
      const request = new Request('http://localhost:3000');

      const result = await checkRateLimit(request, null);

      expect(result.success).toBe(true);
      expect(result.response).toBeUndefined();
    });

    it('should use userId when provided', async () => {
      const request = new Request('http://localhost:3000');

      const result = await checkRateLimit(request, null, 'user-123');

      expect(result.success).toBe(true);
    });
  });
});

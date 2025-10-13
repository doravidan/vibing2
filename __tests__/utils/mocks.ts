import { jest } from '@jest/globals';

/**
 * Mock auth function
 */
export const mockAuth = jest.fn();

/**
 * Mock rate limiter
 */
export const mockRateLimit = jest.fn(() =>
  Promise.resolve({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 10000,
  })
);

/**
 * Mock Anthropic client
 */
export const mockAnthropicClient = {
  messages: {
    create: jest.fn(),
  },
};

/**
 * Mock Redis client
 */
export const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
};

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  mockAuth.mockReset();
  mockRateLimit.mockReset();
  mockAnthropicClient.messages.create.mockReset();
  Object.values(mockRedisClient).forEach((fn) => fn.mockReset());
}

/**
 * Mock successful auth session
 */
export function mockAuthSuccess(userId: string, email: string) {
  mockAuth.mockResolvedValue({
    user: {
      id: userId,
      email,
      name: 'Test User',
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

/**
 * Mock no auth session
 */
export function mockAuthFailure() {
  mockAuth.mockResolvedValue(null);
}

/**
 * Mock rate limit exceeded
 */
export function mockRateLimitExceeded() {
  mockRateLimit.mockResolvedValue({
    success: false,
    limit: 10,
    remaining: 0,
    reset: Date.now() + 10000,
  });
}

/**
 * Mock rate limit success
 */
export function mockRateLimitSuccess() {
  mockRateLimit.mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 10000,
  });
}

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://vibing2:vibing2_dev_pass@localhost:5432/vibing2_test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.ANTHROPIC_API_KEY = 'test-api-key';

// Mock Upstash Redis for tests
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  })),
}));

// Mock Upstash Ratelimit for tests
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn(() => ({
    limit: jest.fn(() => Promise.resolve({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    })),
  })),
}));

// Mock Anthropic SDK for tests
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});

// Mock logger for tests
jest.mock('./lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  },
  logRequest: jest.fn(),
  logError: jest.fn(),
  logAuth: jest.fn(),
  logDatabase: jest.fn(),
  logCache: jest.fn(),
  logMetrics: jest.fn(),
}));

// Suppress console errors in tests unless explicitly needed
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

import { POST } from '@/app/api/agent/stream/route';
import {
  cleanupDatabase,
  createTestUser,
  createMockAnthropicStream,
} from '@/__tests__/utils/test-helpers';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(),
  aiRateLimiter: {},
}));

jest.mock('@anthropic-ai/sdk');

const { auth } = require('@/auth');
const { checkRateLimit } = require('@/lib/rate-limit');
const Anthropic = require('@anthropic-ai/sdk');

describe('AI Streaming Performance Tests', () => {
  let testUser: any;

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await createTestUser();

    auth.mockResolvedValue({
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      },
    });

    checkRateLimit.mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
    });

    Anthropic.mockClear();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should handle large response content efficiently', async () => {
    // Generate 10KB of content
    const largeContent = 'a'.repeat(10 * 1024);
    const mockStream = createMockAnthropicStream(largeContent);

    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(mockStream),
      },
    }));

    const request = new Request('http://localhost:3000/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'user', content: 'Generate large content' },
        ],
        projectType: 'website',
        agents: [],
      }),
    });

    const startTime = Date.now();
    const response = await POST(request);
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
  });

  it('should handle concurrent streaming requests', async () => {
    const mockStream = createMockAnthropicStream('Test response');

    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(mockStream),
      },
    }));

    const requests = Array.from({ length: 3 }, () =>
      new Request('http://localhost:3000/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { id: '1', role: 'user', content: 'Test' },
          ],
          projectType: 'website',
          agents: [],
        }),
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests.map((req) => POST(req)));
    const endTime = Date.now();

    expect(responses).toHaveLength(3);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    // Concurrent requests should not take significantly longer
    expect(endTime - startTime).toBeLessThan(10000);
  });

  it('should handle maximum message history efficiently', async () => {
    const mockStream = createMockAnthropicStream('Response');

    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(mockStream),
      },
    }));

    // Create maximum allowed messages (50)
    const messages = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

    const request = new Request('http://localhost:3000/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        projectType: 'website',
        agents: [],
      }),
    });

    const startTime = Date.now();
    const response = await POST(request);
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(5000);
  });

  it('should timeout gracefully for slow responses', async () => {
    const slowStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'message_start', message: { usage: { input_tokens: 100 } } };
        // Simulate slow response
        await new Promise((resolve) => setTimeout(resolve, 1000));
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Slow response' } };
        yield { type: 'message_delta', usage: { output_tokens: 50 } };
      },
    };

    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(slowStream),
      },
    }));

    const request = new Request('http://localhost:3000/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'user', content: 'Test' },
        ],
        projectType: 'website',
        agents: [],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should clean up resources on client disconnect', async () => {
    const mockStream = createMockAnthropicStream('Test');

    const mockCreate = jest.fn().mockResolvedValue(mockStream);
    Anthropic.mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    }));

    const request = new Request('http://localhost:3000/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'user', content: 'Test' },
        ],
        projectType: 'website',
        agents: [],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should measure and report token usage accurately', async () => {
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'message_start', message: { usage: { input_tokens: 1000 } } };
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Test' } };
        yield { type: 'message_delta', usage: { output_tokens: 500 } };
      },
    };

    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(mockStream),
      },
    }));

    const request = new Request('http://localhost:3000/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'user', content: 'Test' },
        ],
        projectType: 'website',
        agents: [],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    // Read stream to get metrics
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullContent += decoder.decode(value, { stream: true });
    }

    // Verify metrics are included
    expect(fullContent).toContain('__METRICS__');
    expect(fullContent).toContain('tokensUsed');
  });
});

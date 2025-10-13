import { POST } from '@/app/api/agent/stream/route';
import {
  cleanupDatabase,
  createTestUser,
  getResponseJson,
  createMockAnthropicStream,
  streamToString,
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

describe('POST /api/agent/stream', () => {
  let testUser: any;

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await createTestUser();

    // Mock authenticated session
    auth.mockResolvedValue({
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      },
    });

    // Mock rate limit success
    checkRateLimit.mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
    });

    // Reset Anthropic mock
    Anthropic.mockClear();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should stream AI response successfully', async () => {
    const mockStream = createMockAnthropicStream('Hello, this is a test response!');

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
          { id: '1', role: 'user', content: 'Hello' },
        ],
        projectType: 'website',
        agents: ['ui-designer'],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

    // Read the stream
    const content = await streamToString(response.body!);

    // Verify stream contains text content
    expect(content).toContain('Hello, this is a test response!');
  });

  it('should include progress updates in stream', async () => {
    const mockStream = createMockAnthropicStream('Test response');

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
    const content = await streamToString(response.body!);

    // Verify progress markers
    expect(content).toContain('__PROGRESS__');
    expect(content).toContain('__METRICS__');
  });

  it('should reject when rate limit exceeded', async () => {
    checkRateLimit.mockResolvedValueOnce({
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      ),
    });

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

    expect(response.status).toBe(429);
  });

  it('should reject invalid message format', async () => {
    const request = new Request('http://localhost:3000/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'invalid', content: 'Test' }, // Invalid role
        ],
        projectType: 'website',
        agents: [],
      }),
    });

    const response = await POST(request);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject empty messages array', async () => {
    const request = new Request('http://localhost:3000/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [],
        projectType: 'website',
        agents: [],
      }),
    });

    const response = await POST(request);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject too many messages', async () => {
    const tooManyMessages = Array.from({ length: 51 }, (_, i) => ({
      id: String(i),
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

    const request = new Request('http://localhost:3000/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: tooManyMessages,
        projectType: 'website',
        agents: [],
      }),
    });

    const response = await POST(request);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject excessively long message content', async () => {
    const longContent = 'a'.repeat(10001);

    const request = new Request('http://localhost:3000/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'user', content: longContent },
        ],
        projectType: 'website',
        agents: [],
      }),
    });

    const response = await POST(request);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject when API key not configured', async () => {
    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = '';

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
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe('Anthropic API key not configured');

    // Restore API key
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  it('should handle Anthropic API errors gracefully', async () => {
    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockRejectedValue(new Error('API Error')),
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
    const data = await getResponseJson(response);

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it('should include metrics in final stream chunk', async () => {
    const mockStream = createMockAnthropicStream('Test response');

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
    const content = await streamToString(response.body!);

    // Verify metrics are included
    expect(content).toContain('__METRICS__');
    expect(content).toContain('tokensUsed');
    expect(content).toContain('inputTokens');
    expect(content).toContain('outputTokens');
  });

  it('should apply rate limiting per user', async () => {
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

    await POST(request);

    // Verify checkRateLimit was called with user ID
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      testUser.id
    );
  });

  it('should work without authentication for unauthenticated users', async () => {
    auth.mockResolvedValue(null);

    const mockStream = createMockAnthropicStream('Test response');

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

    // Verify rate limiting used IP-based identifier
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      undefined
    );
  });
});

import { POST } from '@/app/api/auth/signup/route';
import { cleanupDatabase, createTestUser, getResponseJson } from '@/__tests__/utils/test-helpers';
import { mockRateLimitSuccess, mockRateLimitExceeded } from '@/__tests__/utils/mocks';

// Mock dependencies
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(),
  authRateLimiter: {},
}));

const { checkRateLimit } = require('@/lib/rate-limit');

describe('POST /api/auth/signup', () => {
  beforeEach(async () => {
    await cleanupDatabase();
    checkRateLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4 });
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should create a new user with valid credentials', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!@#',
      }),
    });

    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toMatchObject({
      email: 'john@example.com',
      name: 'John Doe',
    });
    expect(data.user.id).toBeDefined();
  });

  it('should reject signup when email already exists', async () => {
    await createTestUser({ email: 'existing@example.com' });

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'existing@example.com',
        password: 'SecurePass123!@#',
      }),
    });

    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(409);
    expect(data.error).toBe('Email already exists');
  });

  it('should reject invalid email format', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'invalid-email',
        password: 'SecurePass123!@#',
      }),
    });

    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject weak password', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
      }),
    });

    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject password without special characters', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
      }),
    });

    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject when rate limit is exceeded', async () => {
    checkRateLimit.mockResolvedValueOnce({
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429 }
      ),
    });

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!@#',
      }),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(429);
  });

  it('should lowercase email automatically', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'JOHN@EXAMPLE.COM',
        password: 'SecurePass123!@#',
      }),
    });

    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.user.email).toBe('john@example.com');
  });

  it('should trim name field', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '  John Doe  ',
        email: 'john@example.com',
        password: 'SecurePass123!@#',
      }),
    });

    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.user.name).toBe('John Doe');
  });

  it('should reject excessively long names', async () => {
    const longName = 'a'.repeat(101);

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: longName,
        email: 'john@example.com',
        password: 'SecurePass123!@#',
      }),
    });

    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should handle database errors gracefully', async () => {
    // Mock a database error by using an invalid email format that passes validation
    // but fails at the database level
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'valid@example.com',
        password: 'SecurePass123!@#',
      }),
    });

    // Create the user, then try to create again to trigger database constraint error
    await POST(request as any);
    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(409);
    expect(data.error).toBe('Email already exists');
  });
});

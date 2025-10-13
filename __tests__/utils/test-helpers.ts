import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Test database helpers
 */

export async function cleanupDatabase() {
  // Delete in order to respect foreign key constraints
  await prisma.message.deleteMany({});
  await prisma.projectFile.deleteMany({});
  await prisma.projectCollaborator.deleteMany({});
  await prisma.collaborationInvite.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.tokenUsage.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});
}

export async function createTestUser(overrides?: Partial<{
  email: string;
  password: string;
  name: string;
  plan: string;
  tokenBalance: number;
}>) {
  const hashedPassword = await bcrypt.hash(overrides?.password || 'Test123!@#Password', 10);

  return await prisma.user.create({
    data: {
      email: overrides?.email || `test-${Date.now()}@example.com`,
      password: hashedPassword,
      name: overrides?.name || 'Test User',
      plan: overrides?.plan || 'FREE',
      tokenBalance: overrides?.tokenBalance || 10000,
      contextUsed: 0,
    },
  });
}

export async function createTestProject(userId: string, overrides?: Partial<{
  name: string;
  description: string;
  projectType: string;
  activeAgents: string;
  currentCode: string;
  visibility: string;
}>) {
  return await prisma.project.create({
    data: {
      name: overrides?.name || 'Test Project',
      description: overrides?.description || 'Test Description',
      projectType: overrides?.projectType || 'website',
      activeAgents: overrides?.activeAgents || '[]',
      currentCode: overrides?.currentCode || '',
      visibility: overrides?.visibility || 'PRIVATE',
      likes: 0,
      forks: 0,
      userId,
    },
  });
}

export async function createTestMessage(projectId: string, overrides?: Partial<{
  role: string;
  content: string;
}>) {
  return await prisma.message.create({
    data: {
      role: overrides?.role || 'user',
      content: overrides?.content || 'Test message content',
      projectId,
    },
  });
}

export async function createTestSession(userId: string) {
  const sessionToken = `test-session-${Date.now()}-${Math.random()}`;
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });
}

/**
 * Mock session for testing authenticated routes
 */
export function mockSession(userId: string, userEmail: string) {
  return {
    user: {
      id: userId,
      email: userEmail,
      name: 'Test User',
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create a mock Request object for testing
 */
export function createMockRequest(
  method: string,
  body?: any,
  headers?: Record<string, string>
): Request {
  const url = 'http://localhost:3000/api/test';

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Extract JSON from Response
 */
export async function getResponseJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { rawText: text };
  }
}

/**
 * Mock Anthropic streaming response
 */
export function createMockAnthropicStream(content: string) {
  const chunks = [
    { type: 'message_start', message: { usage: { input_tokens: 100 } } },
    { type: 'content_block_start', index: 0 },
    { type: 'content_block_delta', delta: { type: 'text_delta', text: content.substring(0, 50) } },
    { type: 'content_block_delta', delta: { type: 'text_delta', text: content.substring(50) } },
    { type: 'content_block_stop' },
    { type: 'message_delta', usage: { output_tokens: 200 } },
    { type: 'message_stop' },
  ];

  return {
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

/**
 * Wait for a condition to be true (for async testing)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Read stream to string
 */
export async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}

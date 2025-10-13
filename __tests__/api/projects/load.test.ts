import { GET } from '@/app/api/projects/load/route';
import {
  cleanupDatabase,
  createTestUser,
  createTestProject,
  createTestMessage,
  getResponseJson,
} from '@/__tests__/utils/test-helpers';

// Mock auth
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const { auth } = require('@/auth');

describe('GET /api/projects/load', () => {
  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await createTestUser();
    testProject = await createTestProject(testUser.id, {
      name: 'Test Project',
      description: 'Test Description',
      projectType: 'website',
      activeAgents: '["ui-designer"]',
      currentCode: '<html>Test</html>',
    });

    // Mock authenticated session
    auth.mockResolvedValue({
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      },
    });
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should load a project successfully', async () => {
    const request = new Request(
      `http://localhost:3000/api/projects/load?projectId=${testProject.id}`,
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.project).toMatchObject({
      id: testProject.id,
      name: 'Test Project',
      description: 'Test Description',
      projectType: 'website',
      currentCode: '<html>Test</html>',
    });
    expect(data.project.activeAgents).toEqual(['ui-designer']);
  });

  it('should load project with messages', async () => {
    await createTestMessage(testProject.id, {
      role: 'user',
      content: 'Hello',
    });
    await createTestMessage(testProject.id, {
      role: 'assistant',
      content: 'Hi there!',
    });

    const request = new Request(
      `http://localhost:3000/api/projects/load?projectId=${testProject.id}`,
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.project.messages).toHaveLength(2);
    expect(data.project.messages[0].content).toBe('Hello');
    expect(data.project.messages[1].content).toBe('Hi there!');
  });

  it('should reject unauthenticated requests', async () => {
    auth.mockResolvedValue(null);

    const request = new Request(
      `http://localhost:3000/api/projects/load?projectId=${testProject.id}`,
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should reject requests without projectId', async () => {
    const request = new Request(
      'http://localhost:3000/api/projects/load',
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe('Project ID required');
  });

  it('should reject invalid projectId format', async () => {
    const request = new Request(
      'http://localhost:3000/api/projects/load?projectId=invalid-id',
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid project ID format');
  });

  it('should return 404 for non-existent project', async () => {
    const request = new Request(
      'http://localhost:3000/api/projects/load?projectId=clxxxxxxxxxxxxxxxxxxx',
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(404);
    expect(data.error).toBe('Project not found');
  });

  it('should reject access to other users projects', async () => {
    const otherUser = await createTestUser({ email: 'other@example.com' });
    const otherProject = await createTestProject(otherUser.id);

    const request = new Request(
      `http://localhost:3000/api/projects/load?projectId=${otherProject.id}`,
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create 60 messages for pagination testing
      const messages = Array.from({ length: 60 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
        projectId: testProject.id,
      }));

      const { prisma } = require('@/lib/prisma');
      await prisma.message.createMany({ data: messages });
    });

    it('should paginate messages with default limit', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/load?projectId=${testProject.id}`,
        { method: 'GET' }
      );

      const response = await GET(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.project.messages).toHaveLength(50); // Default limit
      expect(data.pagination.hasMore).toBe(true);
      expect(data.pagination.nextCursor).toBeDefined();
    });

    it('should respect custom limit', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/load?projectId=${testProject.id}&limit=20`,
        { method: 'GET' }
      );

      const response = await GET(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.project.messages).toHaveLength(20);
      expect(data.pagination.hasMore).toBe(true);
    });

    it('should load next page using cursor', async () => {
      // First request
      const request1 = new Request(
        `http://localhost:3000/api/projects/load?projectId=${testProject.id}&limit=20`,
        { method: 'GET' }
      );

      const response1 = await GET(request1 as any);
      const data1 = await getResponseJson(response1);

      const firstPageLastMessage = data1.project.messages[19];
      const cursor = data1.pagination.nextCursor;

      // Second request with cursor
      const request2 = new Request(
        `http://localhost:3000/api/projects/load?projectId=${testProject.id}&limit=20&cursor=${cursor}`,
        { method: 'GET' }
      );

      const response2 = await GET(request2 as any);
      const data2 = await getResponseJson(response2);

      expect(response2.status).toBe(200);
      expect(data2.project.messages).toHaveLength(20);
      // Ensure no duplicate messages
      expect(data2.project.messages[0].id).not.toBe(firstPageLastMessage.id);
    });

    it('should indicate no more pages when all messages loaded', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/load?projectId=${testProject.id}&limit=100`,
        { method: 'GET' }
      );

      const response = await GET(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.pagination.hasMore).toBe(false);
      expect(data.pagination.nextCursor).toBeNull();
    });
  });

  it('should return messages in chronological order', async () => {
    const { prisma } = require('@/lib/prisma');

    // Create messages with specific timestamps
    const now = new Date();
    await prisma.message.createMany({
      data: [
        {
          role: 'user',
          content: 'First',
          projectId: testProject.id,
          createdAt: new Date(now.getTime() - 2000),
        },
        {
          role: 'assistant',
          content: 'Second',
          projectId: testProject.id,
          createdAt: new Date(now.getTime() - 1000),
        },
        {
          role: 'user',
          content: 'Third',
          projectId: testProject.id,
          createdAt: now,
        },
      ],
    });

    const request = new Request(
      `http://localhost:3000/api/projects/load?projectId=${testProject.id}`,
      { method: 'GET' }
    );

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.project.messages[0].content).toBe('First');
    expect(data.project.messages[1].content).toBe('Second');
    expect(data.project.messages[2].content).toBe('Third');
  });
});

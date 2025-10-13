import { POST } from '@/app/api/projects/save/route';
import {
  cleanupDatabase,
  createTestUser,
  createTestProject,
  getResponseJson,
} from '@/__tests__/utils/test-helpers';

// Mock auth
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const { auth } = require('@/auth');

describe('POST /api/projects/save', () => {
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
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('Create new project', () => {
    it('should create a new project successfully', async () => {
      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: null,
          name: 'My New Project',
          description: 'A test project',
          projectType: 'website',
          activeAgents: '["ui-designer", "developer"]',
          messages: [
            { id: '1', role: 'user', content: 'Hello' },
            { id: '2', role: 'assistant', content: 'Hi there!' },
          ],
          currentCode: '<html>Test</html>',
        }),
      });

      const response = await POST(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.project).toMatchObject({
        name: 'My New Project',
        userId: testUser.id,
      });
      expect(data.project.id).toBeDefined();
    });

    it('should create project with minimal data', async () => {
      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: null,
          name: 'Minimal Project',
          projectType: 'website',
          activeAgents: '[]',
          messages: [],
        }),
      });

      const response = await POST(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      auth.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: null,
          name: 'Test Project',
          projectType: 'website',
          activeAgents: '[]',
          messages: [],
        }),
      });

      const response = await POST(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject invalid project data', async () => {
      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: null,
          // Missing required fields
          activeAgents: '[]',
        }),
      });

      const response = await POST(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Update existing project', () => {
    it('should update an existing project successfully', async () => {
      const project = await createTestProject(testUser.id, {
        name: 'Original Name',
        currentCode: '<html>Original</html>',
      });

      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          name: 'Updated Name',
          projectType: 'website',
          activeAgents: '[]',
          messages: [
            { id: '1', role: 'user', content: 'Updated message' },
          ],
          currentCode: '<html>Updated</html>',
        }),
      });

      const response = await POST(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.project.name).toBe('Updated Name');
      expect(data.project.id).toBe(project.id);
    });

    it('should reject update for non-existent project', async () => {
      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'clxxxxxxxxxxxxxxxxxxx', // Non-existent CUID
          name: 'Updated Name',
          projectType: 'website',
          activeAgents: '[]',
          messages: [],
        }),
      });

      const response = await POST(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });

    it('should reject update for project owned by different user', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherProject = await createTestProject(otherUser.id);

      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: otherProject.id,
          name: 'Hacked Name',
          projectType: 'website',
          activeAgents: '[]',
          messages: [],
        }),
      });

      const response = await POST(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should replace old messages with new ones on update', async () => {
      const { prisma } = require('@/lib/prisma');
      const project = await createTestProject(testUser.id);

      // Create initial messages
      await prisma.message.createMany({
        data: [
          { role: 'user', content: 'Old message 1', projectId: project.id },
          { role: 'assistant', content: 'Old message 2', projectId: project.id },
        ],
      });

      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          name: 'Updated Project',
          projectType: 'website',
          activeAgents: '[]',
          messages: [
            { id: '1', role: 'user', content: 'New message 1' },
          ],
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      // Verify old messages were deleted and new ones created
      const messages = await prisma.message.findMany({
        where: { projectId: project.id },
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('New message 1');
    });
  });

  describe('Transaction rollback', () => {
    it('should rollback on error during message creation', async () => {
      const { prisma } = require('@/lib/prisma');

      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: null,
          name: 'Test Project',
          projectType: 'website',
          activeAgents: '[]',
          messages: [
            { id: '1', role: 'invalid_role', content: 'Test' }, // Invalid role
          ],
        }),
      });

      const response = await POST(request as any);

      // Should fail
      expect(response.status).toBe(400);

      // Verify no project was created
      const projects = await prisma.project.findMany({
        where: { userId: testUser.id },
      });

      expect(projects).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should reject excessively long project names', async () => {
      const longName = 'a'.repeat(101);

      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: null,
          name: longName,
          projectType: 'website',
          activeAgents: '[]',
          messages: [],
        }),
      });

      const response = await POST(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle empty project name gracefully', async () => {
      const request = new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: null,
          name: '',
          projectType: 'website',
          activeAgents: '[]',
          messages: [],
        }),
      });

      const response = await POST(request as any);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});

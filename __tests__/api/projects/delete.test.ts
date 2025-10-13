import { DELETE } from '@/app/api/projects/[projectId]/route';
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

describe('DELETE /api/projects/[projectId]', () => {
  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await createTestUser();
    testProject = await createTestProject(testUser.id);

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

  it('should delete a project successfully', async () => {
    const { prisma } = require('@/lib/prisma');

    const request = new Request(
      `http://localhost:3000/api/projects/${testProject.id}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request as any, {
      params: Promise.resolve({ projectId: testProject.id }),
    });

    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify project is deleted
    const project = await prisma.project.findUnique({
      where: { id: testProject.id },
    });

    expect(project).toBeNull();
  });

  it('should cascade delete associated messages', async () => {
    const { prisma } = require('@/lib/prisma');

    // Create messages
    await createTestMessage(testProject.id);
    await createTestMessage(testProject.id);

    const request = new Request(
      `http://localhost:3000/api/projects/${testProject.id}`,
      { method: 'DELETE' }
    );

    await DELETE(request as any, {
      params: Promise.resolve({ projectId: testProject.id }),
    });

    // Verify messages are deleted
    const messages = await prisma.message.findMany({
      where: { projectId: testProject.id },
    });

    expect(messages).toHaveLength(0);
  });

  it('should reject unauthenticated requests', async () => {
    auth.mockResolvedValue(null);

    const request = new Request(
      `http://localhost:3000/api/projects/${testProject.id}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request as any, {
      params: Promise.resolve({ projectId: testProject.id }),
    });

    const data = await getResponseJson(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should reject deletion of non-existent project', async () => {
    const request = new Request(
      'http://localhost:3000/api/projects/clxxxxxxxxxxxxxxxxxxx',
      { method: 'DELETE' }
    );

    const response = await DELETE(request as any, {
      params: Promise.resolve({ projectId: 'clxxxxxxxxxxxxxxxxxxx' }),
    });

    const data = await getResponseJson(response);

    expect(response.status).toBe(404);
    expect(data.error).toBe('Project not found');
  });

  it('should reject deletion of project owned by different user', async () => {
    const otherUser = await createTestUser({ email: 'other@example.com' });
    const otherProject = await createTestProject(otherUser.id);

    const request = new Request(
      `http://localhost:3000/api/projects/${otherProject.id}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request as any, {
      params: Promise.resolve({ projectId: otherProject.id }),
    });

    const data = await getResponseJson(response);

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('should reject invalid project ID format', async () => {
    const request = new Request(
      'http://localhost:3000/api/projects/invalid-id',
      { method: 'DELETE' }
    );

    const response = await DELETE(request as any, {
      params: Promise.resolve({ projectId: 'invalid-id' }),
    });

    const data = await getResponseJson(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid project ID');
  });
});

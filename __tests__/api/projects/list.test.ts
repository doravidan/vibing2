import { GET } from '@/app/api/projects/list/route';
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

describe('GET /api/projects/list', () => {
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

  it('should return empty list when user has no projects', async () => {
    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.projects).toEqual([]);
  });

  it('should list all projects for authenticated user', async () => {
    await createTestProject(testUser.id, { name: 'Project 1' });
    await createTestProject(testUser.id, { name: 'Project 2' });
    await createTestProject(testUser.id, { name: 'Project 3' });

    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.projects).toHaveLength(3);
    expect(data.projects.map((p: any) => p.name)).toContain('Project 1');
    expect(data.projects.map((p: any) => p.name)).toContain('Project 2');
    expect(data.projects.map((p: any) => p.name)).toContain('Project 3');
  });

  it('should include message count for each project', async () => {
    const project1 = await createTestProject(testUser.id, { name: 'Project 1' });
    const project2 = await createTestProject(testUser.id, { name: 'Project 2' });

    // Add messages to project1
    await createTestMessage(project1.id);
    await createTestMessage(project1.id);
    await createTestMessage(project1.id);

    // Add messages to project2
    await createTestMessage(project2.id);

    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);

    const proj1 = data.projects.find((p: any) => p.name === 'Project 1');
    const proj2 = data.projects.find((p: any) => p.name === 'Project 2');

    expect(proj1.messageCount).toBe(3);
    expect(proj2.messageCount).toBe(1);
  });

  it('should return projects in descending order by updatedAt', async () => {
    const { prisma } = require('@/lib/prisma');

    const now = new Date();

    // Create projects with different updatedAt timestamps
    const project1 = await createTestProject(testUser.id, { name: 'Oldest' });
    await prisma.project.update({
      where: { id: project1.id },
      data: { updatedAt: new Date(now.getTime() - 3000) },
    });

    const project2 = await createTestProject(testUser.id, { name: 'Middle' });
    await prisma.project.update({
      where: { id: project2.id },
      data: { updatedAt: new Date(now.getTime() - 2000) },
    });

    const project3 = await createTestProject(testUser.id, { name: 'Newest' });
    await prisma.project.update({
      where: { id: project3.id },
      data: { updatedAt: now },
    });

    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.projects[0].name).toBe('Newest');
    expect(data.projects[1].name).toBe('Middle');
    expect(data.projects[2].name).toBe('Oldest');
  });

  it('should limit results to 20 projects', async () => {
    // Create 25 projects
    for (let i = 0; i < 25; i++) {
      await createTestProject(testUser.id, { name: `Project ${i}` });
    }

    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.projects).toHaveLength(20);
  });

  it('should not include other users projects', async () => {
    const otherUser = await createTestUser({ email: 'other@example.com' });

    await createTestProject(testUser.id, { name: 'My Project' });
    await createTestProject(otherUser.id, { name: 'Other Project' });

    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].name).toBe('My Project');
  });

  it('should reject unauthenticated requests', async () => {
    auth.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should include all project metadata', async () => {
    await createTestProject(testUser.id, {
      name: 'Full Project',
      description: 'A complete project',
      projectType: 'website',
      activeAgents: '["ui-designer", "developer"]',
    });

    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.projects[0]).toMatchObject({
      name: 'Full Project',
      description: 'A complete project',
      projectType: 'website',
      activeAgents: ['ui-designer', 'developer'],
    });
    expect(data.projects[0].id).toBeDefined();
    expect(data.projects[0].createdAt).toBeDefined();
    expect(data.projects[0].updatedAt).toBeDefined();
  });

  it('should handle projects with no description', async () => {
    await createTestProject(testUser.id, {
      name: 'No Description Project',
      description: '',
    });

    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.projects[0].description).toBe('');
  });

  it('should handle projects with empty active agents', async () => {
    await createTestProject(testUser.id, {
      name: 'No Agents Project',
      activeAgents: '[]',
    });

    const request = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.projects[0].activeAgents).toEqual([]);
  });
});

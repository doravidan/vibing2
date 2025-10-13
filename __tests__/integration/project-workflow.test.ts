import { POST as SaveProject } from '@/app/api/projects/save/route';
import { GET as LoadProject } from '@/app/api/projects/load/route';
import { GET as ListProjects } from '@/app/api/projects/list/route';
import { DELETE as DeleteProject } from '@/app/api/projects/[projectId]/route';
import { cleanupDatabase, createTestUser, getResponseJson } from '@/__tests__/utils/test-helpers';

// Mock auth
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const { auth } = require('@/auth');

describe('Project Workflow Integration', () => {
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

  it('should complete full project lifecycle', async () => {
    // Step 1: Create a new project
    const createRequest = new Request('http://localhost:3000/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: null,
        name: 'Integration Test Project',
        description: 'Created during integration test',
        projectType: 'website',
        activeAgents: '["ui-designer"]',
        messages: [
          { id: '1', role: 'user', content: 'Create a website' },
          { id: '2', role: 'assistant', content: 'Here is your website' },
        ],
        currentCode: '<html>Test</html>',
      }),
    });

    const createResponse = await SaveProject(createRequest as any);
    const createData = await getResponseJson(createResponse);

    expect(createResponse.status).toBe(200);
    expect(createData.success).toBe(true);
    expect(createData.project.id).toBeDefined();

    const projectId = createData.project.id;

    // Step 2: Load the project
    const loadRequest = new Request(
      `http://localhost:3000/api/projects/load?projectId=${projectId}`,
      { method: 'GET' }
    );

    const loadResponse = await LoadProject(loadRequest as any);
    const loadData = await getResponseJson(loadResponse);

    expect(loadResponse.status).toBe(200);
    expect(loadData.project.id).toBe(projectId);
    expect(loadData.project.name).toBe('Integration Test Project');
    expect(loadData.project.messages).toHaveLength(2);
    expect(loadData.project.currentCode).toBe('<html>Test</html>');

    // Step 3: Update the project
    const updateRequest = new Request('http://localhost:3000/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        name: 'Updated Project Name',
        description: 'Updated description',
        projectType: 'website',
        activeAgents: '["ui-designer", "developer"]',
        messages: [
          { id: '1', role: 'user', content: 'Create a website' },
          { id: '2', role: 'assistant', content: 'Here is your website' },
          { id: '3', role: 'user', content: 'Make it better' },
        ],
        currentCode: '<html>Updated</html>',
      }),
    });

    const updateResponse = await SaveProject(updateRequest as any);
    const updateData = await getResponseJson(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updateData.project.name).toBe('Updated Project Name');

    // Step 4: List projects
    const listRequest = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const listResponse = await ListProjects(listRequest as any);
    const listData = await getResponseJson(listResponse);

    expect(listResponse.status).toBe(200);
    expect(listData.projects).toHaveLength(1);
    expect(listData.projects[0].name).toBe('Updated Project Name');

    // Step 5: Load updated project
    const loadUpdatedRequest = new Request(
      `http://localhost:3000/api/projects/load?projectId=${projectId}`,
      { method: 'GET' }
    );

    const loadUpdatedResponse = await LoadProject(loadUpdatedRequest as any);
    const loadUpdatedData = await getResponseJson(loadUpdatedResponse);

    expect(loadUpdatedResponse.status).toBe(200);
    expect(loadUpdatedData.project.messages).toHaveLength(3);
    expect(loadUpdatedData.project.currentCode).toBe('<html>Updated</html>');

    // Step 6: Delete the project
    const deleteRequest = new Request(
      `http://localhost:3000/api/projects/${projectId}`,
      { method: 'DELETE' }
    );

    const deleteResponse = await DeleteProject(deleteRequest as any, {
      params: Promise.resolve({ projectId }),
    });

    const deleteData = await getResponseJson(deleteResponse);

    expect(deleteResponse.status).toBe(200);
    expect(deleteData.success).toBe(true);

    // Step 7: Verify project is deleted
    const { prisma } = require('@/lib/prisma');
    const deletedProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    expect(deletedProject).toBeNull();

    // Step 8: Verify list is empty
    const finalListRequest = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const finalListResponse = await ListProjects(finalListRequest as any);
    const finalListData = await getResponseJson(finalListResponse);

    expect(finalListResponse.status).toBe(200);
    expect(finalListData.projects).toHaveLength(0);
  });

  it('should handle concurrent project operations', async () => {
    // Create multiple projects concurrently
    const createRequests = Array.from({ length: 5 }, (_, i) =>
      new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: null,
          name: `Concurrent Project ${i + 1}`,
          projectType: 'website',
          activeAgents: '[]',
          messages: [],
        }),
      })
    );

    const createResponses = await Promise.all(
      createRequests.map((req) => SaveProject(req as any))
    );

    // Verify all projects were created successfully
    for (const response of createResponses) {
      expect(response.status).toBe(200);
    }

    // List all projects
    const listRequest = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const listResponse = await ListProjects(listRequest as any);
    const listData = await getResponseJson(listResponse);

    expect(listResponse.status).toBe(200);
    expect(listData.projects).toHaveLength(5);
  });

  it('should maintain data integrity during rapid updates', async () => {
    // Create a project
    const createRequest = new Request('http://localhost:3000/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: null,
        name: 'Rapid Update Test',
        projectType: 'website',
        activeAgents: '[]',
        messages: [],
      }),
    });

    const createResponse = await SaveProject(createRequest as any);
    const createData = await getResponseJson(createResponse);
    const projectId = createData.project.id;

    // Perform rapid updates
    const updateRequests = Array.from({ length: 3 }, (_, i) =>
      new Request('http://localhost:3000/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: `Update ${i + 1}`,
          projectType: 'website',
          activeAgents: '[]',
          messages: Array.from({ length: i + 1 }, (_, j) => ({
            id: `${i}-${j}`,
            role: j % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${j + 1}`,
          })),
        }),
      })
    );

    await Promise.all(updateRequests.map((req) => SaveProject(req as any)));

    // Load final state
    const loadRequest = new Request(
      `http://localhost:3000/api/projects/load?projectId=${projectId}`,
      { method: 'GET' }
    );

    const loadResponse = await LoadProject(loadRequest as any);
    const loadData = await getResponseJson(loadResponse);

    expect(loadResponse.status).toBe(200);
    expect(loadData.project.id).toBe(projectId);
    // Project should have messages from one of the updates
    expect(loadData.project.messages.length).toBeGreaterThan(0);
  });

  it('should isolate projects between different users', async () => {
    const user1 = testUser;
    const user2 = await createTestUser({ email: 'user2@example.com' });

    // Create project for user 1
    const user1Request = new Request('http://localhost:3000/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: null,
        name: 'User 1 Project',
        projectType: 'website',
        activeAgents: '[]',
        messages: [],
      }),
    });

    await SaveProject(user1Request as any);

    // Switch to user 2
    auth.mockResolvedValue({
      user: {
        id: user2.id,
        email: user2.email,
        name: user2.name,
      },
    });

    // Create project for user 2
    const user2Request = new Request('http://localhost:3000/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: null,
        name: 'User 2 Project',
        projectType: 'website',
        activeAgents: '[]',
        messages: [],
      }),
    });

    await SaveProject(user2Request as any);

    // List projects for user 2
    const listRequest = new Request('http://localhost:3000/api/projects/list', {
      method: 'GET',
    });

    const listResponse = await ListProjects(listRequest as any);
    const listData = await getResponseJson(listResponse);

    // User 2 should only see their own project
    expect(listResponse.status).toBe(200);
    expect(listData.projects).toHaveLength(1);
    expect(listData.projects[0].name).toBe('User 2 Project');
  });
});

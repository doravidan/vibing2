import {
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
  createProject,
  getProjectsByUserId,
  getProjectById,
  updateProject,
  deleteProject,
  createMessage,
  getMessagesByProjectId,
} from '@/lib/db-helpers';
import { cleanupDatabase } from '@/__tests__/utils/test-helpers';

describe('Database Helpers', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('User operations', () => {
    it('should create a new user', async () => {
      const userId = await createUser('test@example.com', 'password123', 'Test User');

      expect(userId).toBeDefined();
      expect(typeof userId).toBe('string');

      const user = await getUserById(userId);
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(user?.name).toBe('Test User');
      expect(user?.plan).toBe('FREE');
      expect(user?.tokenBalance).toBe(10000);
    });

    it('should hash password when creating user', async () => {
      const userId = await createUser('test@example.com', 'password123');

      const user = await getUserById(userId);
      expect(user?.password).not.toBe('password123');
      expect(user?.password.length).toBeGreaterThan(20);
    });

    it('should get user by email', async () => {
      await createUser('test@example.com', 'password123', 'Test User');

      const user = await getUserByEmail('test@example.com');
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(user?.name).toBe('Test User');
    });

    it('should return null for non-existent email', async () => {
      const user = await getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should get user by id', async () => {
      const userId = await createUser('test@example.com', 'password123');

      const user = await getUserById(userId);
      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
    });

    it('should verify correct password', async () => {
      const userId = await createUser('test@example.com', 'password123');
      const user = await getUserById(userId);

      const isValid = await verifyPassword('password123', user!.password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const userId = await createUser('test@example.com', 'password123');
      const user = await getUserById(userId);

      const isValid = await verifyPassword('wrongpassword', user!.password);
      expect(isValid).toBe(false);
    });

    it('should create user without name', async () => {
      const userId = await createUser('test@example.com', 'password123');

      const user = await getUserById(userId);
      expect(user?.name).toBeNull();
    });
  });

  describe('Project operations', () => {
    let userId: string;

    beforeEach(async () => {
      userId = await createUser('test@example.com', 'password123');
    });

    it('should create a new project', async () => {
      const projectId = await createProject({
        name: 'Test Project',
        description: 'A test project',
        projectType: 'website',
        userId,
      });

      expect(projectId).toBeDefined();

      const project = await getProjectById(projectId);
      expect(project).toBeDefined();
      expect(project?.name).toBe('Test Project');
      expect(project?.description).toBe('A test project');
      expect(project?.projectType).toBe('website');
      expect(project?.visibility).toBe('PRIVATE');
    });

    it('should create project without description', async () => {
      const projectId = await createProject({
        name: 'Test Project',
        projectType: 'website',
        userId,
      });

      const project = await getProjectById(projectId);
      expect(project?.description).toBe('');
    });

    it('should get projects by user id', async () => {
      await createProject({
        name: 'Project 1',
        projectType: 'website',
        userId,
      });

      await createProject({
        name: 'Project 2',
        projectType: 'website',
        userId,
      });

      const projects = await getProjectsByUserId(userId);
      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.name)).toContain('Project 1');
      expect(projects.map((p) => p.name)).toContain('Project 2');
    });

    it('should return projects in descending order by creation date', async () => {
      const { prisma } = require('@/lib/prisma');

      const project1Id = await createProject({
        name: 'Older Project',
        projectType: 'website',
        userId,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const project2Id = await createProject({
        name: 'Newer Project',
        projectType: 'website',
        userId,
      });

      const projects = await getProjectsByUserId(userId);
      expect(projects[0].name).toBe('Newer Project');
      expect(projects[1].name).toBe('Older Project');
    });

    it('should update project', async () => {
      const projectId = await createProject({
        name: 'Original Name',
        projectType: 'website',
        userId,
      });

      await updateProject(projectId, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      const project = await getProjectById(projectId);
      expect(project?.name).toBe('Updated Name');
      expect(project?.description).toBe('Updated description');
    });

    it('should delete project', async () => {
      const projectId = await createProject({
        name: 'Test Project',
        projectType: 'website',
        userId,
      });

      await deleteProject(projectId);

      const project = await getProjectById(projectId);
      expect(project).toBeNull();
    });

    it('should cascade delete messages when deleting project', async () => {
      const { prisma } = require('@/lib/prisma');

      const projectId = await createProject({
        name: 'Test Project',
        projectType: 'website',
        userId,
      });

      await createMessage({
        role: 'user',
        content: 'Test message',
        projectId,
      });

      await deleteProject(projectId);

      const messages = await prisma.message.findMany({
        where: { projectId },
      });

      expect(messages).toHaveLength(0);
    });
  });

  describe('Message operations', () => {
    let userId: string;
    let projectId: string;

    beforeEach(async () => {
      userId = await createUser('test@example.com', 'password123');
      projectId = await createProject({
        name: 'Test Project',
        projectType: 'website',
        userId,
      });
    });

    it('should create a message', async () => {
      const messageId = await createMessage({
        role: 'user',
        content: 'Hello, world!',
        projectId,
      });

      expect(messageId).toBeDefined();

      const messages = await getMessagesByProjectId(projectId);
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello, world!');
    });

    it('should get messages by project id', async () => {
      await createMessage({
        role: 'user',
        content: 'Message 1',
        projectId,
      });

      await createMessage({
        role: 'assistant',
        content: 'Message 2',
        projectId,
      });

      const messages = await getMessagesByProjectId(projectId);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
    });

    it('should return messages in chronological order', async () => {
      const { prisma } = require('@/lib/prisma');

      const now = new Date();

      await prisma.message.createMany({
        data: [
          {
            role: 'user',
            content: 'First',
            projectId,
            createdAt: new Date(now.getTime() - 2000),
          },
          {
            role: 'assistant',
            content: 'Second',
            projectId,
            createdAt: new Date(now.getTime() - 1000),
          },
          {
            role: 'user',
            content: 'Third',
            projectId,
            createdAt: now,
          },
        ],
      });

      const messages = await getMessagesByProjectId(projectId);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });
  });
});

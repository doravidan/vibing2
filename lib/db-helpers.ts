import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

// User operations
export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null,
      plan: 'FREE',
      tokenBalance: 10000,
      contextUsed: 0,
    },
  });

  return user.id;
}

export async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Project operations
export async function createProject(data: {
  name: string;
  description?: string;
  projectType: string;
  userId: string;
}) {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description || '',
      projectType: data.projectType,
      activeAgents: '[]',
      visibility: 'PRIVATE',
      likes: 0,
      forks: 0,
      userId: data.userId,
    },
  });

  return project.id;
}

export async function getProjectsByUserId(userId: string) {
  return await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      messages: true,
    },
  });
}

export async function getProjectById(projectId: string) {
  return await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function updateProject(projectId: string, updates: any) {
  return await prisma.project.update({
    where: { id: projectId },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });
}

export async function deleteProject(projectId: string) {
  return await prisma.project.delete({
    where: { id: projectId },
  });
}

// Message operations
export async function createMessage(data: {
  role: string;
  content: string;
  projectId: string;
}) {
  const message = await prisma.message.create({
    data: {
      role: data.role,
      content: data.content,
      projectId: data.projectId,
    },
  });

  return message.id;
}

export async function getMessagesByProjectId(projectId: string) {
  return await prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
}

// Token usage operations
export async function logTokenUsage(data: {
  userId: string;
  tokensUsed: number;
  contextUsed: number;
  savedTokens: number;
  endpoint: string;
}) {
  const usage = await prisma.tokenUsage.create({
    data: {
      userId: data.userId,
      tokensUsed: data.tokensUsed,
      contextUsed: data.contextUsed,
      savedTokens: data.savedTokens,
      endpoint: data.endpoint,
    },
  });

  return usage.id;
}

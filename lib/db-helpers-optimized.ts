import { prismaOptimized, queryHelpers, withTransaction } from './prisma-optimized';
import { cacheManager, Cacheable, CACHE_CONFIG } from './cache-manager';
import bcrypt from 'bcryptjs';
import { logger } from './logger';

// ====================================
// User Operations with Caching
// ====================================

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prismaOptimized.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null,
      plan: 'FREE',
      tokenBalance: 10000,
      contextUsed: 0,
    },
  });

  // Cache the new user
  await cacheManager.cacheUser(user.id, user);

  return user.id;
}

export async function getUserByEmail(email: string) {
  // Email lookups are not cached as they're used for authentication
  return await prismaOptimized.user.findUnique({
    where: { email },
  });
}

export async function getUserById(userId: string) {
  // Check cache first
  const cached = await cacheManager.getUser(userId);
  if (cached) return cached;

  // Fetch from database
  const user = await prismaOptimized.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          projects: true,
          collaborations: true
        }
      }
    }
  });

  // Cache the result
  if (user) {
    await cacheManager.cacheUser(userId, user);
  }

  return user;
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// ====================================
// Project Operations with Caching
// ====================================

export async function createProject(data: {
  name: string;
  description?: string;
  projectType: string;
  userId: string;
}) {
  const project = await prismaOptimized.project.create({
    data: {
      name: data.name,
      description: data.description || '',
      projectType: data.projectType,
      activeAgents: '[]',
      visibility: 'PRIVATE',
      likes: 0,
      forks: 0,
      likeCount: 0,
      forkCount: 0,
      viewCount: 0,
      userId: data.userId,
    },
  });

  // Invalidate user's project list cache
  await cacheManager.invalidateUser(data.userId);

  return project.id;
}

export async function getProjectsByUserId(userId: string) {
  // Use optimized query with proper indexing
  const projects = await prismaOptimized.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          messages: true,
          files: true
        }
      }
    },
    take: 50 // Limit to recent projects
  });

  return projects;
}

export async function getProjectById(projectId: string) {
  // Check cache first
  const cached = await cacheManager.getProject(projectId);
  if (cached) return cached;

  // Use optimized helper with all relations
  const project = await queryHelpers.getProjectWithRelations(projectId);

  // Cache the result
  if (project) {
    await cacheManager.cacheProject(projectId, project);
  }

  return project;
}

export async function updateProject(projectId: string, updates: any) {
  const project = await prismaOptimized.project.update({
    where: { id: projectId },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });

  // Invalidate project cache
  await cacheManager.invalidateProject(projectId);

  return project;
}

export async function deleteProject(projectId: string) {
  const project = await prismaOptimized.project.delete({
    where: { id: projectId },
  });

  // Invalidate all related caches
  await cacheManager.invalidateProject(projectId);
  await cacheManager.invalidateUser(project.userId);

  return project;
}

export async function incrementProjectView(projectId: string) {
  // Use atomic increment to avoid race conditions
  return await prismaOptimized.project.update({
    where: { id: projectId },
    data: {
      viewCount: {
        increment: 1
      }
    }
  });
}

// ====================================
// Message Operations with Pagination
// ====================================

export async function createMessage(data: {
  role: string;
  content: string;
  projectId: string;
  tokens?: number;
}) {
  const message = await prismaOptimized.message.create({
    data: {
      role: data.role,
      content: data.content,
      projectId: data.projectId,
      tokens: data.tokens || 0,
    },
  });

  // Invalidate message cache for this project
  await cacheManager.invalidateProjectMessages(data.projectId);

  return message.id;
}

export async function getMessagesByProjectId(
  projectId: string,
  cursor?: number,
  limit = 50
) {
  // Check cache for initial page
  if (!cursor) {
    const cached = await cacheManager.getProjectMessages(projectId);
    if (cached) return cached;
  }

  // Use optimized pagination helper
  const result = await queryHelpers.getMessagesPaginated(projectId, cursor, limit);

  // Cache the result for initial page
  if (!cursor && result.messages.length > 0) {
    await cacheManager.cacheProjectMessages(projectId, result.messages);
  }

  return result;
}

// ====================================
// File Operations with Batching
// ====================================

export async function getProjectFiles(projectId: string) {
  // Check cache first
  const cached = await cacheManager.getProjectFiles(projectId);
  if (cached) return cached;

  // Fetch from database
  const files = await prismaOptimized.projectFile.findMany({
    where: { projectId },
    orderBy: { path: 'asc' },
    select: {
      id: true,
      path: true,
      content: true,
      language: true,
      size: true,
      createdAt: true,
      updatedAt: true
    }
  });

  // Cache the result
  if (files.length > 0) {
    await cacheManager.cacheProjectFiles(projectId, files);
  }

  return files;
}

export async function batchUpdateFiles(
  projectId: string,
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    path: string;
    data?: any;
  }>
) {
  // Use optimized batch helper with transaction
  const results = await queryHelpers.batchFileOperations(projectId, operations);

  // Invalidate file cache
  await cacheManager.invalidateProjectFiles(projectId);
  await cacheManager.invalidateProject(projectId);

  return results;
}

// ====================================
// Token Usage Operations with Analytics
// ====================================

export async function logTokenUsage(data: {
  userId: string;
  tokensUsed: number;
  contextUsed: number;
  savedTokens: number;
  endpoint: string;
  projectId?: string;
  model?: string;
}) {
  // Calculate cost based on model
  const cost = calculateCost(data.model || 'claude-3', data.tokensUsed);

  const usage = await prismaOptimized.tokenUsage.create({
    data: {
      userId: data.userId,
      tokensUsed: data.tokensUsed,
      contextUsed: data.contextUsed,
      savedTokens: data.savedTokens,
      endpoint: data.endpoint,
      projectId: data.projectId,
      model: data.model,
      cost,
    },
  });

  // Update user's token balance atomically
  await prismaOptimized.user.update({
    where: { id: data.userId },
    data: {
      tokenBalance: {
        decrement: data.tokensUsed
      },
      contextUsed: {
        increment: data.contextUsed
      }
    }
  });

  // Invalidate token usage cache
  await cacheManager.invalidateUser(data.userId);

  return usage.id;
}

export async function getUserTokenUsage(userId: string, days = 30) {
  // Check cache first
  const cacheKey = `token_usage:${userId}:${days}`;
  const cached = await cacheManager.getTokenUsage(cacheKey);
  if (cached) return cached;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const usage = await prismaOptimized.tokenUsage.groupBy({
    by: ['endpoint', 'model'],
    where: {
      userId,
      timestamp: {
        gte: since
      }
    },
    _sum: {
      tokensUsed: true,
      contextUsed: true,
      savedTokens: true,
      cost: true
    },
    _count: {
      _all: true
    }
  });

  // Cache the result
  await cacheManager.cacheTokenUsage(cacheKey, usage);

  return usage;
}

// ====================================
// Discovery & Public Queries
// ====================================

export async function getPublicProjects({
  category,
  search,
  sort = 'recent',
  page = 1,
  limit = 12
}: {
  category?: string;
  search?: string;
  sort?: 'popular' | 'recent' | 'trending' | 'forks';
  page?: number;
  limit?: number;
}) {
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    visibility: 'PUBLIC',
  };

  if (category && category !== 'all') {
    where.projectType = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Build orderBy based on sort (using optimized indexes)
  let orderBy: any = {};
  switch (sort) {
    case 'popular':
      orderBy = { likeCount: 'desc' };
      break;
    case 'trending':
      orderBy = { viewCount: 'desc' };
      break;
    case 'forks':
      orderBy = { forkCount: 'desc' };
      break;
    default:
      orderBy = { createdAt: 'desc' };
  }

  // Execute optimized query with proper indexes
  const [projects, total] = await Promise.all([
    prismaOptimized.project.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        projectType: true,
        likeCount: true,
        forkCount: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    }),
    prismaOptimized.project.count({ where }),
  ]);

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    }
  };
}

// ====================================
// Collaboration Operations
// ====================================

export async function getProjectCollaborators(projectId: string) {
  return await prismaOptimized.projectCollaborator.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    }
  });
}

export async function getUserCollaborations(userId: string) {
  return await prismaOptimized.projectCollaborator.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          projectType: true,
          updatedAt: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

// ====================================
// Utility Functions
// ====================================

function calculateCost(model: string, tokens: number): number {
  // Cost per 1M tokens (example rates)
  const rates: Record<string, number> = {
    'claude-3-opus': 15.00,
    'claude-3-sonnet': 3.00,
    'claude-3-haiku': 0.25,
    'gpt-4': 30.00,
    'gpt-3.5-turbo': 0.50,
  };

  const rate = rates[model] || 1.00;
  return (tokens / 1_000_000) * rate;
}

// ====================================
// Performance Utilities
// ====================================

export async function warmupCache() {
  try {
    logger.info('Starting cache warmup');

    // Get most active projects and users
    const [activeProjects, activeUsers] = await Promise.all([
      prismaOptimized.project.findMany({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { viewCount: 'desc' },
        take: 20,
        select: { id: true }
      }),
      prismaOptimized.user.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true }
      })
    ]);

    // Warm up caches
    await Promise.all([
      ...activeProjects.map(p => getProjectById(p.id)),
      ...activeUsers.map(u => getUserById(u.id))
    ]);

    logger.info('Cache warmup completed', {
      projects: activeProjects.length,
      users: activeUsers.length
    });
  } catch (error) {
    logger.error('Cache warmup failed', { error });
  }
}

// Run cache warmup on startup in production
if (process.env.NODE_ENV === 'production') {
  setTimeout(warmupCache, 5000); // Wait 5 seconds after startup
}
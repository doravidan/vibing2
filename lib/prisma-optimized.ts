import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Types for metrics
interface QueryMetrics {
  query: string;
  duration: number;
  params?: any;
  timestamp: Date;
}

// Extended Prisma Client with connection pooling and monitoring
class OptimizedPrismaClient extends PrismaClient {
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second in ms

  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query'
        },
        {
          emit: 'event',
          level: 'error'
        },
        {
          emit: 'event',
          level: 'warn'
        }
      ],
      // Connection pool configuration
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    this.setupEventHandlers();
    this.setupConnectionPool();
  }

  private setupEventHandlers() {
    // Query event handler for performance monitoring
    this.$on('query' as never, (e: any) => {
      const metrics: QueryMetrics = {
        query: e.query,
        duration: e.duration,
        params: e.params,
        timestamp: new Date()
      };

      this.queryMetrics.push(metrics);

      // Log slow queries
      if (e.duration > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          query: e.query,
          duration: `${e.duration}ms`,
          params: e.params,
          threshold: `${this.slowQueryThreshold}ms`
        });

        // Optional: Store slow queries for analysis
        this.logSlowQuery(metrics);
      }

      // Keep only last 1000 queries in memory
      if (this.queryMetrics.length > 1000) {
        this.queryMetrics.shift();
      }
    });

    // Error event handler
    this.$on('error' as never, (e: any) => {
      logger.error('Database error', {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
    });

    // Warning event handler
    this.$on('warn' as never, (e: any) => {
      logger.warn('Database warning', {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
    });
  }

  private setupConnectionPool() {
    // PostgreSQL connection pool settings via connection URL
    const url = new URL(process.env.DATABASE_URL || '');

    // Add connection pool parameters
    const poolParams = {
      // Connection pool size
      connection_limit: process.env.DB_CONNECTION_LIMIT || '25',

      // Pool timeout
      pool_timeout: process.env.DB_POOL_TIMEOUT || '30',

      // Connection timeout
      connect_timeout: process.env.DB_CONNECT_TIMEOUT || '10',

      // Statement timeout (30 seconds)
      statement_timeout: process.env.DB_STATEMENT_TIMEOUT || '30000',

      // Idle in transaction timeout
      idle_in_transaction_session_timeout: process.env.DB_IDLE_TIMEOUT || '60000',

      // pgBouncer mode (if using pgBouncer)
      pgbouncer: process.env.DB_USE_PGBOUNCER === 'true' ? 'true' : 'false',
    };

    // Append parameters to connection URL
    Object.entries(poolParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    // Update the DATABASE_URL in memory (not the env file)
    process.env.DATABASE_URL = url.toString();
  }

  private async logSlowQuery(metrics: QueryMetrics) {
    try {
      // Store slow queries for analysis
      await this.queryPerformance.create({
        data: {
          query_hash: this.hashQuery(metrics.query),
          query_text: metrics.query.substring(0, 1000), // Limit query text size
          execution_time_ms: metrics.duration,
          timestamp: metrics.timestamp
        }
      });
    } catch (error) {
      logger.error('Failed to log slow query', { error });
    }
  }

  private hashQuery(query: string): string {
    // Simple hash for query deduplication
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  // Performance monitoring methods
  async getQueryMetrics() {
    return {
      totalQueries: this.queryMetrics.length,
      averageDuration: this.queryMetrics.reduce((sum, m) => sum + m.duration, 0) / this.queryMetrics.length,
      slowQueries: this.queryMetrics.filter(m => m.duration > this.slowQueryThreshold),
      recentQueries: this.queryMetrics.slice(-10)
    };
  }

  async getSlowQueries(limit = 10) {
    return this.queryPerformance.findMany({
      orderBy: { execution_time_ms: 'desc' },
      take: limit
    });
  }

  // Connection pool health check
  async checkHealth() {
    try {
      const startTime = Date.now();
      await this.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  // Optimized batch operations
  async batchCreate<T>(model: string, data: any[], batchSize = 100) {
    const results = [];
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const created = await (this as any)[model].createMany({
        data: batch,
        skipDuplicates: true
      });
      results.push(created);
    }
    return results;
  }

  // Optimized pagination with cursor
  async paginateWithCursor<T>(
    model: string,
    {
      cursor,
      take = 20,
      where = {},
      orderBy = { createdAt: 'desc' }
    }: {
      cursor?: string;
      take?: number;
      where?: any;
      orderBy?: any;
    }
  ) {
    const items = await (this as any)[model].findMany({
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      orderBy,
      skip: cursor ? 1 : 0
    });

    const hasNextPage = items.length > take;
    const results = hasNextPage ? items.slice(0, -1) : items;
    const nextCursor = hasNextPage ? results[results.length - 1].id : null;

    return {
      items: results,
      nextCursor,
      hasNextPage
    };
  }

  // Cleanup method
  async cleanup() {
    await this.$disconnect();
  }
}

// Global instance with singleton pattern
const globalForPrisma = globalThis as unknown as {
  prismaOptimized: OptimizedPrismaClient | undefined;
};

export const prismaOptimized =
  globalForPrisma.prismaOptimized ??
  new OptimizedPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaOptimized = prismaOptimized;
}

// Export utility functions
export async function withTransaction<T>(
  fn: (tx: any) => Promise<T>
): Promise<T> {
  return prismaOptimized.$transaction(fn, {
    maxWait: 5000, // Maximum wait time for transaction
    timeout: 10000, // Maximum transaction duration
    isolationLevel: 'ReadCommitted' // Transaction isolation level
  });
}

// Query builder helpers for common patterns
export const queryHelpers = {
  // Optimized project lookup with all relations
  async getProjectWithRelations(projectId: string) {
    return prismaOptimized.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50 // Limit initial messages
        },
        files: {
          orderBy: { path: 'asc' }
        },
        collaborators: {
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
        }
      }
    });
  },

  // Batch file operations with transaction
  async batchFileOperations(projectId: string, operations: any[]) {
    return withTransaction(async (tx) => {
      const results = [];

      for (const op of operations) {
        let result;
        switch (op.type) {
          case 'create':
            result = await tx.projectFile.create({
              data: {
                projectId,
                ...op.data
              }
            });
            break;
          case 'update':
            result = await tx.projectFile.update({
              where: {
                projectId_path: {
                  projectId,
                  path: op.path
                }
              },
              data: op.data
            });
            break;
          case 'delete':
            result = await tx.projectFile.delete({
              where: {
                projectId_path: {
                  projectId,
                  path: op.path
                }
              }
            });
            break;
        }
        results.push(result);
      }

      return results;
    });
  },

  // Optimized message pagination
  async getMessagesPaginated(
    projectId: string,
    cursor?: number,
    limit = 20
  ) {
    const messages = await prismaOptimized.message.findMany({
      where: { projectId },
      orderBy: { cursor: 'desc' },
      take: limit + 1,
      cursor: cursor ? { cursor } : undefined,
      skip: cursor ? 1 : 0
    });

    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, -1) : messages;

    return {
      messages: results,
      nextCursor: hasMore ? results[results.length - 1].cursor : null,
      hasMore
    };
  }
};

export default prismaOptimized;
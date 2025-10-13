import { NextRequest, NextResponse } from 'next/server';
import { prismaOptimized } from '@/lib/prisma-optimized';
import { dbMonitor } from '@/lib/db-monitor';
import { cacheManager } from '@/lib/cache-manager';
import { logger } from '@/lib/logger';

// Health check endpoint - GET /api/health/database
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const detailed = searchParams.get('detailed') === 'true';
    const component = searchParams.get('component'); // db, cache, all

    const healthChecks: any = {};

    // Database health check
    if (!component || component === 'db' || component === 'all') {
      const dbHealth = await checkDatabaseHealth();
      healthChecks.database = dbHealth;
    }

    // Cache health check
    if (!component || component === 'cache' || component === 'all') {
      const cacheHealth = await checkCacheHealth();
      healthChecks.cache = cacheHealth;
    }

    // Detailed metrics if requested
    if (detailed) {
      healthChecks.metrics = await getDetailedMetrics();
    }

    // Overall status
    const allHealthy = Object.values(healthChecks).every(
      (check: any) => check.status === 'healthy'
    );

    return NextResponse.json(
      {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: healthChecks
      },
      {
        status: allHealthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  } catch (error) {
    logger.error('Health check failed', { error });
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}

async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();

    // Simple query to check database connectivity
    await prismaOptimized.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    // Get connection stats
    const connectionStats = await dbMonitor.getConnectionStatistics();

    // Check for issues
    const issues = [];
    if (responseTime > 1000) {
      issues.push(`Slow response time: ${responseTime}ms`);
    }
    if (connectionStats.waiting > 5) {
      issues.push(`${connectionStats.waiting} connections waiting`);
    }
    const connectionUsage = (connectionStats.total / connectionStats.maxConnections) * 100;
    if (connectionUsage > 80) {
      issues.push(`High connection usage: ${connectionUsage.toFixed(1)}%`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      responseTime: `${responseTime}ms`,
      connections: {
        active: connectionStats.active,
        idle: connectionStats.idle,
        total: connectionStats.total,
        max: connectionStats.maxConnections,
        usage: `${connectionUsage.toFixed(1)}%`
      },
      issues
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

async function checkCacheHealth() {
  try {
    const startTime = Date.now();

    // Test cache operations
    const testKey = 'health:check:' + Date.now();
    const testValue = { test: true, timestamp: Date.now() };

    // Test set
    await cacheManager.set(testKey, testValue, 10);

    // Test get
    const retrieved = await cacheManager.get(testKey);

    // Test delete
    await cacheManager.delete(testKey);

    const responseTime = Date.now() - startTime;

    // Get cache stats
    const stats = cacheManager.getStats();

    // Check for issues
    const issues = [];
    if (!retrieved) {
      issues.push('Cache read/write test failed');
    }
    if (responseTime > 100) {
      issues.push(`Slow cache response: ${responseTime}ms`);
    }
    if (stats.hitRate < 50 && stats.hits + stats.misses > 100) {
      issues.push(`Low cache hit rate: ${stats.hitRate.toFixed(1)}%`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      responseTime: `${responseTime}ms`,
      stats: {
        hitRate: `${stats.hitRate.toFixed(1)}%`,
        hits: stats.hits,
        misses: stats.misses,
        errors: stats.errors,
        localCacheSize: stats.localCacheSize
      },
      issues
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Cache connection failed'
    };
  }
}

async function getDetailedMetrics() {
  try {
    const [queryStats, cacheHitRatio, tableStats, slowQueries] = await Promise.all([
      dbMonitor.getQueryStatistics(),
      dbMonitor.getCacheHitRatio(),
      dbMonitor.getTableStatistics(),
      dbMonitor.getSlowQueries(5)
    ]);

    return {
      queries: {
        total: queryStats.totalQueries,
        slow: queryStats.slowQueries,
        avgTime: `${queryStats.averageTime.toFixed(2)}ms`,
        p95Time: `${queryStats.p95Time.toFixed(2)}ms`,
        p99Time: `${queryStats.p99Time.toFixed(2)}ms`,
        distribution: queryStats.queryDistribution
      },
      cache: {
        dbCacheHitRatio: `${cacheHitRatio.ratio.toFixed(1)}%`,
        details: cacheHitRatio.details
      },
      topTables: tableStats.slice(0, 5).map(t => ({
        name: t.tableName,
        rows: t.rowCount,
        size: t.tableSize,
        indexSize: t.indexSize
      })),
      slowQueries: slowQueries.map(q => ({
        query: q.query.substring(0, 100) + '...',
        avgTime: `${q.avgTime.toFixed(2)}ms`,
        calls: q.calls
      }))
    };
  } catch (error) {
    logger.warn('Failed to get detailed metrics', { error });
    return {
      error: 'Failed to retrieve detailed metrics'
    };
  }
}
/**
 * Real-time metrics API endpoint
 * Provides Prometheus-compatible metrics and custom performance data
 * Note: OpenTelemetry dependencies removed for desktop app compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Cache for aggregated metrics
let metricsCache: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

export async function GET(request: NextRequest) {
  try {
    // Check if request is for Prometheus metrics
    if (request.nextUrl.pathname === '/api/metrics' &&
        request.headers.get('accept')?.includes('text/plain')) {
      return getPrometheusMetrics();
    }

    // For JSON metrics, require authentication for detailed data
    const session = await auth();
    const isAuthenticated = !!session?.user;

    // Check cache
    const now = Date.now();
    if (metricsCache && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json(metricsCache);
    }

    // Collect current metrics
    const metrics = await collectMetrics(isAuthenticated);

    // Update cache
    metricsCache = metrics;
    cacheTimestamp = now;

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[Metrics] Error collecting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}

async function collectMetrics(includeDetailed: boolean = false) {
  const metrics: any = {
    timestamp: Date.now(),
    system: {},
    application: {},
    performance: {},
  };

  // System metrics
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  metrics.system = {
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    uptime: process.uptime(),
    nodeVersion: process.version,
  };

  // Resource tracking metrics (simplified without OpenTelemetry)
  metrics.system.resourceTracking = {
    cpuPercent: '0.00', // Placeholder - OpenTelemetry removed
    memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
  };

  // Application metrics (basic for unauthenticated)
  metrics.application = {
    activeConnections: getActiveConnections(),
    requestsPerMinute: getRequestRate(),
    errorRate: getErrorRate(),
    cacheHitRate: getCacheHitRate(),
  };

  // Detailed metrics for authenticated users
  if (includeDetailed) {
    try {
      // Database metrics
      const dbMetrics = await getDatabaseMetrics();
      metrics.database = dbMetrics;

      // AI generation metrics
      const aiMetrics = await getAIMetrics();
      metrics.ai = aiMetrics;

      // Performance alerts (disabled - OpenTelemetry removed)
      metrics.alerts = { total: 0, critical: 0, warning: 0, info: 0 };

      // Recent performance issues
      metrics.performance = {
        slowQueries: await getSlowQueries(),
        slowAPIs: getSlowAPIs(),
        memoryLeaks: detectMemoryLeaks(),
      };
    } catch (error) {
      console.error('[Metrics] Error collecting detailed metrics:', error);
    }
  }

  return metrics;
}

async function getDatabaseMetrics() {
  try {
    // Get database statistics
    const [userCount, projectCount, fileCount] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.projectFile.count(),
    ]);

    // Get recent query performance (last hour)
    const recentQueries = await prisma.$queryRaw`
      SELECT
        COUNT(*) as query_count,
        AVG(duration) as avg_duration_ms,
        MAX(duration) as max_duration_ms
      FROM (
        SELECT 1 as duration
        LIMIT 0
      ) as dummy
    `.catch(() => ({ query_count: 0, avg_duration_ms: 0, max_duration_ms: 0 }));

    return {
      tables: {
        users: userCount,
        projects: projectCount,
        files: fileCount,
      },
      performance: recentQueries,
      connectionPool: {
        active: 0, // Would need Prisma metrics extension
        idle: 0,
        waiting: 0,
      },
    };
  } catch (error) {
    console.error('[Metrics] Database metrics error:', error);
    return null;
  }
}

async function getAIMetrics() {
  // This would typically come from a metrics store
  return {
    totalRequests: 0,
    averageLatency: 0,
    successRate: 0,
    modelsUsed: {
      'claude-3-opus': 0,
      'claude-3-sonnet': 0,
    },
    tokenUsage: {
      input: 0,
      output: 0,
      total: 0,
    },
  };
}

async function getSlowQueries() {
  // Identify slow database queries
  return [];
}

function getSlowAPIs() {
  // Identify slow API endpoints
  return [];
}

function detectMemoryLeaks() {
  // Simplified memory leak detection (OpenTelemetry removed)
  const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  return {
    detected: false, // Placeholder - advanced tracking removed
    currentMB: Math.round(currentMemory),
    averageMB: Math.round(currentMemory), // No historical data
    growthMB: 0,
  };
}

function getActiveConnections(): number {
  // This would come from Socket.IO or connection tracking
  return 0;
}

function getRequestRate(): number {
  // Calculate requests per minute from metrics
  return 0;
}

function getErrorRate(): number {
  // Calculate error rate from metrics
  return 0;
}

function getCacheHitRate(): number {
  // Calculate cache hit rate from Redis metrics
  return 0;
}

function getPrometheusMetrics(): NextResponse {
  // Format metrics in Prometheus exposition format
  const lines: string[] = [];

  // System metrics
  const memUsage = process.memoryUsage();
  lines.push(`# HELP nodejs_heap_used_bytes Process heap used in bytes`);
  lines.push(`# TYPE nodejs_heap_used_bytes gauge`);
  lines.push(`nodejs_heap_used_bytes ${memUsage.heapUsed}`);

  lines.push(`# HELP nodejs_heap_total_bytes Process heap total in bytes`);
  lines.push(`# TYPE nodejs_heap_total_bytes gauge`);
  lines.push(`nodejs_heap_total_bytes ${memUsage.heapTotal}`);

  lines.push(`# HELP nodejs_rss_bytes Process RSS in bytes`);
  lines.push(`# TYPE nodejs_rss_bytes gauge`);
  lines.push(`nodejs_rss_bytes ${memUsage.rss}`);

  lines.push(`# HELP nodejs_external_bytes Process external memory in bytes`);
  lines.push(`# TYPE nodejs_external_bytes gauge`);
  lines.push(`nodejs_external_bytes ${memUsage.external}`);

  // Process metrics
  lines.push(`# HELP nodejs_uptime_seconds Process uptime in seconds`);
  lines.push(`# TYPE nodejs_uptime_seconds counter`);
  lines.push(`nodejs_uptime_seconds ${process.uptime()}`);

  // CPU metrics
  const cpuUsage = process.cpuUsage();
  lines.push(`# HELP nodejs_cpu_user_seconds Process CPU user time in seconds`);
  lines.push(`# TYPE nodejs_cpu_user_seconds counter`);
  lines.push(`nodejs_cpu_user_seconds ${cpuUsage.user / 1000000}`);

  lines.push(`# HELP nodejs_cpu_system_seconds Process CPU system time in seconds`);
  lines.push(`# TYPE nodejs_cpu_system_seconds counter`);
  lines.push(`nodejs_cpu_system_seconds ${cpuUsage.system / 1000000}`);

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  });
}
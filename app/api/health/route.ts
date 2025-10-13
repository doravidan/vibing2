/**
 * Health check endpoint for monitoring
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Redis } from '@upstash/redis';

export async function GET() {
  const health: any = {
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    services: {},
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = {
      status: 'healthy',
      type: 'postgresql',
    };
  } catch (error) {
    health.services.database = {
      status: 'unhealthy',
      error: (error as Error).message,
    };
    health.status = 'degraded';
  }

  // Check Redis (if configured)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.ping();
      health.services.redis = {
        status: 'healthy',
        type: 'upstash',
      };
    } catch (error) {
      health.services.redis = {
        status: 'unhealthy',
        error: (error as Error).message,
      };
      health.status = 'degraded';
    }
  } else {
    health.services.redis = {
      status: 'not_configured',
    };
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memUsageMB = memUsage.heapUsed / 1024 / 1024;
  health.memory = {
    heapUsedMB: Math.round(memUsageMB),
    heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    rssMB: Math.round(memUsage.rss / 1024 / 1024),
  };

  if (memUsageMB > 512) {
    health.memory.warning = 'High memory usage detected';
    if (health.status === 'ok') {
      health.status = 'warning';
    }
  }

  const statusCode = health.status === 'ok' ? 200 :
                     health.status === 'warning' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbMonitor } from '@/lib/db-monitor';
import { logger } from '@/lib/logger';

// GET /api/monitor/queries - Get query performance metrics
export async function GET(req: NextRequest) {
  try {
    // Check authentication - admin only
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, check for admin role
    // For now, we'll allow any authenticated user

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'slow'; // slow, usage, indexes, missing

    let data;

    switch (type) {
      case 'slow':
        const limit = parseInt(searchParams.get('limit') || '10');
        data = await dbMonitor.getSlowQueries(limit);
        break;

      case 'usage':
        data = await dbMonitor.getIndexUsage();
        break;

      case 'unused':
        data = await dbMonitor.getUnusedIndexes();
        break;

      case 'missing':
        data = await dbMonitor.getMissingIndexes();
        break;

      case 'stats':
        data = await dbMonitor.getQueryStatistics();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid query type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Monitor queries error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch query metrics' },
      { status: 500 }
    );
  }
}

// POST /api/monitor/queries/explain - Explain a query execution plan
export async function POST(req: NextRequest) {
  try {
    // Check authentication - admin only
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, params } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const plan = await dbMonitor.explainQuery(query, params);

    return NextResponse.json({
      success: true,
      plan,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Explain query error', { error });
    return NextResponse.json(
      { error: 'Failed to explain query' },
      { status: 500 }
    );
  }
}
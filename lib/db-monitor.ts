import { prismaOptimized } from './prisma-optimized';
import { logger } from './logger';

export interface QueryStats {
  totalQueries: number;
  slowQueries: number;
  averageTime: number;
  p95Time: number;
  p99Time: number;
  queryDistribution: Record<string, number>;
}

export interface TableStats {
  tableName: string;
  rowCount: number;
  indexSize: string;
  tableSize: string;
  lastVacuum: Date | null;
  lastAnalyze: Date | null;
}

export interface ConnectionStats {
  total: number;
  idle: number;
  active: number;
  waiting: number;
  maxConnections: number;
}

export class DatabaseMonitor {
  private metricsInterval: NodeJS.Timer | null = null;
  private queryHistory: Map<string, number[]> = new Map();

  /**
   * Start monitoring database performance
   */
  startMonitoring(intervalMs = 60000) {
    if (this.metricsInterval) {
      this.stopMonitoring();
    }

    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Failed to collect database metrics', { error });
      }
    }, intervalMs);

    logger.info('Database monitoring started', { interval: `${intervalMs}ms` });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      logger.info('Database monitoring stopped');
    }
  }

  /**
   * Collect all metrics
   */
  private async collectMetrics() {
    const [queryStats, tableStats, connectionStats, cacheStats] = await Promise.all([
      this.getQueryStatistics(),
      this.getTableStatistics(),
      this.getConnectionStatistics(),
      this.getCacheHitRatio()
    ]);

    // Log metrics
    logger.info('Database metrics collected', {
      queryStats,
      connectionStats,
      cacheStats,
      topTables: tableStats.slice(0, 5).map(t => ({
        name: t.tableName,
        rows: t.rowCount,
        size: t.tableSize
      }))
    });

    // Check for issues
    this.checkPerformanceIssues(queryStats, connectionStats);
  }

  /**
   * Get query statistics from pg_stat_statements
   */
  async getQueryStatistics(): Promise<QueryStats> {
    try {
      const stats = await prismaOptimized.$queryRaw<any[]>`
        SELECT
          COUNT(*) as total_queries,
          COUNT(CASE WHEN mean_exec_time > 1000 THEN 1 END) as slow_queries,
          AVG(mean_exec_time) as avg_time,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time) as p95_time,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY mean_exec_time) as p99_time
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
      `;

      const distribution = await prismaOptimized.$queryRaw<any[]>`
        SELECT
          CASE
            WHEN mean_exec_time < 10 THEN '<10ms'
            WHEN mean_exec_time < 100 THEN '10-100ms'
            WHEN mean_exec_time < 1000 THEN '100ms-1s'
            WHEN mean_exec_time < 10000 THEN '1s-10s'
            ELSE '>10s'
          END as time_bucket,
          COUNT(*) as query_count
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        GROUP BY time_bucket
        ORDER BY
          CASE time_bucket
            WHEN '<10ms' THEN 1
            WHEN '10-100ms' THEN 2
            WHEN '100ms-1s' THEN 3
            WHEN '1s-10s' THEN 4
            ELSE 5
          END
      `;

      const distMap = distribution.reduce((acc, row) => {
        acc[row.time_bucket] = parseInt(row.query_count);
        return acc;
      }, {} as Record<string, number>);

      const stat = stats[0] || {};
      return {
        totalQueries: parseInt(stat.total_queries || 0),
        slowQueries: parseInt(stat.slow_queries || 0),
        averageTime: parseFloat(stat.avg_time || 0),
        p95Time: parseFloat(stat.p95_time || 0),
        p99Time: parseFloat(stat.p99_time || 0),
        queryDistribution: distMap
      };
    } catch (error) {
      logger.warn('pg_stat_statements not available, using basic metrics');
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageTime: 0,
        p95Time: 0,
        p99Time: 0,
        queryDistribution: {}
      };
    }
  }

  /**
   * Get table statistics
   */
  async getTableStatistics(): Promise<TableStats[]> {
    const stats = await prismaOptimized.$queryRaw<any[]>`
      SELECT
        schemaname,
        tablename,
        n_tup_ins + n_tup_upd + n_tup_del as total_operations,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        last_vacuum,
        last_analyze
      FROM pg_stat_user_tables
      ORDER BY total_operations DESC
      LIMIT 10
    `;

    return stats.map(row => ({
      tableName: row.tablename,
      rowCount: parseInt(row.row_count || 0),
      tableSize: row.table_size,
      indexSize: row.index_size,
      lastVacuum: row.last_vacuum,
      lastAnalyze: row.last_analyze
    }));
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionStatistics(): Promise<ConnectionStats> {
    const stats = await prismaOptimized.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE state = 'idle') as idle,
        COUNT(*) FILTER (WHERE state = 'active') as active,
        COUNT(*) FILTER (WHERE wait_event_type = 'Lock') as waiting,
        current_setting('max_connections')::int as max_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    const stat = stats[0] || {};
    return {
      total: parseInt(stat.total || 0),
      idle: parseInt(stat.idle || 0),
      active: parseInt(stat.active || 0),
      waiting: parseInt(stat.waiting || 0),
      maxConnections: parseInt(stat.max_connections || 100)
    };
  }

  /**
   * Get cache hit ratio
   */
  async getCacheHitRatio(): Promise<{ ratio: number; details: any }> {
    const stats = await prismaOptimized.$queryRaw<any[]>`
      SELECT
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit) as heap_hit,
        sum(idx_blks_read) as idx_read,
        sum(idx_blks_hit) as idx_hit,
        CASE
          WHEN sum(heap_blks_hit) + sum(heap_blks_read) > 0
          THEN (sum(heap_blks_hit) * 100.0) / (sum(heap_blks_hit) + sum(heap_blks_read))
          ELSE 0
        END as heap_hit_ratio,
        CASE
          WHEN sum(idx_blks_hit) + sum(idx_blks_read) > 0
          THEN (sum(idx_blks_hit) * 100.0) / (sum(idx_blks_hit) + sum(idx_blks_read))
          ELSE 0
        END as idx_hit_ratio
      FROM pg_statio_user_tables
    `;

    const stat = stats[0] || {};
    const overallRatio = (parseFloat(stat.heap_hit_ratio || 0) + parseFloat(stat.idx_hit_ratio || 0)) / 2;

    return {
      ratio: overallRatio,
      details: {
        heapHitRatio: parseFloat(stat.heap_hit_ratio || 0),
        indexHitRatio: parseFloat(stat.idx_hit_ratio || 0),
        heapReads: parseInt(stat.heap_read || 0),
        heapHits: parseInt(stat.heap_hit || 0),
        indexReads: parseInt(stat.idx_read || 0),
        indexHits: parseInt(stat.idx_hit || 0)
      }
    };
  }

  /**
   * Identify slow queries
   */
  async getSlowQueries(limit = 10): Promise<any[]> {
    try {
      const queries = await prismaOptimized.$queryRaw<any[]>`
        SELECT
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          stddev_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT ${limit}
      `;

      return queries.map(q => ({
        query: q.query.substring(0, 500),
        calls: parseInt(q.calls || 0),
        totalTime: parseFloat(q.total_exec_time || 0),
        avgTime: parseFloat(q.mean_exec_time || 0),
        stdDev: parseFloat(q.stddev_exec_time || 0),
        rows: parseInt(q.rows || 0),
        cacheHitRatio: parseFloat(q.hit_percent || 0)
      }));
    } catch (error) {
      logger.warn('Unable to fetch slow queries', { error });
      return [];
    }
  }

  /**
   * Get missing indexes suggestions
   */
  async getMissingIndexes(): Promise<any[]> {
    const queries = await prismaOptimized.$queryRaw<any[]>`
      SELECT
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE
        schemaname NOT IN ('pg_catalog', 'information_schema')
        AND n_distinct > 100
        AND correlation < 0.1
      ORDER BY n_distinct DESC
      LIMIT 20
    `;

    return queries.map(q => ({
      schema: q.schemaname,
      table: q.tablename,
      column: q.attname,
      distinctValues: q.n_distinct,
      correlation: q.correlation,
      suggestion: `Consider adding index on ${q.schemaname}.${q.tablename}(${q.attname})`
    }));
  }

  /**
   * Check for performance issues
   */
  private checkPerformanceIssues(queryStats: QueryStats, connectionStats: ConnectionStats) {
    const issues: string[] = [];

    // Check slow query ratio
    if (queryStats.slowQueries > queryStats.totalQueries * 0.1) {
      issues.push(`High slow query ratio: ${queryStats.slowQueries}/${queryStats.totalQueries}`);
    }

    // Check p99 latency
    if (queryStats.p99Time > 5000) {
      issues.push(`High p99 query latency: ${queryStats.p99Time}ms`);
    }

    // Check connection pool usage
    const connectionUsage = (connectionStats.total / connectionStats.maxConnections) * 100;
    if (connectionUsage > 80) {
      issues.push(`High connection pool usage: ${connectionUsage.toFixed(1)}%`);
    }

    // Check for lock waits
    if (connectionStats.waiting > 5) {
      issues.push(`${connectionStats.waiting} connections waiting on locks`);
    }

    if (issues.length > 0) {
      logger.warn('Database performance issues detected', { issues });
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsage(): Promise<any[]> {
    const usage = await prismaOptimized.$queryRaw<any[]>`
      SELECT
        schemaname,
        tablename,
        indexrelname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY idx_scan DESC
      LIMIT 20
    `;

    return usage.map(u => ({
      schema: u.schemaname,
      table: u.tablename,
      index: u.indexrelname,
      scans: parseInt(u.idx_scan || 0),
      tupleReads: parseInt(u.idx_tup_read || 0),
      tupleFetches: parseInt(u.idx_tup_fetch || 0),
      size: u.index_size,
      efficiency: u.idx_scan > 0 ? (u.idx_tup_fetch / u.idx_scan).toFixed(2) : 'N/A'
    }));
  }

  /**
   * Get unused indexes
   */
  async getUnusedIndexes(): Promise<any[]> {
    const unused = await prismaOptimized.$queryRaw<any[]>`
      SELECT
        schemaname,
        tablename,
        indexrelname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE
        schemaname NOT IN ('pg_catalog', 'information_schema')
        AND idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC
    `;

    return unused.map(u => ({
      schema: u.schemaname,
      table: u.tablename,
      index: u.indexrelname,
      size: u.index_size,
      recommendation: 'Consider dropping this unused index to save space and improve write performance'
    }));
  }

  /**
   * Analyze query execution plan
   */
  async explainQuery(query: string, params?: any[]): Promise<any> {
    try {
      const plan = await prismaOptimized.$queryRawUnsafe(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
        ...(params || [])
      );
      return plan;
    } catch (error) {
      logger.error('Failed to explain query', { query, error });
      throw error;
    }
  }
}

// Export singleton instance
export const dbMonitor = new DatabaseMonitor();

// Start monitoring if in production
if (process.env.NODE_ENV === 'production') {
  dbMonitor.startMonitoring();
}
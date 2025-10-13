/**
 * Web Vitals metrics collection endpoint
 * Collects and stores Core Web Vitals from client browsers
 * Note: OpenTelemetry dependencies removed for desktop app compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// In-memory storage for web vitals (in production, use a time-series database)
const webVitalsBuffer: any[] = [];
const MAX_BUFFER_SIZE = 1000;

// Aggregated metrics cache
let aggregatedMetrics: any = null;
let aggregatedTimestamp = 0;
const AGGREGATION_INTERVAL = 60000; // 1 minute

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reports } = body;

    if (!Array.isArray(reports)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Get user info if available
    const session = await auth();
    const userId = session?.user?.id;

    // Process each report
    for (const report of reports) {
      processWebVitalsReport(report, userId);
    }

    return NextResponse.json({ success: true, processed: reports.length });
  } catch (error) {
    console.error('[Web Vitals] Error processing reports:', error);
    return NextResponse.json(
      { error: 'Failed to process reports' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication for viewing metrics
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if aggregated metrics are fresh
    const now = Date.now();
    if (!aggregatedMetrics || now - aggregatedTimestamp > AGGREGATION_INTERVAL) {
      aggregatedMetrics = aggregateWebVitals();
      aggregatedTimestamp = now;
    }

    return NextResponse.json(aggregatedMetrics);
  } catch (error) {
    console.error('[Web Vitals] Error getting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

function processWebVitalsReport(report: any, userId?: string) {
  const { metrics, page, timestamp, userAgent, connection, memory } = report;

  // Store in buffer
  const processedReport = {
    ...report,
    userId,
    processedAt: Date.now(),
  };

  webVitalsBuffer.push(processedReport);

  // Limit buffer size
  if (webVitalsBuffer.length > MAX_BUFFER_SIZE) {
    webVitalsBuffer.shift();
  }

  // Log metrics (OpenTelemetry removed - simplified logging)
  if (metrics.lcp !== undefined && metrics.lcp > 4000) {
    console.warn(`[Web Vitals] Poor LCP on ${page}: ${metrics.lcp}ms`);
  }

  if (metrics.fid !== undefined && metrics.fid > 300) {
    console.warn(`[Web Vitals] Poor FID on ${page}: ${metrics.fid}ms`);
  }

  if (metrics.cls !== undefined && metrics.cls > 0.25) {
    console.warn(`[Web Vitals] Poor CLS on ${page}: ${metrics.cls}`);
  }

  // Log connection quality if available
  if (connection?.effectiveType) {
    console.info(`[Web Vitals] Connection: ${connection.effectiveType}, RTT: ${connection.rtt}ms`);
  }

  // Check memory usage if available
  if (memory?.usedJSHeapSize) {
    const heapUsageMB = memory.usedJSHeapSize / 1024 / 1024;
    if (heapUsageMB > 50) {
      console.warn(`[Web Vitals] High client memory usage: ${heapUsageMB.toFixed(2)}MB`);
    }
  }
}

function aggregateWebVitals() {
  if (webVitalsBuffer.length === 0) {
    return {
      summary: 'No data available',
      sampleCount: 0,
    };
  }

  // Group by page
  const byPage: Record<string, any> = {};

  for (const report of webVitalsBuffer) {
    const page = report.page || 'unknown';
    if (!byPage[page]) {
      byPage[page] = {
        count: 0,
        lcp: [],
        fid: [],
        cls: [],
        fcp: [],
        ttfb: [],
        inp: [],
      };
    }

    byPage[page].count++;

    // Collect metric values
    if (report.metrics.lcp !== undefined) byPage[page].lcp.push(report.metrics.lcp);
    if (report.metrics.fid !== undefined) byPage[page].fid.push(report.metrics.fid);
    if (report.metrics.cls !== undefined) byPage[page].cls.push(report.metrics.cls);
    if (report.metrics.fcp !== undefined) byPage[page].fcp.push(report.metrics.fcp);
    if (report.metrics.ttfb !== undefined) byPage[page].ttfb.push(report.metrics.ttfb);
    if (report.metrics.inp !== undefined) byPage[page].inp.push(report.metrics.inp);
  }

  // Calculate statistics for each page
  const pageStats: Record<string, any> = {};

  for (const [page, data] of Object.entries(byPage)) {
    pageStats[page] = {
      sampleCount: data.count,
      metrics: {},
    };

    // Calculate percentiles for each metric
    for (const metric of ['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'inp']) {
      const values = data[metric];
      if (values.length > 0) {
        values.sort((a: number, b: number) => a - b);
        pageStats[page].metrics[metric] = {
          p50: percentile(values, 50),
          p75: percentile(values, 75),
          p95: percentile(values, 95),
          p99: percentile(values, 99),
          min: values[0],
          max: values[values.length - 1],
          avg: values.reduce((a: number, b: number) => a + b, 0) / values.length,
          samples: values.length,
          rating: getMetricRating(metric, percentile(values, 75)),
        };
      }
    }
  }

  // Calculate overall statistics
  const allMetrics: Record<string, number[]> = {
    lcp: [],
    fid: [],
    cls: [],
    fcp: [],
    ttfb: [],
    inp: [],
  };

  for (const report of webVitalsBuffer) {
    for (const metric of Object.keys(allMetrics)) {
      if (report.metrics[metric] !== undefined) {
        allMetrics[metric].push(report.metrics[metric]);
      }
    }
  }

  const overallStats: Record<string, any> = {};
  for (const [metric, values] of Object.entries(allMetrics)) {
    if (values.length > 0) {
      values.sort((a, b) => a - b);
      overallStats[metric] = {
        p50: percentile(values, 50),
        p75: percentile(values, 75),
        p95: percentile(values, 95),
        p99: percentile(values, 99),
        samples: values.length,
        rating: getMetricRating(metric, percentile(values, 75)),
      };
    }
  }

  return {
    timestamp: Date.now(),
    sampleCount: webVitalsBuffer.length,
    timeRange: {
      oldest: webVitalsBuffer[0].timestamp,
      newest: webVitalsBuffer[webVitalsBuffer.length - 1].timestamp,
    },
    overall: overallStats,
    byPage: pageStats,
  };
}

function percentile(values: number[], p: number): number {
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, index)];
}

function getMetricRating(metric: string, value: number): string {
  const thresholds: Record<string, { good: number; poor: number }> = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
    inp: { good: 200, poor: 500 },
  };

  const threshold = thresholds[metric];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}
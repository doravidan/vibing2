/**
 * Performance monitoring middleware for Next.js
 * Tracks API performance, errors, and resource usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTracer, metricsCollector } from './telemetry';
import { SpanStatusCode, SpanKind, context, propagation } from '@opentelemetry/api';

export interface PerformanceContext {
  startTime: number;
  method: string;
  path: string;
  headers: Record<string, string>;
  userId?: string;
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  API_SLOW_REQUEST_MS: 1000,
  AI_SLOW_STREAM_MS: 5000,
  DB_SLOW_QUERY_MS: 100,
  MEMORY_HIGH_USAGE_MB: 512,
  CACHE_LOW_HIT_RATE: 0.7,
};

/**
 * Next.js middleware for performance monitoring
 * Wraps API routes with OpenTelemetry tracing and metrics collection
 */
export function performanceMiddleware(request: NextRequest) {
  const startTime = Date.now();
  const tracer = getTracer('http-middleware');

  // Extract trace context from headers
  const extractedContext = propagation.extract(
    context.active(),
    Object.fromEntries(request.headers.entries()),
  );

  return context.with(extractedContext, () => {
    const span = tracer.startSpan(
      `${request.method} ${request.nextUrl.pathname}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': request.method,
          'http.url': request.url,
          'http.target': request.nextUrl.pathname,
          'http.host': request.headers.get('host') || '',
          'http.scheme': request.nextUrl.protocol.replace(':', ''),
          'http.user_agent': request.headers.get('user-agent') || '',
          'client.address': request.headers.get('x-forwarded-for') ||
                           request.headers.get('x-real-ip') ||
                           'unknown',
        },
      }
    );

    // Add request body size if available
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      span.setAttribute('http.request.body.size', parseInt(contentLength));
    }

    // Handle the request and response
    const response = NextResponse.next();

    // Calculate duration
    const duration = Date.now() - startTime;

    // Set response attributes
    span.setAttributes({
      'http.status_code': response.status,
      'http.response.duration_ms': duration,
    });

    // Set span status based on HTTP status
    if (response.status >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${response.status}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    // Record metrics
    metricsCollector.recordApiRequest(
      request.method,
      request.nextUrl.pathname,
      response.status,
      duration
    );

    // Check for slow requests
    if (duration > PERFORMANCE_THRESHOLDS.API_SLOW_REQUEST_MS) {
      span.addEvent('slow_request_detected', {
        duration_ms: duration,
        threshold_ms: PERFORMANCE_THRESHOLDS.API_SLOW_REQUEST_MS,
      });
    }

    // Add performance headers
    response.headers.set('X-Response-Time', `${duration}ms`);
    response.headers.set('X-Trace-Id', span.spanContext().traceId);

    span.end();

    return response;
  });
}

/**
 * Async wrapper for API route handlers with performance tracking
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  options?: {
    spanName?: string;
    attributes?: Record<string, any>;
    recordErrors?: boolean;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const tracer = getTracer('api-handler');
    const spanName = options?.spanName || handler.name || 'api-handler';

    return tracer.startActiveSpan(
      spanName,
      {
        kind: SpanKind.INTERNAL,
        attributes: options?.attributes,
      },
      async (span) => {
        try {
          const result = await handler(...args);

          const duration = Date.now() - startTime;
          span.setAttribute('duration_ms', duration);

          // Check performance threshold
          if (duration > PERFORMANCE_THRESHOLDS.API_SLOW_REQUEST_MS) {
            span.addEvent('performance_warning', {
              duration_ms: duration,
              threshold_ms: PERFORMANCE_THRESHOLDS.API_SLOW_REQUEST_MS,
            });
          }

          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          span.setAttribute('duration_ms', duration);

          if (options?.recordErrors !== false) {
            span.recordException(error as Error);
            metricsCollector.recordError(
              (error as Error).name || 'UnknownError',
              spanName
            );
          }

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });

          throw error;
        } finally {
          span.end();
        }
      }
    );
  }) as T;
}

/**
 * Database query performance tracking
 */
export async function trackDatabaseQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const tracer = getTracer('database');

  return tracer.startActiveSpan(
    `db.${operation}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.table': table,
      },
    },
    async (span) => {
      try {
        const result = await queryFn();
        const duration = Date.now() - startTime;

        span.setAttribute('db.query.duration_ms', duration);
        metricsCollector.recordDbQuery(operation, table, duration);

        // Check for slow queries
        if (duration > PERFORMANCE_THRESHOLDS.DB_SLOW_QUERY_MS) {
          span.addEvent('slow_query_detected', {
            duration_ms: duration,
            threshold_ms: PERFORMANCE_THRESHOLDS.DB_SLOW_QUERY_MS,
          });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * AI streaming performance tracking
 */
export async function trackAiStreaming(
  model: string,
  streamFn: () => Promise<ReadableStream>
): Promise<{
  stream: ReadableStream;
  metrics: {
    firstTokenLatency: number;
    totalDuration: number;
    tokenCount: number;
  };
}> {
  const startTime = Date.now();
  const tracer = getTracer('ai-streaming');

  return tracer.startActiveSpan(
    'ai.stream',
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'ai.model': model,
        'ai.provider': 'anthropic',
      },
    },
    async (span) => {
      try {
        const originalStream = await streamFn();
        let firstTokenTime = 0;
        let tokenCount = 0;
        let totalDuration = 0;

        // Create a transform stream to track metrics
        const transformStream = new TransformStream({
          transform(chunk, controller) {
            if (firstTokenTime === 0) {
              firstTokenTime = Date.now() - startTime;
              span.addEvent('first_token_received', {
                latency_ms: firstTokenTime,
              });
            }
            tokenCount++;
            controller.enqueue(chunk);
          },
          flush() {
            totalDuration = Date.now() - startTime;
            span.setAttributes({
              'ai.first_token_latency_ms': firstTokenTime,
              'ai.total_duration_ms': totalDuration,
              'ai.token_count': tokenCount,
              'ai.tokens_per_second': tokenCount / (totalDuration / 1000),
            });

            metricsCollector.recordAiRequest(model, true, totalDuration);

            // Check for slow streaming
            if (totalDuration > PERFORMANCE_THRESHOLDS.AI_SLOW_STREAM_MS) {
              span.addEvent('slow_streaming_detected', {
                duration_ms: totalDuration,
                threshold_ms: PERFORMANCE_THRESHOLDS.AI_SLOW_STREAM_MS,
              });
            }
          },
        });

        const trackedStream = originalStream.pipeThrough(transformStream);

        span.setStatus({ code: SpanStatusCode.OK });

        return {
          stream: trackedStream,
          metrics: {
            firstTokenLatency: firstTokenTime,
            totalDuration,
            tokenCount,
          },
        };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        metricsCollector.recordAiRequest(model, false, Date.now() - startTime);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Cache performance tracking
 */
export async function trackCacheOperation<T>(
  cacheType: string,
  key: string,
  operation: 'get' | 'set' | 'delete',
  operationFn: () => Promise<T | null>
): Promise<T | null> {
  const tracer = getTracer('cache');

  return tracer.startActiveSpan(
    `cache.${operation}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'cache.type': cacheType,
        'cache.key': key,
        'cache.operation': operation,
      },
    },
    async (span) => {
      try {
        const result = await operationFn();
        const hit = operation === 'get' && result !== null;

        span.setAttribute('cache.hit', hit);
        metricsCollector.recordCacheOperation(hit, cacheType);

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Memory usage monitoring
 */
export function monitorMemoryUsage() {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

  if (heapUsedMB > PERFORMANCE_THRESHOLDS.MEMORY_HIGH_USAGE_MB) {
    console.warn(`[Performance] High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
    metricsCollector.recordError('high_memory_usage');
  }

  return {
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    rss: memUsage.rss,
    external: memUsage.external,
  };
}

// Export performance thresholds for external configuration
export { PERFORMANCE_THRESHOLDS };
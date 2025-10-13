/**
 * OpenTelemetry configuration for distributed tracing and metrics
 * Provides comprehensive observability for the vibing2 platform
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

const serviceName = 'vibing2-platform';
const serviceVersion = process.env.npm_package_version || '1.0.0';

// Create resource identifying the service
const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    environment: process.env.NODE_ENV || 'development',
    'deployment.environment': process.env.NODE_ENV || 'development',
  })
);

// Configure Prometheus exporter for metrics
const prometheusExporter = new PrometheusExporter(
  {
    port: parseInt(process.env.METRICS_PORT || '9464'),
    endpoint: '/metrics',
  },
  () => {
    console.log('[Telemetry] Prometheus metrics server started on port', process.env.METRICS_PORT || '9464');
  }
);

// Configure Jaeger exporter for traces (optional - for development)
const jaegerExporter = process.env.JAEGER_ENDPOINT
  ? new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    })
  : undefined;

// Initialize OpenTelemetry SDK
let otelSDK: NodeSDK | null = null;

export function initTelemetry() {
  if (otelSDK) {
    return; // Already initialized
  }

  try {
    otelSDK = new NodeSDK({
      resource,
      traceExporter: jaegerExporter,
      metricReader: prometheusExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation to reduce noise
          },
        }),
      ],
    });

    // Register additional instrumentations
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation({
          requestHook: (span, request) => {
            span.setAttribute('http.request.body.size', request.headers['content-length'] || 0);
          },
          responseHook: (span, response) => {
            span.setAttribute('http.response.body.size', response.headers['content-length'] || 0);
          },
        }),
        new ExpressInstrumentation(),
      ],
    });

    // Initialize the SDK
    otelSDK.start();

    console.log('[Telemetry] OpenTelemetry initialized successfully');
    console.log('[Telemetry] Service:', serviceName, 'Version:', serviceVersion);
    console.log('[Telemetry] Metrics endpoint: http://localhost:' + (process.env.METRICS_PORT || '9464') + '/metrics');
    if (jaegerExporter) {
      console.log('[Telemetry] Jaeger traces endpoint:', process.env.JAEGER_ENDPOINT);
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      otelSDK?.shutdown()
        .then(() => console.log('[Telemetry] SDK shut down successfully'))
        .catch((error) => console.error('[Telemetry] Error shutting down SDK', error))
        .finally(() => process.exit(0));
    });
  } catch (error) {
    console.error('[Telemetry] Failed to initialize OpenTelemetry:', error);
  }
}

// Get tracer instance
export function getTracer(name: string = 'default') {
  return trace.getTracer(name, serviceVersion);
}

// Get meter instance for custom metrics
export function getMeter(name: string = 'default') {
  return metrics.getMeter(name, serviceVersion);
}

// Helper to create a traced function
export function traced<T extends (...args: any[]) => any>(
  name: string,
  fn: T,
  options?: {
    attributes?: Record<string, any>;
    recordException?: boolean;
  }
): T {
  const tracer = getTracer();

  return ((...args: Parameters<T>) => {
    return tracer.startActiveSpan(name, (span) => {
      try {
        // Add custom attributes
        if (options?.attributes) {
          Object.entries(options.attributes).forEach(([key, value]) => {
            span.setAttribute(key, value);
          });
        }

        const result = fn(...args);

        // Handle async functions
        if (result instanceof Promise) {
          return result
            .then((value) => {
              span.setStatus({ code: SpanStatusCode.OK });
              return value;
            })
            .catch((error) => {
              if (options?.recordException !== false) {
                span.recordException(error);
              }
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });
              throw error;
            })
            .finally(() => {
              span.end();
            });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (error) {
        if (options?.recordException !== false) {
          span.recordException(error as Error);
        }
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.end();
        throw error;
      }
    });
  }) as T;
}

// Custom metric collectors
export class MetricsCollector {
  private meter = getMeter('vibing2-metrics');

  // Counters
  public apiRequestCounter = this.meter.createCounter('api_requests_total', {
    description: 'Total number of API requests',
  });

  public aiRequestCounter = this.meter.createCounter('ai_requests_total', {
    description: 'Total number of AI generation requests',
  });

  public errorCounter = this.meter.createCounter('errors_total', {
    description: 'Total number of errors',
  });

  public cacheHitCounter = this.meter.createCounter('cache_hits_total', {
    description: 'Total number of cache hits',
  });

  public cacheMissCounter = this.meter.createCounter('cache_misses_total', {
    description: 'Total number of cache misses',
  });

  // Histograms
  public apiLatencyHistogram = this.meter.createHistogram('api_latency_ms', {
    description: 'API request latency in milliseconds',
  });

  public aiStreamLatencyHistogram = this.meter.createHistogram('ai_stream_latency_ms', {
    description: 'AI streaming response latency in milliseconds',
  });

  public dbQueryDurationHistogram = this.meter.createHistogram('db_query_duration_ms', {
    description: 'Database query duration in milliseconds',
  });

  // Gauges (using Observable Gauge)
  public memoryUsageGauge = this.meter.createObservableGauge('memory_usage_bytes', {
    description: 'Current memory usage in bytes',
  });

  public activeConnectionsGauge = this.meter.createObservableGauge('active_connections', {
    description: 'Number of active connections',
  });

  constructor() {
    // Set up memory usage observer
    this.memoryUsageGauge.addCallback((result) => {
      const memUsage = process.memoryUsage();
      result.observe(memUsage.heapUsed, { type: 'heap_used' });
      result.observe(memUsage.heapTotal, { type: 'heap_total' });
      result.observe(memUsage.rss, { type: 'rss' });
      result.observe(memUsage.external, { type: 'external' });
    });
  }

  // Helper methods for recording metrics
  recordApiRequest(method: string, path: string, statusCode: number, duration: number) {
    this.apiRequestCounter.add(1, { method, path, status_code: statusCode });
    this.apiLatencyHistogram.record(duration, { method, path, status_code: statusCode });
  }

  recordAiRequest(model: string, success: boolean, duration: number) {
    this.aiRequestCounter.add(1, { model, success });
    if (success) {
      this.aiStreamLatencyHistogram.record(duration, { model });
    }
  }

  recordError(type: string, path?: string) {
    this.errorCounter.add(1, { error_type: type, path: path || 'unknown' });
  }

  recordCacheOperation(hit: boolean, cacheType: string) {
    if (hit) {
      this.cacheHitCounter.add(1, { cache_type: cacheType });
    } else {
      this.cacheMissCounter.add(1, { cache_type: cacheType });
    }
  }

  recordDbQuery(operation: string, table: string, duration: number) {
    this.dbQueryDurationHistogram.record(duration, { operation, table });
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
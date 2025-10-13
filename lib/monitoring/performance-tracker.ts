/**
 * Performance tracking utilities for various operations
 * Provides easy-to-use wrappers for common performance scenarios
 */

import { getTracer, metricsCollector } from './telemetry';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  getMark(name: string): number | undefined {
    const markTime = this.marks.get(name);
    return markTime ? markTime - this.startTime : undefined;
  }

  getDuration(): number {
    return performance.now() - this.startTime;
  }

  getMarks(): Record<string, number> {
    const result: Record<string, number> = {};
    this.marks.forEach((time, name) => {
      result[name] = time - this.startTime;
    });
    return result;
  }
}

/**
 * Track file operation performance
 */
export async function trackFileOperation<T>(
  operation: 'read' | 'write' | 'delete' | 'list',
  path: string,
  operationFn: () => Promise<T>
): Promise<T> {
  const tracer = getTracer('file-operations');
  const timer = new PerformanceTimer();

  return tracer.startActiveSpan(
    `file.${operation}`,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        'file.operation': operation,
        'file.path': path,
      },
    },
    async (span) => {
      try {
        const result = await operationFn();
        const duration = timer.getDuration();

        span.setAttributes({
          'file.duration_ms': duration,
          'file.success': true,
        });

        // Record file operation metrics
        metricsCollector.apiLatencyHistogram.record(duration, {
          operation: `file_${operation}`,
          path: path.split('/').slice(-2).join('/'), // Last 2 path segments for grouping
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setAttributes({
          'file.success': false,
          'file.error': (error as Error).message,
        });
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
 * Track WebSocket connection performance
 */
export class WebSocketPerformanceTracker {
  private tracer = getTracer('websocket');
  private messageCount = 0;
  private bytesSent = 0;
  private bytesReceived = 0;
  private connectionStart: number;

  constructor(private connectionId: string) {
    this.connectionStart = Date.now();
  }

  trackMessage(direction: 'sent' | 'received', size: number) {
    this.messageCount++;
    if (direction === 'sent') {
      this.bytesSent += size;
    } else {
      this.bytesReceived += size;
    }

    // Record message metrics
    metricsCollector.apiRequestCounter.add(1, {
      type: 'websocket_message',
      direction,
    });
  }

  trackError(error: Error) {
    metricsCollector.recordError('websocket_error', this.connectionId);
  }

  getMetrics() {
    const duration = Date.now() - this.connectionStart;
    return {
      connectionId: this.connectionId,
      duration,
      messageCount: this.messageCount,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      messagesPerSecond: this.messageCount / (duration / 1000),
      throughputKbps: ((this.bytesSent + this.bytesReceived) / 1024) / (duration / 1000),
    };
  }

  close() {
    const metrics = this.getMetrics();

    // Record final connection metrics
    metricsCollector.activeConnectionsGauge.addCallback((result) => {
      result.observe(-1, { type: 'websocket' }); // Decrement
    });

    return metrics;
  }
}

/**
 * Track batch operation performance
 */
export async function trackBatchOperation<T>(
  operationName: string,
  items: any[],
  batchSize: number,
  processFn: (batch: any[]) => Promise<T[]>
): Promise<T[]> {
  const tracer = getTracer('batch-operations');
  const timer = new PerformanceTimer();

  return tracer.startActiveSpan(
    `batch.${operationName}`,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        'batch.operation': operationName,
        'batch.total_items': items.length,
        'batch.size': batchSize,
        'batch.count': Math.ceil(items.length / batchSize),
      },
    },
    async (span) => {
      try {
        const results: T[] = [];
        const batches = [];

        // Create batches
        for (let i = 0; i < items.length; i += batchSize) {
          batches.push(items.slice(i, i + batchSize));
        }

        // Process batches
        for (let i = 0; i < batches.length; i++) {
          timer.mark(`batch_${i}`);
          const batchResults = await processFn(batches[i]);
          results.push(...batchResults);
        }

        const duration = timer.getDuration();
        const marks = timer.getMarks();

        span.setAttributes({
          'batch.duration_ms': duration,
          'batch.avg_batch_ms': duration / batches.length,
          'batch.items_per_second': (items.length / duration) * 1000,
        });

        // Add batch timing events
        Object.entries(marks).forEach(([name, time]) => {
          span.addEvent(name, { time_ms: time });
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return results;
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
 * Performance alert manager
 */
export class PerformanceAlertManager {
  private static alerts: Map<string, { count: number; lastAlert: number }> = new Map();
  private static readonly ALERT_COOLDOWN_MS = 60000; // 1 minute

  static checkThreshold(
    metric: string,
    value: number,
    threshold: number,
    unit: string = 'ms'
  ): boolean {
    if (value > threshold) {
      this.raiseAlert(metric, value, threshold, unit);
      return true;
    }
    return false;
  }

  private static raiseAlert(
    metric: string,
    value: number,
    threshold: number,
    unit: string
  ) {
    const alertKey = `${metric}_${threshold}`;
    const now = Date.now();
    const alertInfo = this.alerts.get(alertKey);

    // Check cooldown
    if (alertInfo && now - alertInfo.lastAlert < this.ALERT_COOLDOWN_MS) {
      return;
    }

    // Log alert
    console.error(`[PERFORMANCE ALERT] ${metric} exceeded threshold: ${value}${unit} > ${threshold}${unit}`);

    // Update alert info
    this.alerts.set(alertKey, {
      count: (alertInfo?.count || 0) + 1,
      lastAlert: now,
    });

    // Record in metrics
    metricsCollector.recordError('performance_threshold_exceeded', metric);
  }

  static getAlertStats() {
    const stats: Record<string, any> = {};
    this.alerts.forEach((info, key) => {
      stats[key] = {
        count: info.count,
        lastAlert: new Date(info.lastAlert).toISOString(),
      };
    });
    return stats;
  }
}

/**
 * Resource usage tracker
 */
export class ResourceUsageTracker {
  private samples: Array<{
    timestamp: number;
    cpu: number;
    memory: NodeJS.MemoryUsage;
  }> = [];
  private maxSamples = 100;
  private lastCpuUsage = process.cpuUsage();
  private lastSampleTime = Date.now();

  sample() {
    const now = Date.now();
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    const elapsedTime = now - this.lastSampleTime;

    // Calculate CPU percentage
    const cpuPercent = ((currentCpuUsage.user + currentCpuUsage.system) / 1000) / elapsedTime * 100;

    const sample = {
      timestamp: now,
      cpu: cpuPercent,
      memory: process.memoryUsage(),
    };

    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    this.lastCpuUsage = process.cpuUsage();
    this.lastSampleTime = now;

    // Check for high resource usage
    if (cpuPercent > 80) {
      PerformanceAlertManager.checkThreshold('cpu_usage', cpuPercent, 80, '%');
    }

    const memoryMB = sample.memory.heapUsed / 1024 / 1024;
    if (memoryMB > 512) {
      PerformanceAlertManager.checkThreshold('memory_usage', memoryMB, 512, 'MB');
    }

    return sample;
  }

  getAverageMetrics() {
    if (this.samples.length === 0) return null;

    const avgCpu = this.samples.reduce((sum, s) => sum + s.cpu, 0) / this.samples.length;
    const avgMemory = this.samples.reduce((sum, s) => sum + s.memory.heapUsed, 0) / this.samples.length;

    return {
      cpu: avgCpu,
      memory: avgMemory,
      samples: this.samples.length,
    };
  }

  getLatestMetrics() {
    return this.samples[this.samples.length - 1] || null;
  }
}

// Create global resource tracker
export const resourceTracker = new ResourceUsageTracker();

// Start periodic sampling
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    resourceTracker.sample();
  }, 10000); // Sample every 10 seconds
}
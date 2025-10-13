/**
 * Initialize performance monitoring and telemetry
 * This should be imported at application startup
 */

import { initTelemetry } from './telemetry';
import { alertManager } from './alerts';
import { resourceTracker } from './performance-tracker';

let initialized = false;

export function initializeMonitoring() {
  if (initialized) {
    console.log('[Monitoring] Already initialized');
    return;
  }

  console.log('[Monitoring] Initializing performance monitoring...');

  try {
    // Initialize OpenTelemetry
    initTelemetry();

    // Start alert monitoring
    alertManager.startMonitoring(30000); // Check every 30 seconds

    // Start resource tracking
    setInterval(() => {
      resourceTracker.sample();
    }, 10000); // Sample every 10 seconds

    // Log monitoring status
    setInterval(() => {
      const alerts = alertManager.getActiveAlerts();
      const stats = alertManager.getAlertStats();

      if (alerts.length > 0) {
        console.warn(`[Monitoring] Active alerts: ${alerts.length}`);
        alerts.forEach(alert => {
          console.warn(`  - ${alert.severity.toUpperCase()}: ${alert.metric} = ${alert.value}`);
        });
      }

      // Log resource usage
      const resources = resourceTracker.getLatestMetrics();
      if (resources) {
        const memMB = resources.memory.heapUsed / 1024 / 1024;
        console.info(`[Monitoring] Resources - CPU: ${resources.cpu.toFixed(1)}%, Memory: ${memMB.toFixed(0)}MB`);
      }
    }, 60000); // Log status every minute

    initialized = true;
    console.log('[Monitoring] Performance monitoring initialized successfully');

    // Return monitoring API
    return {
      telemetry: {
        initialized: true,
      },
      alerts: alertManager,
      resources: resourceTracker,
    };
  } catch (error) {
    console.error('[Monitoring] Failed to initialize:', error);
    return null;
  }
}

// Export for use in other modules
export { alertManager, resourceTracker };
export { getTracer, getMeter, metricsCollector } from './telemetry';
export {
  withPerformanceTracking,
  trackDatabaseQuery,
  trackAiStreaming,
  trackCacheOperation,
  trackFileOperation,
  trackBatchOperation,
  PerformanceTimer,
  WebSocketPerformanceTracker,
} from './performance-tracker';
export { performanceMiddleware } from './middleware';
export { initWebVitals, reportWebVitals } from './web-vitals';
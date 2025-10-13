/**
 * Performance alerting configuration and thresholds
 * Monitors critical metrics and triggers alerts
 */

import { metricsCollector } from './telemetry';

export interface AlertThreshold {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  unit: string;
  severity: 'warning' | 'error' | 'critical';
  cooldownMs: number;
  action?: (value: number) => void;
}

export interface Alert {
  id: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  resolved: boolean;
  resolvedAt?: number;
}

class AlertManager {
  private thresholds: Map<string, AlertThreshold> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private maxHistorySize = 1000;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupDefaultThresholds();
  }

  private setupDefaultThresholds() {
    // API Performance
    this.addThreshold({
      metric: 'api_response_time_p95',
      threshold: 1000,
      operator: 'gt',
      unit: 'ms',
      severity: 'warning',
      cooldownMs: 60000,
    });

    this.addThreshold({
      metric: 'api_response_time_p99',
      threshold: 2000,
      operator: 'gt',
      unit: 'ms',
      severity: 'error',
      cooldownMs: 60000,
    });

    // AI Streaming
    this.addThreshold({
      metric: 'ai_stream_latency_p95',
      threshold: 5000,
      operator: 'gt',
      unit: 'ms',
      severity: 'warning',
      cooldownMs: 120000,
    });

    this.addThreshold({
      metric: 'ai_stream_latency_p99',
      threshold: 10000,
      operator: 'gt',
      unit: 'ms',
      severity: 'error',
      cooldownMs: 120000,
    });

    // Database Performance
    this.addThreshold({
      metric: 'db_query_duration_p95',
      threshold: 100,
      operator: 'gt',
      unit: 'ms',
      severity: 'warning',
      cooldownMs: 60000,
    });

    this.addThreshold({
      metric: 'db_query_duration_p99',
      threshold: 500,
      operator: 'gt',
      unit: 'ms',
      severity: 'error',
      cooldownMs: 60000,
    });

    // Error Rates
    this.addThreshold({
      metric: 'error_rate',
      threshold: 0.05,
      operator: 'gt',
      unit: 'ratio',
      severity: 'warning',
      cooldownMs: 300000,
    });

    this.addThreshold({
      metric: 'error_rate',
      threshold: 0.1,
      operator: 'gt',
      unit: 'ratio',
      severity: 'critical',
      cooldownMs: 300000,
    });

    // Memory Usage
    this.addThreshold({
      metric: 'memory_usage_mb',
      threshold: 512,
      operator: 'gt',
      unit: 'MB',
      severity: 'warning',
      cooldownMs: 300000,
    });

    this.addThreshold({
      metric: 'memory_usage_mb',
      threshold: 768,
      operator: 'gt',
      unit: 'MB',
      severity: 'error',
      cooldownMs: 300000,
    });

    this.addThreshold({
      metric: 'memory_usage_mb',
      threshold: 1024,
      operator: 'gt',
      unit: 'MB',
      severity: 'critical',
      cooldownMs: 300000,
      action: (value) => {
        console.error(`[CRITICAL] Memory usage critical: ${value}MB - Consider restarting`);
        // Could trigger automatic garbage collection or restart
      },
    });

    // CPU Usage
    this.addThreshold({
      metric: 'cpu_usage_percent',
      threshold: 80,
      operator: 'gt',
      unit: '%',
      severity: 'warning',
      cooldownMs: 60000,
    });

    this.addThreshold({
      metric: 'cpu_usage_percent',
      threshold: 95,
      operator: 'gt',
      unit: '%',
      severity: 'critical',
      cooldownMs: 60000,
    });

    // Cache Performance
    this.addThreshold({
      metric: 'cache_hit_rate',
      threshold: 0.7,
      operator: 'lt',
      unit: 'ratio',
      severity: 'warning',
      cooldownMs: 600000,
    });

    // Connection Limits
    this.addThreshold({
      metric: 'active_connections',
      threshold: 900,
      operator: 'gt',
      unit: 'connections',
      severity: 'warning',
      cooldownMs: 60000,
    });

    this.addThreshold({
      metric: 'active_connections',
      threshold: 1000,
      operator: 'gt',
      unit: 'connections',
      severity: 'critical',
      cooldownMs: 60000,
    });

    // Web Vitals
    this.addThreshold({
      metric: 'web_vitals_lcp_p75',
      threshold: 2500,
      operator: 'gt',
      unit: 'ms',
      severity: 'warning',
      cooldownMs: 300000,
    });

    this.addThreshold({
      metric: 'web_vitals_fid_p75',
      threshold: 100,
      operator: 'gt',
      unit: 'ms',
      severity: 'warning',
      cooldownMs: 300000,
    });

    this.addThreshold({
      metric: 'web_vitals_cls_p75',
      threshold: 0.1,
      operator: 'gt',
      unit: 'score',
      severity: 'warning',
      cooldownMs: 300000,
    });
  }

  addThreshold(threshold: AlertThreshold) {
    const key = `${threshold.metric}_${threshold.severity}`;
    this.thresholds.set(key, threshold);
  }

  checkThreshold(metric: string, value: number): Alert | null {
    let triggeredAlert: Alert | null = null;

    // Check all thresholds for this metric
    for (const [key, threshold] of this.thresholds.entries()) {
      if (!key.startsWith(metric)) continue;

      // Check cooldown
      const lastAlert = this.lastAlertTime.get(key);
      if (lastAlert && Date.now() - lastAlert < threshold.cooldownMs) {
        continue;
      }

      // Check threshold condition
      let violated = false;
      switch (threshold.operator) {
        case 'gt':
          violated = value > threshold.threshold;
          break;
        case 'lt':
          violated = value < threshold.threshold;
          break;
        case 'gte':
          violated = value >= threshold.threshold;
          break;
        case 'lte':
          violated = value <= threshold.threshold;
          break;
        case 'eq':
          violated = value === threshold.threshold;
          break;
      }

      if (violated) {
        const alert: Alert = {
          id: `${metric}_${Date.now()}`,
          timestamp: Date.now(),
          metric,
          value,
          threshold: threshold.threshold,
          severity: threshold.severity,
          message: `${metric} ${threshold.operator} ${threshold.threshold}${threshold.unit}: ${value}${threshold.unit}`,
          resolved: false,
        };

        // Store alert
        this.activeAlerts.set(alert.id, alert);
        this.alertHistory.push(alert);
        this.lastAlertTime.set(key, Date.now());

        // Limit history size
        if (this.alertHistory.length > this.maxHistorySize) {
          this.alertHistory.shift();
        }

        // Execute action if defined
        if (threshold.action) {
          threshold.action(value);
        }

        // Log alert
        this.logAlert(alert);

        // Record in metrics
        metricsCollector.recordError(`alert_${threshold.severity}`, metric);

        // Return the most severe alert
        if (!triggeredAlert || this.getSeverityLevel(alert.severity) > this.getSeverityLevel(triggeredAlert.severity)) {
          triggeredAlert = alert;
        }
      }
    }

    return triggeredAlert;
  }

  private getSeverityLevel(severity: string): number {
    switch (severity) {
      case 'warning': return 1;
      case 'error': return 2;
      case 'critical': return 3;
      default: return 0;
    }
  }

  private logAlert(alert: Alert) {
    const prefix = alert.severity === 'critical' ? '[CRITICAL ALERT]' :
                  alert.severity === 'error' ? '[ERROR ALERT]' :
                  '[WARNING ALERT]';

    console.error(`${prefix} ${alert.message}`);

    // In production, this would also:
    // - Send to monitoring service (Datadog, New Relic, etc.)
    // - Send email/SMS/Slack notifications
    // - Create incident in PagerDuty
    // - Log to persistent storage
  }

  resolveAlert(alertId: string) {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.activeAlerts.delete(alertId);

      console.info(`[Alert Resolved] ${alert.metric}: ${alert.message}`);
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  getAlertStats() {
    const stats = {
      active: this.activeAlerts.size,
      total: this.alertHistory.length,
      bySeverity: {
        warning: 0,
        error: 0,
        critical: 0,
      },
      byMetric: {} as Record<string, number>,
    };

    for (const alert of this.alertHistory) {
      stats.bySeverity[alert.severity]++;
      stats.byMetric[alert.metric] = (stats.byMetric[alert.metric] || 0) + 1;
    }

    return stats;
  }

  startMonitoring(intervalMs: number = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.performChecks();
    }, intervalMs);

    console.log(`[Alert Manager] Monitoring started (interval: ${intervalMs}ms)`);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[Alert Manager] Monitoring stopped');
    }
  }

  private async performChecks() {
    // Check memory usage
    const memUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;
    this.checkThreshold('memory_usage_mb', memUsageMB);

    // Check CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100;
    this.checkThreshold('cpu_usage_percent', cpuPercent);

    // Additional checks would be performed here based on collected metrics
  }
}

// Export singleton instance
export const alertManager = new AlertManager();

// Auto-start monitoring if not in test environment
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  alertManager.startMonitoring();
}
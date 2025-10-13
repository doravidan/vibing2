/**
 * Core Web Vitals tracking for frontend performance
 * Monitors LCP, FID, CLS, and other critical metrics
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP, ReportHandler } from 'web-vitals';

export interface WebVitalsMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  inp?: number; // Interaction to Next Paint
}

export interface PerformanceReport {
  metrics: WebVitalsMetrics;
  page: string;
  timestamp: number;
  userAgent: string;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  memory?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
}

class WebVitalsTracker {
  private metrics: WebVitalsMetrics = {};
  private reportQueue: PerformanceReport[] = [];
  private reportInterval: number = 10000; // 10 seconds
  private maxQueueSize: number = 100;
  private reportTimer: NodeJS.Timeout | null = null;
  private thresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
    inp: { good: 200, poor: 500 },
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeTracking();
    }
  }

  private initializeTracking() {
    // Track Core Web Vitals
    onLCP(this.handleMetric('lcp'));
    onFID(this.handleMetric('fid'));
    onCLS(this.handleMetric('cls'));
    onFCP(this.handleMetric('fcp'));
    onTTFB(this.handleMetric('ttfb'));
    onINP(this.handleMetric('inp'));

    // Start reporting timer
    this.startReporting();

    // Track navigation timing
    this.trackNavigationTiming();

    // Track resource timing
    this.trackResourceTiming();

    // Listen for visibility changes to send reports
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendReports();
      }
    });
  }

  private handleMetric(metricName: keyof WebVitalsMetrics): ReportHandler {
    return (metric) => {
      this.metrics[metricName] = metric.value;

      // Check thresholds and log warnings
      const threshold = this.thresholds[metricName];
      if (threshold) {
        const rating = this.getRating(metric.value, threshold);
        if (rating === 'poor') {
          console.warn(`[Web Vitals] Poor ${metricName.toUpperCase()}: ${metric.value.toFixed(2)}`);
        } else if (rating === 'needs-improvement') {
          console.info(`[Web Vitals] ${metricName.toUpperCase()} needs improvement: ${metric.value.toFixed(2)}`);
        }
      }

      // Add to report queue
      this.queueReport();
    };
  }

  private getRating(value: number, threshold: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private queueReport() {
    const report: PerformanceReport = {
      metrics: { ...this.metrics },
      page: window.location.pathname,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };

    // Add connection info if available
    const nav = navigator as any;
    if (nav.connection) {
      report.connection = {
        effectiveType: nav.connection.effectiveType,
        downlink: nav.connection.downlink,
        rtt: nav.connection.rtt,
      };
    }

    // Add memory info if available
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      report.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }

    this.reportQueue.push(report);

    // Limit queue size
    if (this.reportQueue.length > this.maxQueueSize) {
      this.reportQueue.shift();
    }
  }

  private startReporting() {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }

    this.reportTimer = setInterval(() => {
      this.sendReports();
    }, this.reportInterval);
  }

  private async sendReports() {
    if (this.reportQueue.length === 0) return;

    const reports = [...this.reportQueue];
    this.reportQueue = [];

    try {
      await fetch('/api/metrics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reports }),
      });
    } catch (error) {
      console.error('[Web Vitals] Failed to send reports:', error);
      // Re-queue failed reports
      this.reportQueue.unshift(...reports.slice(0, 10)); // Keep max 10 failed reports
    }
  }

  private trackNavigationTiming() {
    if (!performance || !performance.getEntriesByType) return;

    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0];

      // Calculate additional metrics
      const metrics = {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        domComplete: nav.domComplete - nav.domInteractive,
        loadComplete: nav.loadEventEnd - nav.loadEventStart,
        domInteractive: nav.domInteractive - nav.fetchStart,
        dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
        tcpConnect: nav.connectEnd - nav.connectStart,
        request: nav.responseStart - nav.requestStart,
        response: nav.responseEnd - nav.responseStart,
        domParse: nav.domInteractive - nav.responseEnd,
      };

      console.info('[Web Vitals] Navigation Timing:', metrics);
    }
  }

  private trackResourceTiming() {
    if (!performance || !performance.getEntriesByType) return;

    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    // Group resources by type
    const resourcesByType: Record<string, { count: number; totalDuration: number; totalSize: number }> = {};

    resourceEntries.forEach((entry) => {
      const type = this.getResourceType(entry.name);
      if (!resourcesByType[type]) {
        resourcesByType[type] = { count: 0, totalDuration: 0, totalSize: 0 };
      }

      resourcesByType[type].count++;
      resourcesByType[type].totalDuration += entry.duration;

      // Get transfer size if available
      if ('transferSize' in entry) {
        resourcesByType[type].totalSize += (entry as any).transferSize;
      }
    });

    // Log resource statistics
    Object.entries(resourcesByType).forEach(([type, stats]) => {
      if (stats.count > 0) {
        console.info(`[Web Vitals] ${type} resources:`, {
          count: stats.count,
          avgDuration: Math.round(stats.totalDuration / stats.count),
          totalSize: Math.round(stats.totalSize / 1024), // KB
        });
      }
    });
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'JavaScript';
    if (url.includes('.css')) return 'CSS';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)/)) return 'Image';
    if (url.match(/\.(woff|woff2|ttf|otf|eot)/)) return 'Font';
    if (url.includes('/api/')) return 'API';
    return 'Other';
  }

  // Public methods
  getMetrics(): WebVitalsMetrics {
    return { ...this.metrics };
  }

  getThresholds() {
    return this.thresholds;
  }

  reset() {
    this.metrics = {};
    this.reportQueue = [];
  }
}

// Create singleton instance
let tracker: WebVitalsTracker | null = null;

export function initWebVitals(): WebVitalsTracker {
  if (!tracker && typeof window !== 'undefined') {
    tracker = new WebVitalsTracker();
  }
  return tracker!;
}

export function getWebVitalsTracker(): WebVitalsTracker | null {
  return tracker;
}

/**
 * React hook for using Web Vitals
 */
export function useWebVitals() {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({});

  useEffect(() => {
    const tracker = initWebVitals();
    if (tracker) {
      // Update metrics periodically
      const interval = setInterval(() => {
        setMetrics(tracker.getMetrics());
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  return metrics;
}

// For Next.js integration
export function reportWebVitals({ id, name, label, value }: {
  id: string;
  name: string;
  label: string;
  value: number;
}) {
  // Send to analytics or monitoring service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      event_category: label === 'web-vital' ? 'Web Vitals' : 'Performance',
      event_label: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value), // CLS is decimal
      non_interaction: true,
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}:`, value);
  }
}

// Import React hooks if available
declare const useState: any;
declare const useEffect: any;
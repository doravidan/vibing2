import pino from 'pino';

/**
 * Structured logging with Pino
 *
 * Usage:
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User signed in', { userId: '123' });
 * logger.error('Database error', { error, query });
 * logger.debug('Cache hit', { key, value });
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Simplified logger without pino-pretty transport to avoid worker issues in Next.js
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Structured JSON format
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },

  // Add base fields to all logs
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },
});

/**
 * Log HTTP request
 */
export function logRequest(
  method: string,
  url: string,
  status: number,
  duration: number,
  userId?: string
) {
  const logData = {
    type: 'http_request',
    method,
    url,
    status,
    duration,
    ...(userId && { userId }),
  };

  if (status >= 500) {
    logger.error(logData, 'HTTP request failed');
  } else if (status >= 400) {
    logger.warn(logData, 'HTTP request error');
  } else {
    logger.info(logData, 'HTTP request');
  }
}

/**
 * Log error with context
 */
export function logError(
  error: Error | unknown,
  context: Record<string, any> = {}
) {
  const errorData = {
    type: 'error',
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    ...context,
  };

  logger.error(errorData, 'Error occurred');

  // TODO: Send to error tracking service (Sentry, etc.)
  // Sentry.captureException(error, { extra: context });
}

/**
 * Log AI generation event
 */
export function logAIGeneration(data: {
  userId: string;
  projectType: string;
  tokensUsed: number;
  duration: number;
  success: boolean;
  error?: string;
}) {
  logger.info('AI generation completed', {
    type: 'ai_generation',
    ...data,
  });
}

/**
 * Log authentication event
 */
export function logAuth(data: {
  event: 'signin' | 'signup' | 'signout' | 'failed';
  userId?: string;
  email?: string;
  provider?: string;
  ip?: string;
  error?: string;
}) {
  const logFn = data.event === 'failed' ? logger.warn : logger.info;

  logFn(`Authentication: ${data.event}`, {
    type: 'auth',
    ...data,
  });
}

/**
 * Log database query performance
 */
export function logQuery(
  operation: string,
  model: string,
  duration: number,
  recordCount?: number
) {
  const logData = {
    type: 'database_query',
    operation,
    model,
    duration,
    ...(recordCount !== undefined && { recordCount }),
  };

  if (duration > 1000) {
    logger.warn(logData, 'Slow database query');
  } else {
    logger.debug(logData, 'Database query');
  }
}

/**
 * Log sandbox operation
 */
export function logSandbox(data: {
  operation: 'create' | 'delete' | 'write' | 'execute';
  sandboxId: string;
  provider: 'daytona' | 'webcontainer' | 'local';
  duration?: number;
  success: boolean;
  error?: string;
}) {
  logger.info(`Sandbox ${data.operation}`, {
    type: 'sandbox',
    ...data,
  });
}

/**
 * Log performance metric
 */
export function logMetric(
  metric: string,
  value: number,
  unit: 'ms' | 'bytes' | 'count' = 'ms',
  metadata?: Record<string, any>
) {
  logger.info(`Metric: ${metric}`, {
    type: 'metric',
    metric,
    value,
    unit,
    ...metadata,
  });
}

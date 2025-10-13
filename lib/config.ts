import { z } from 'zod';

/**
 * Environment Configuration Service
 *
 * Validates all environment variables at startup
 * Provides type-safe access to configuration
 * Fails fast if required variables are missing
 */

const ConfigSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Anthropic AI
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),

  // Upstash Redis (optional for development)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Sentry (optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional features
  DISABLE_AUTH: z.string().optional().transform(val => val === 'true'),

  // GitHub (future)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Daytona Sandbox (future)
  DAYTONA_API_KEY: z.string().optional(),
  DAYTONA_WORKSPACE_URL: z.string().url().optional(),
});

// Parse and validate environment variables
function validateConfig() {
  try {
    return ConfigSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment configuration:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n💡 Check your .env.local file and ensure all required variables are set.\n');
      process.exit(1);
    }
    throw error;
  }
}

// Export validated configuration
export const config = validateConfig();

// Helper functions for feature flags
export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';

export const hasRedis = !!(config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN);
export const hasSentry = !!config.SENTRY_DSN;
export const hasGitHub = !!(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET);
export const hasDaytona = !!config.DAYTONA_API_KEY;

// Log configuration status (only in development)
if (isDevelopment) {
  console.log('🔧 Configuration loaded:');
  console.log(`  - Environment: ${config.NODE_ENV}`);
  console.log(`  - Database: ${config.DATABASE_URL.split('@')[1] || 'configured'}`);
  console.log(`  - Anthropic API: ${config.ANTHROPIC_API_KEY.slice(0, 10)}...`);
  console.log(`  - Redis: ${hasRedis ? '✅' : '❌'}`);
  console.log(`  - Sentry: ${hasSentry ? '✅' : '❌'}`);
  console.log(`  - GitHub: ${hasGitHub ? '✅' : '❌'}`);
  console.log(`  - Daytona: ${hasDaytona ? '✅' : '❌'}`);
  if (config.DISABLE_AUTH) {
    console.log(`  - ⚠️  Auth disabled for testing`);
  }
  console.log('');
}

// Export type for use in other files
export type Config = z.infer<typeof ConfigSchema>;

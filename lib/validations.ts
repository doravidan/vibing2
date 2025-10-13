import { z } from 'zod';

/**
 * Validation schemas using Zod
 * Provides type-safe input validation for API routes
 */

// Auth schemas
export const SignUpSchema = z.object({
  name: z.string().max(100, 'Name too long').trim().optional(),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password too long'),
});

export const SignInSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  description: z.string().max(500, 'Description too long').optional(),
  projectType: z.enum([
    'WEB_APP',
    'MOBILE_APP',
    'GAME',
    'LANDING_PAGE',
    'CHROME_EXTENSION',
    'NPM_PACKAGE',
  ]),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).default('PRIVATE'),
  activeAgents: z.array(z.string()).default([]),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  id: z.string().cuid(),
});

export const SaveProjectSchema = z.object({
  projectId: z.string().nullable(),
  name: z.string().min(1).max(100).trim(),
  projectType: z.string(),
  activeAgents: z.string(), // JSON string
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  currentCode: z.string().optional(),
  description: z.string().optional(),
});

// File schemas
export const FileSchema = z.object({
  path: z
    .string()
    .min(1, 'Path is required')
    .max(255, 'Path too long')
    .regex(/^[a-zA-Z0-9_\-./]+$/, 'Invalid file path'),
  content: z.string().max(50 * 1024, 'File too large (max 50KB)'), // 50KB limit (production standard)
  language: z.enum([
    'html',
    'css',
    'javascript',
    'typescript',
    'json',
    'markdown',
    'plaintext',
  ]),
});

// Project file size constants
export const FILE_SIZE_LIMITS = {
  FREE_TIER: 50 * 1024,      // 50KB per file
  PRO_TIER: 100 * 1024,      // 100KB per file
  ENTERPRISE: 500 * 1024,    // 500KB per file
} as const;

export const FileOperationSchema = z.object({
  type: z.enum(['create', 'update', 'delete']),
  path: z.string().min(1).max(255),
  content: z.string().max(50 * 1024, 'File content too large (max 50KB)').optional(),
  language: z.string().optional(),
  search: z.string().optional(),
  replace: z.string().optional(),
});

// AI Generation schemas
export const AIGenerationSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1, 'Message content required').max(500000), // Increased to 500KB to support base64 images
    })
  ).min(1, 'At least one message is required').max(50, 'Too many messages'),
  projectType: z.string().min(1, 'Project type required').max(50),
  agents: z.array(z.string()).default([]),
  specializedAgent: z.string().optional(),
});

// Collaboration schemas
export const InviteSchema = z.object({
  projectId: z.string().cuid(),
  email: z.string().email('Invalid email address'),
  role: z.enum(['VIEWER', 'EDITOR', 'ADMIN']).default('VIEWER'),
});

export const CollaborationResponseSchema = z.object({
  inviteId: z.string().cuid(),
  action: z.enum(['accept', 'reject']),
});

// Validation helper functions
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message || 'Validation failed',
      };
    }
    return { success: false, error: 'Invalid input' };
  }
}

export function createValidationError(message: string) {
  return new Response(
    JSON.stringify({
      error: 'Validation Error',
      message,
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

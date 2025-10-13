import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createInstantDBUser } from '@/lib/instantdb';
import { checkRateLimit, authRateLimiter } from '@/lib/rate-limit';
import { SignUpSchema, validateRequest, createValidationError } from '@/lib/validations';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  try {
    // Apply rate limiting (5 signups per 15 minutes per IP)
    const rateLimitResult = await checkRateLimit(req, authRateLimiter);
    if (!rateLimitResult.success) {
      logger.warn(`Rate limit exceeded for signup from IP: ${ip}`);
      return rateLimitResult.response!;
    }

    const body = await req.json();

    // Validate input with Zod
    const validation = validateRequest(SignUpSchema, body);
    if (!validation.success) {
      logger.warn(`Signup validation failed from IP: ${ip}`, {
        errors: validation.error,
      });
      return createValidationError(validation.error);
    }

    const { email, password, name } = validation.data;

    // Check if user already exists in InstantDB
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      logger.warn(`Signup attempt with existing email: ${email}`);
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in InstantDB
    const userId = await createInstantDBUser({
      email,
      password: hashedPassword,
      name,
    });

    // Log successful signup
    logger.info(`New user created via InstantDB`, {
      userId,
      email,
      ip,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name: name || null,
      },
    });
  } catch (error: any) {
    // Log error
    logger.error(`Signup error: ${error.message}`, {
      endpoint: '/api/auth/signup',
      ip,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

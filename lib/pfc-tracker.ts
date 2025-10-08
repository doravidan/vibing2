/**
 * PFC Token Tracker Service
 * Real-time token usage and context monitoring with PFC efficiency tracking
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Context window size for Claude Sonnet 4
const MAX_CONTEXT_TOKENS = 200000;

export interface PFCMetrics {
  tokensUsed: number;
  contextPercentage: number;
  pfcSaved: number;
  traditionalCost: number;
  actualCost: number;
}

export interface TokenTrackingParams {
  userId: string;
  tokensUsed: number;
  endpoint: string;
  savedTokens?: number;
}

/**
 * Calculate context percentage from token usage
 */
export function calculateContextPercentage(tokensUsed: number): number {
  return Math.round((tokensUsed / MAX_CONTEXT_TOKENS) * 100 * 100) / 100;
}

/**
 * Estimate traditional (non-PFC) token usage
 * PFC typically saves 80-97% of tokens
 */
export function estimateTraditionalTokens(pfcTokens: number): number {
  // Conservative estimate: PFC saves 80%
  // So PFC tokens = 20% of traditional tokens
  return Math.round(pfcTokens / 0.2);
}

/**
 * Calculate PFC savings
 */
export function calculatePFCSavings(pfcTokens: number): number {
  const traditional = estimateTraditionalTokens(pfcTokens);
  return traditional - pfcTokens;
}

/**
 * Track token usage and update user balance
 */
export async function trackTokenUsage({
  userId,
  tokensUsed,
  endpoint,
  savedTokens = 0
}: TokenTrackingParams): Promise<PFCMetrics> {

  const contextPercentage = calculateContextPercentage(tokensUsed);
  const pfcSaved = savedTokens > 0 ? savedTokens : calculatePFCSavings(tokensUsed);
  const traditionalCost = estimateTraditionalTokens(tokensUsed);

  // Record usage in TokenUsage table
  await prisma.tokenUsage.create({
    data: {
      userId,
      tokensUsed,
      contextUsed: contextPercentage,
      savedTokens: pfcSaved,
      endpoint,
    },
  });

  // Update user's token balance and context usage
  await prisma.user.update({
    where: { id: userId },
    data: {
      tokenBalance: {
        decrement: tokensUsed,
      },
      contextUsed: contextPercentage,
    },
  });

  return {
    tokensUsed,
    contextPercentage,
    pfcSaved,
    traditionalCost,
    actualCost: tokensUsed,
  };
}

/**
 * Get user's current token balance and usage stats
 */
export async function getUserTokenStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tokenBalance: true,
      contextUsed: true,
      plan: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get total usage this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyUsage = await prisma.tokenUsage.aggregate({
    where: {
      userId,
      timestamp: {
        gte: startOfMonth,
      },
    },
    _sum: {
      tokensUsed: true,
      savedTokens: true,
    },
  });

  return {
    tokenBalance: user.tokenBalance,
    contextUsed: user.contextUsed,
    plan: user.plan,
    monthlyTokensUsed: monthlyUsage._sum.tokensUsed || 0,
    monthlyTokensSaved: monthlyUsage._sum.savedTokens || 0,
  };
}

/**
 * Check if user has sufficient tokens
 */
export async function hasTokens(userId: string, requiredTokens: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  });

  return user ? user.tokenBalance >= requiredTokens : false;
}

/**
 * Get token limits by plan
 */
export function getTokenLimitByPlan(plan: string): number {
  const limits = {
    FREE: 10000,
    PRO: 100000,
    BUSINESS: 500000,
    ENTERPRISE: 2000000,
  };

  return limits[plan as keyof typeof limits] || 0;
}

/**
 * Refill user's tokens based on their plan
 */
export async function refillTokens(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const newBalance = getTokenLimitByPlan(user.plan);

  await prisma.user.update({
    where: { id: userId },
    data: {
      tokenBalance: newBalance,
      contextUsed: 0,
    },
  });

  return newBalance;
}

import { NextRequest, NextResponse } from 'next/server';
import { autoSelectAgents, explainAgentSelection } from '@/lib/agents/auto-selector';
import { z } from 'zod';

const AutoSelectSchema = z.object({
  prompt: z.string().min(1),
  projectType: z.string(),
  existingFiles: z.array(z.string()).optional(),
  currentCode: z.string().optional(),
  conversationHistory: z.array(z.object({
    role: z.string(),
    content: z.string()
  })).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = AutoSelectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { prompt, projectType, existingFiles, currentCode, conversationHistory } = validation.data;

    // Perform automatic agent selection
    const result = await autoSelectAgents(prompt, {
      projectType,
      existingFiles,
      currentCode,
      conversationHistory,
    });

    // Log selection for debugging
    console.log('🤖 Automatic agent selection:', {
      prompt: prompt.substring(0, 100),
      selectedAgents: result.agents,
      confidence: result.confidence,
      reasoning: result.reasoning
    });

    return NextResponse.json({
      success: true,
      agents: result.agents,
      primaryAgent: result.primaryAgent,
      confidence: result.confidence,
      reasoning: result.reasoning,
      explanation: explainAgentSelection(result),
    });

  } catch (error: any) {
    console.error('Auto-select error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-select agents', details: error.message },
      { status: 500 }
    );
  }
}

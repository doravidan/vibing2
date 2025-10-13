/**
 * API Route: List Available Agents
 * Returns all agents grouped by category
 */

import { NextResponse } from 'next/server';
import { getAgentRegistry } from '@/lib/agents/agent-registry';

export const runtime = 'nodejs'; // Need Node.js runtime for file system access

export async function GET() {
  try {
    const registry = await getAgentRegistry();
    const stats = registry.getStats();
    const allAgents = registry.getAllAgents();

    // Group agents by category
    const agentsByCategory: Record<string, any[]> = {};

    for (const agent of allAgents) {
      const category = agent.metadata.category || 'agents';
      if (!agentsByCategory[category]) {
        agentsByCategory[category] = [];
      }

      agentsByCategory[category].push({
        name: agent.metadata.name,
        description: agent.metadata.description,
        model: agent.metadata.model,
        type: agent.metadata.type,
        tools: agent.metadata.tools,
      });
    }

    return NextResponse.json({
      success: true,
      stats,
      agents: agentsByCategory,
    });
  } catch (error) {
    console.error('Failed to load agents:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load agents',
      },
      { status: 500 }
    );
  }
}

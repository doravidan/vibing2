/**
 * Workflow List API
 *
 * Returns list of available workflow templates
 */

import { NextRequest } from 'next/server';
import { getAllWorkflows, getWorkflowsByCategory, searchWorkflows } from '@/lib/agents/workflows';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);

    let workflows;

    if (category) {
      workflows = getWorkflowsByCategory(category as any);
    } else if (tags && tags.length > 0) {
      workflows = searchWorkflows(tags);
    } else {
      workflows = getAllWorkflows();
    }

    // Return workflow metadata without the buildTasks function
    const workflowList = workflows.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      category: w.category,
      tags: w.tags,
      estimatedDuration: w.estimatedDuration,
      complexity: w.complexity,
    }));

    return new Response(
      JSON.stringify({ workflows: workflowList }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Workflow list error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch workflows' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

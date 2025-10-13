/**
 * Workflow Execution API
 *
 * Executes pre-defined or custom multi-agent workflows
 * with real-time progress tracking and streaming updates
 */

import { NextRequest } from 'next/server';
import { AgentOrchestrator, AgentTask } from '@/lib/agents/orchestrator';
import { getWorkflow } from '@/lib/agents/workflows';
import { auth } from '@/auth';
import { aiRateLimiter, checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

interface WorkflowExecutionRequest {
  workflowId?: string; // Pre-defined workflow ID
  workflowName?: string; // Custom workflow name
  tasks?: AgentTask[]; // Custom tasks (if not using pre-defined workflow)
  parameters?: Record<string, any>; // Workflow parameters
  config?: {
    maxParallelAgents?: number;
    contextStrategy?: 'shared' | 'isolated' | 'hierarchical';
    enableCommunication?: boolean;
  };
}

export async function POST(req: NextRequest) {
  try {
    // Get session for authentication and rate limiting
    const session = await auth();

    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Apply rate limiting
    const rateLimitResult = await checkRateLimit(req, aiRateLimiter, session.user.id);
    if (!rateLimitResult.success) {
      return rateLimitResult.response!;
    }

    // Parse request body
    const body: WorkflowExecutionRequest = await req.json();
    const { workflowId, workflowName, tasks, parameters = {}, config = {} } = body;

    // Validate request
    if (!workflowId && !tasks) {
      return new Response(
        JSON.stringify({ error: 'Either workflowId or tasks must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build task list
    let taskList: AgentTask[];

    if (workflowId) {
      // Load pre-defined workflow
      const workflow = getWorkflow(workflowId);
      if (!workflow) {
        return new Response(
          JSON.stringify({ error: `Workflow "${workflowId}" not found` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      taskList = workflow.buildTasks(parameters);
    } else {
      // Use custom tasks
      taskList = tasks!;
    }

    // Create orchestrator
    const orchestrator = new AgentOrchestrator({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxParallelAgents: config.maxParallelAgents || 3,
      contextStrategy: config.contextStrategy || 'shared',
      enableCommunication: config.enableCommunication ?? true,
    });

    // Add tasks to orchestrator
    orchestrator.addTasks(taskList);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'workflow:start',
                workflowId: workflowId || 'custom',
                workflowName: workflowName || 'Custom Workflow',
                taskCount: taskList.length,
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );

          // Subscribe to orchestrator events
          orchestrator.on('task:added', (task) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'task:added',
                  task: {
                    id: task.id,
                    agentName: task.agentName,
                    description: task.description,
                  },
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
          });

          orchestrator.on('task:start', (task) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'task:start',
                  taskId: task.id,
                  agentName: task.agentName,
                  description: task.description,
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
          });

          orchestrator.on('agent:invoke', (data) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'agent:invoke',
                  taskId: data.taskId,
                  agentName: data.agentName,
                  model: data.model,
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
          });

          orchestrator.on('task:complete', (result) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'task:complete',
                  taskId: result.taskId,
                  agentName: result.agentName,
                  success: result.success,
                  tokensUsed: result.tokensUsed,
                  duration: result.duration,
                  // Include truncated output for streaming
                  outputPreview: result.output.substring(0, 500),
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
          });

          orchestrator.on('task:error', ({ task, error }) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'task:error',
                  taskId: task.id,
                  agentName: task.agentName,
                  error: error.message,
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
          });

          orchestrator.on('wave:start', ({ taskIds }) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'wave:start',
                  taskIds,
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
          });

          orchestrator.on('wave:complete', ({ taskIds }) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'wave:complete',
                  taskIds,
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
          });

          // Execute workflow
          const results = await orchestrator.execute();

          // Calculate summary metrics
          const successfulTasks = Array.from(results.values()).filter(r => r.success);
          const totalTokens = Array.from(results.values()).reduce((sum, r) => sum + r.tokensUsed, 0);
          const totalDuration = Array.from(results.values()).reduce((sum, r) => sum + r.duration, 0);

          // Send completion event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'workflow:complete',
                summary: {
                  totalTasks: results.size,
                  successfulTasks: successfulTasks.length,
                  failedTasks: results.size - successfulTasks.length,
                  totalTokens,
                  totalDuration,
                  avgDuration: totalDuration / results.size,
                },
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );

          // Send full results
          const fullResults = Array.from(results.values()).map(r => ({
            taskId: r.taskId,
            agentName: r.agentName,
            success: r.success,
            output: r.output,
            tokensUsed: r.tokensUsed,
            duration: r.duration,
            error: r.error,
            metadata: r.metadata,
          }));

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'workflow:results',
                results: fullResults,
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );

          controller.close();
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'workflow:error',
                error: error.message,
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Workflow execution error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to execute workflow' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Workflow Helper Utilities
 *
 * Convenient utilities for working with workflows and orchestrators
 */

import { AgentOrchestrator, AgentTask, AgentResult } from './orchestrator';
import { WorkflowTemplate } from './workflows';

/**
 * Execute a workflow and return results
 */
export async function executeWorkflow(
  workflow: WorkflowTemplate,
  parameters: Record<string, any>,
  config?: {
    apiKey: string;
    maxParallelAgents?: number;
    onProgress?: (event: any) => void;
  }
): Promise<Map<string, AgentResult>> {
  if (!config?.apiKey) {
    throw new Error('API key is required');
  }

  const orchestrator = new AgentOrchestrator({
    apiKey: config.apiKey,
    maxParallelAgents: config.maxParallelAgents || 3,
    contextStrategy: 'shared',
    enableCommunication: true,
  });

  // Subscribe to progress events if callback provided
  if (config.onProgress) {
    orchestrator.on('task:start', (task) => {
      config.onProgress!({ type: 'task:start', task });
    });

    orchestrator.on('task:complete', (result) => {
      config.onProgress!({ type: 'task:complete', result });
    });

    orchestrator.on('task:error', ({ task, error }) => {
      config.onProgress!({ type: 'task:error', task, error });
    });
  }

  // Build and add tasks
  const tasks = workflow.buildTasks(parameters);
  orchestrator.addTasks(tasks);

  // Execute and return results
  return await orchestrator.execute();
}

/**
 * Validate workflow parameters
 */
export function validateWorkflowParameters(
  workflow: WorkflowTemplate,
  parameters: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Workflow-specific validation
  switch (workflow.id) {
    case 'fullstack-dev':
      if (!parameters.projectType) {
        errors.push('projectType is required');
      }
      if (!parameters.features || !Array.isArray(parameters.features)) {
        errors.push('features array is required');
      }
      break;

    case 'security-audit':
      if (!parameters.codebasePath) {
        errors.push('codebasePath is required');
      }
      break;

    case 'testing-suite':
      if (!parameters.testScope) {
        errors.push('testScope is required');
      }
      if (!parameters.framework) {
        errors.push('framework is required');
      }
      break;

    case 'performance-optimization':
      if (!parameters.targetMetrics) {
        errors.push('targetMetrics is required');
      }
      break;

    case 'code-review':
      if (!parameters.prUrl && !parameters.changedFiles) {
        errors.push('prUrl or changedFiles is required');
      }
      break;

    case 'devops-setup':
      if (!parameters.platform) {
        errors.push('platform is required');
      }
      if (!parameters.cicd) {
        errors.push('cicd is required');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format workflow results as markdown report
 */
export function formatWorkflowReport(
  workflow: WorkflowTemplate,
  results: Map<string, AgentResult>
): string {
  const successful = Array.from(results.values()).filter(r => r.success);
  const failed = Array.from(results.values()).filter(r => !r.success);
  const totalTokens = Array.from(results.values()).reduce((sum, r) => sum + r.tokensUsed, 0);
  const totalDuration = Array.from(results.values()).reduce((sum, r) => sum + r.duration, 0);

  const lines: string[] = [];

  lines.push(`# ${workflow.name} - Execution Report`);
  lines.push('');
  lines.push(`**Date:** ${new Date().toISOString()}`);
  lines.push(`**Workflow ID:** ${workflow.id}`);
  lines.push(`**Category:** ${workflow.category}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Tasks:** ${results.size}`);
  lines.push(`- **Successful:** ${successful.length}`);
  lines.push(`- **Failed:** ${failed.length}`);
  lines.push(`- **Total Tokens:** ${totalTokens.toLocaleString()}`);
  lines.push(`- **Total Duration:** ${(totalDuration / 1000).toFixed(2)}s`);
  lines.push(`- **Average Duration:** ${(totalDuration / results.size / 1000).toFixed(2)}s per task`);
  lines.push('');

  // Task Results
  lines.push('## Task Results');
  lines.push('');

  for (const result of results.values()) {
    const status = result.success ? '✅' : '❌';
    lines.push(`### ${status} ${result.agentName} - ${result.taskId}`);
    lines.push('');
    lines.push(`**Duration:** ${(result.duration / 1000).toFixed(2)}s`);
    lines.push(`**Tokens Used:** ${result.tokensUsed.toLocaleString()}`);

    if (result.error) {
      lines.push(`**Error:** ${result.error}`);
    } else {
      lines.push('');
      lines.push('**Output:**');
      lines.push('```');
      lines.push(result.output.length > 1000
        ? result.output.substring(0, 1000) + '...'
        : result.output);
      lines.push('```');
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Estimate workflow duration based on task complexity
 */
export function estimateWorkflowDuration(tasks: AgentTask[]): number {
  // Base estimates per agent tier (in seconds)
  const modelDurations: Record<string, number> = {
    'haiku': 10,
    'sonnet': 20,
    'opus': 40,
  };

  // Calculate sequential duration
  let sequentialDuration = 0;
  for (const task of tasks) {
    const model = task.model || 'sonnet';
    const baseDuration = modelDurations[model.includes('haiku') ? 'haiku' : model.includes('opus') ? 'opus' : 'sonnet'];
    const tokenMultiplier = (task.maxTokens || 16000) / 16000;
    sequentialDuration += baseDuration * tokenMultiplier;
  }

  // Account for parallelization (assumes 3 concurrent)
  const parallelizationFactor = 0.4; // 40% of sequential time with parallelization
  return Math.ceil(sequentialDuration * parallelizationFactor);
}

/**
 * Build custom task with sensible defaults
 */
export function buildTask(
  id: string,
  agentName: string,
  description: string,
  prompt: string,
  options?: {
    dependencies?: string[];
    priority?: number;
    maxTokens?: number;
    context?: Record<string, any>;
  }
): AgentTask {
  return {
    id,
    agentName,
    description,
    prompt,
    dependencies: options?.dependencies || [],
    priority: options?.priority || 5,
    maxTokens: options?.maxTokens || 16000,
    context: options?.context,
  };
}

/**
 * Visualize task dependency graph as ASCII
 */
export function visualizeDependencyGraph(tasks: AgentTask[]): string {
  const lines: string[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const processed = new Set<string>();

  function printTask(taskId: string, indent: number = 0) {
    if (processed.has(taskId)) return;
    processed.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    const prefix = '  '.repeat(indent) + (indent > 0 ? '└─ ' : '');
    lines.push(`${prefix}[${task.id}] ${task.agentName}: ${task.description}`);

    // Find tasks that depend on this one
    const dependents = tasks.filter(t =>
      t.dependencies?.includes(taskId)
    );

    for (const dependent of dependents) {
      printTask(dependent.id, indent + 1);
    }
  }

  // Find root tasks (no dependencies)
  const rootTasks = tasks.filter(t => !t.dependencies || t.dependencies.length === 0);

  lines.push('Workflow Dependency Graph:');
  lines.push('');

  for (const root of rootTasks) {
    printTask(root.id);
  }

  return lines.join('\n');
}

/**
 * Merge multiple workflow results
 */
export function mergeWorkflowResults(
  results: Map<string, AgentResult>[]
): Map<string, AgentResult> {
  const merged = new Map<string, AgentResult>();

  for (const resultMap of results) {
    for (const [key, value] of resultMap.entries()) {
      merged.set(key, value);
    }
  }

  return merged;
}

/**
 * Extract code from workflow results
 */
export function extractCodeFromResults(
  results: Map<string, AgentResult>
): Array<{ path: string; content: string; language: string }> {
  const codeFiles: Array<{ path: string; content: string; language: string }> = [];

  for (const result of results.values()) {
    if (!result.success) continue;

    // Extract code blocks from output
    const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(result.output)) !== null) {
      const language = match[1];
      const content = match[2];

      // Try to infer file path from context
      const pathMatch = result.output.match(/(?:File|Path|Create):\s*([^\s\n]+)/i);
      const path = pathMatch ? pathMatch[1] : `${result.taskId}.${language}`;

      codeFiles.push({ path, content, language });
    }
  }

  return codeFiles;
}

/**
 * Calculate workflow cost estimate
 */
export function estimateWorkflowCost(
  tasks: AgentTask[],
  pricing: {
    haiku: { input: number; output: number };
    sonnet: { input: number; output: number };
    opus: { input: number; output: number };
  } = {
    haiku: { input: 0.25, output: 1.25 }, // per MTok
    sonnet: { input: 3.0, output: 15.0 },
    opus: { input: 15.0, output: 75.0 },
  }
): number {
  let totalCost = 0;

  for (const task of tasks) {
    const model = task.model || 'sonnet';
    const tier = model.includes('haiku') ? 'haiku' : model.includes('opus') ? 'opus' : 'sonnet';

    // Estimate: 4000 input tokens, maxTokens output
    const inputTokens = 4000;
    const outputTokens = task.maxTokens || 16000;

    const inputCost = (inputTokens / 1_000_000) * pricing[tier].input;
    const outputCost = (outputTokens / 1_000_000) * pricing[tier].output;

    totalCost += inputCost + outputCost;
  }

  return totalCost;
}

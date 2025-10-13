/**
 * AgentOrchestrator - Multi-Agent Parallel Execution System
 *
 * Coordinates multiple AI agents to work together on complex tasks:
 * - Parallel agent execution for improved performance
 * - Agent-to-agent communication via message bus
 * - Dependency management and sequencing
 * - Context sharing and state management
 * - Progress tracking and streaming updates
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAgentRegistry } from './agent-registry';
import { ParsedAgent } from './agent-parser';
import { EventEmitter } from 'events';

export interface AgentTask {
  id: string;
  agentName: string;
  description: string;
  prompt: string;
  dependencies?: string[]; // IDs of tasks that must complete first
  context?: Record<string, any>;
  priority?: number; // 1-10, higher = more important
  maxTokens?: number;
  model?: string;
}

export interface AgentResult {
  taskId: string;
  agentName: string;
  success: boolean;
  output: string;
  tokensUsed: number;
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface OrchestratorConfig {
  maxParallelAgents?: number; // Max concurrent agent executions
  globalTimeout?: number; // Global timeout in milliseconds
  apiKey: string;
  enableCommunication?: boolean; // Enable agent-to-agent messages
  contextStrategy?: 'shared' | 'isolated' | 'hierarchical';
  pruningThreshold?: number; // Token threshold for context pruning
}

export interface AgentMessage {
  from: string;
  to: string;
  type: 'data' | 'request' | 'response' | 'broadcast';
  content: any;
  timestamp: Date;
}

export class AgentMessageBus extends EventEmitter {
  private messages: AgentMessage[] = [];
  private maxMessages = 100;

  send(message: AgentMessage): void {
    this.messages.push(message);

    // Prune old messages
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }

    // Emit to subscribers
    if (message.type === 'broadcast') {
      this.emit('broadcast', message);
    } else {
      this.emit(`message:${message.to}`, message);
    }
  }

  subscribe(agentName: string, handler: (message: AgentMessage) => void): void {
    this.on(`message:${agentName}`, handler);
  }

  broadcast(from: string, content: any): void {
    this.send({
      from,
      to: '*',
      type: 'broadcast',
      content,
      timestamp: new Date(),
    });
  }

  getHistory(agentName?: string): AgentMessage[] {
    if (!agentName) return this.messages;
    return this.messages.filter(m => m.from === agentName || m.to === agentName);
  }

  clear(): void {
    this.messages = [];
    this.removeAllListeners();
  }
}

export class AgentOrchestrator {
  private config: Required<OrchestratorConfig>;
  private client: Anthropic;
  private messageBus: AgentMessageBus;
  private taskQueue: Map<string, AgentTask> = new Map();
  private runningTasks: Map<string, Promise<AgentResult>> = new Map();
  private completedTasks: Map<string, AgentResult> = new Map();
  private sharedContext: Map<string, any> = new Map();
  private eventEmitter = new EventEmitter();

  constructor(config: OrchestratorConfig) {
    this.config = {
      maxParallelAgents: config.maxParallelAgents || 3,
      globalTimeout: config.globalTimeout || 300000, // 5 minutes
      apiKey: config.apiKey,
      enableCommunication: config.enableCommunication ?? true,
      contextStrategy: config.contextStrategy || 'shared',
      pruningThreshold: config.pruningThreshold || 150000, // 150K tokens
    };

    this.client = new Anthropic({ apiKey: this.config.apiKey });
    this.messageBus = new AgentMessageBus();
  }

  /**
   * Add a task to the execution queue
   */
  addTask(task: AgentTask): void {
    this.taskQueue.set(task.id, task);
    this.emit('task:added', task);
  }

  /**
   * Add multiple tasks
   */
  addTasks(tasks: AgentTask[]): void {
    tasks.forEach(task => this.addTask(task));
  }

  /**
   * Execute all queued tasks with dependency resolution
   */
  async execute(): Promise<Map<string, AgentResult>> {
    this.emit('execution:start', { taskCount: this.taskQueue.size });

    try {
      // Build dependency graph
      const graph = this.buildDependencyGraph();

      // Execute tasks in waves based on dependencies
      await this.executeInWaves(graph);

      this.emit('execution:complete', {
        totalTasks: this.completedTasks.size,
        successful: Array.from(this.completedTasks.values()).filter(r => r.success).length,
      });

      return this.completedTasks;
    } catch (error) {
      this.emit('execution:error', error);
      throw error;
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    this.emit('task:start', task);

    try {
      // Get agent from registry
      const registry = await getAgentRegistry();
      const agent = registry.getAgent(task.agentName);

      if (!agent) {
        throw new Error(`Agent "${task.agentName}" not found`);
      }

      // Build context for this task
      const context = await this.buildTaskContext(task, agent);

      // Execute the agent
      const result = await this.runAgent(agent, task, context);

      const duration = Date.now() - startTime;

      const agentResult: AgentResult = {
        taskId: task.id,
        agentName: task.agentName,
        success: true,
        output: result.output,
        tokensUsed: result.tokensUsed,
        duration,
        metadata: result.metadata,
      };

      // Update shared context if using shared strategy
      if (this.config.contextStrategy === 'shared') {
        this.sharedContext.set(task.id, {
          output: result.output,
          metadata: result.metadata,
        });
      }

      this.emit('task:complete', agentResult);
      return agentResult;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const agentResult: AgentResult = {
        taskId: task.id,
        agentName: task.agentName,
        success: false,
        output: '',
        tokensUsed: 0,
        duration,
        error: error.message,
      };

      this.emit('task:error', { task, error });
      return agentResult;
    }
  }

  /**
   * Run a specific agent with streaming support
   */
  private async runAgent(
    agent: ParsedAgent,
    task: AgentTask,
    context: string
  ): Promise<{ output: string; tokensUsed: number; metadata?: any }> {
    const systemPrompt = this.buildSystemPrompt(agent, task, context);

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: task.prompt,
      },
    ];

    // Add context from previous tasks if available
    if (task.context?.previousOutput) {
      messages.unshift({
        role: 'assistant',
        content: task.context.previousOutput,
      });
    }

    const model = task.model || this.getModelForAgent(agent);
    const maxTokens = task.maxTokens || 16000;

    this.emit('agent:invoke', {
      taskId: task.id,
      agentName: agent.metadata.name,
      model,
    });

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      messages,
      system: systemPrompt,
    });

    const output = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    return {
      output,
      tokensUsed,
      metadata: {
        model,
        stopReason: response.stop_reason,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Build system prompt for an agent
   */
  private buildSystemPrompt(agent: ParsedAgent, task: AgentTask, context: string): string {
    const parts: string[] = [];

    // Add agent's base system prompt
    parts.push(agent.systemPrompt);

    // Add orchestration context
    parts.push(`\n\n## ORCHESTRATION CONTEXT\n`);
    parts.push(`Task ID: ${task.id}`);
    parts.push(`Task Description: ${task.description}`);

    // Add communication capabilities if enabled
    if (this.config.enableCommunication) {
      parts.push(`\n### Agent Communication`);
      parts.push(`You can communicate with other agents via the message bus.`);
      parts.push(`Use XML tags to send messages: <AGENT_MESSAGE to="agent-name">content</AGENT_MESSAGE>`);
    }

    // Add shared context
    if (context) {
      parts.push(`\n### Shared Context\n${context}`);
    }

    return parts.join('\n');
  }

  /**
   * Build context for a specific task
   */
  private async buildTaskContext(task: AgentTask, agent: ParsedAgent): Promise<string> {
    const contextParts: string[] = [];

    // Add task-specific context
    if (task.context) {
      contextParts.push(`### Task Context\n${JSON.stringify(task.context, null, 2)}`);
    }

    // Add dependency outputs
    if (task.dependencies && task.dependencies.length > 0) {
      contextParts.push(`### Dependency Results`);

      for (const depId of task.dependencies) {
        const depResult = this.completedTasks.get(depId);
        if (depResult && depResult.success) {
          contextParts.push(`\n**Task ${depId} (${depResult.agentName}):**`);
          contextParts.push(this.pruneContext(depResult.output, 2000));
        }
      }
    }

    // Add shared context based on strategy
    if (this.config.contextStrategy === 'shared') {
      const sharedContextStr = this.getRelevantSharedContext(task);
      if (sharedContextStr) {
        contextParts.push(`\n### Shared Context\n${sharedContextStr}`);
      }
    }

    return contextParts.join('\n\n');
  }

  /**
   * Get relevant shared context for a task
   */
  private getRelevantSharedContext(task: AgentTask): string {
    const contextParts: string[] = [];
    let totalTokens = 0;
    const maxTokens = 5000; // Limit shared context

    // Get most recent completed tasks
    const recentTasks = Array.from(this.completedTasks.entries())
      .slice(-5)
      .filter(([id]) => id !== task.id);

    for (const [id, result] of recentTasks) {
      const contextData = this.sharedContext.get(id);
      if (contextData && totalTokens < maxTokens) {
        const summary = this.pruneContext(contextData.output, 500);
        contextParts.push(`**${result.agentName}:** ${summary}`);
        totalTokens += summary.length / 4; // Rough token estimate
      }
    }

    return contextParts.join('\n\n');
  }

  /**
   * Prune context to fit within token limit
   */
  private pruneContext(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;

    // Try to prune intelligently by keeping start and end
    const halfMax = Math.floor(maxChars / 2) - 50;
    return `${text.substring(0, halfMax)}\n\n... [content pruned] ...\n\n${text.substring(text.length - halfMax)}`;
  }

  /**
   * Get appropriate model for an agent
   */
  private getModelForAgent(agent: ParsedAgent): string {
    const modelMap: Record<string, string> = {
      haiku: 'claude-3-5-haiku-20241022',
      sonnet: 'claude-sonnet-4-20250514',
      opus: 'claude-opus-4-20250514',
    };

    return modelMap[agent.metadata.model || 'sonnet'];
  }

  /**
   * Build dependency graph from tasks
   */
  private buildDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const [id, task] of this.taskQueue) {
      graph.set(id, task.dependencies || []);
    }

    // Validate no circular dependencies
    this.validateNoCycles(graph);

    return graph;
  }

  /**
   * Validate no circular dependencies
   */
  private validateNoCycles(graph: Map<string, string[]>): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const deps = graph.get(node) || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          throw new Error('Circular dependency detected in task graph');
        }
      }
    }
  }

  /**
   * Execute tasks in waves based on dependencies
   */
  private async executeInWaves(graph: Map<string, string[]>): Promise<void> {
    const remaining = new Set(graph.keys());
    const completed = new Set<string>();

    while (remaining.size > 0) {
      // Find tasks ready to execute (no unmet dependencies)
      const ready: string[] = [];

      for (const taskId of remaining) {
        const deps = graph.get(taskId) || [];
        const depsReady = deps.every(dep => completed.has(dep));

        if (depsReady) {
          ready.push(taskId);
        }
      }

      if (ready.length === 0 && remaining.size > 0) {
        throw new Error('Deadlock detected: no tasks ready to execute but tasks remain');
      }

      // Execute ready tasks in parallel (respecting maxParallelAgents)
      await this.executeWave(ready);

      // Mark as completed
      ready.forEach(id => {
        remaining.delete(id);
        completed.add(id);
      });
    }
  }

  /**
   * Execute a wave of tasks in parallel
   */
  private async executeWave(taskIds: string[]): Promise<void> {
    this.emit('wave:start', { taskIds });

    // Execute in batches respecting maxParallelAgents
    for (let i = 0; i < taskIds.length; i += this.config.maxParallelAgents) {
      const batch = taskIds.slice(i, i + this.config.maxParallelAgents);

      const promises = batch.map(async (taskId) => {
        const task = this.taskQueue.get(taskId)!;
        const resultPromise = this.executeTask(task);
        this.runningTasks.set(taskId, resultPromise);

        const result = await resultPromise;
        this.completedTasks.set(taskId, result);
        this.runningTasks.delete(taskId);

        return result;
      });

      await Promise.all(promises);
    }

    this.emit('wave:complete', { taskIds });
  }

  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      queued: this.taskQueue.size,
      running: this.runningTasks.size,
      completed: this.completedTasks.size,
      sharedContextSize: this.sharedContext.size,
    };
  }

  /**
   * Get results for specific tasks
   */
  getResults(taskIds?: string[]): AgentResult[] {
    if (!taskIds) {
      return Array.from(this.completedTasks.values());
    }

    return taskIds
      .map(id => this.completedTasks.get(id))
      .filter((r): r is AgentResult => r !== undefined);
  }

  /**
   * Clear all state
   */
  reset(): void {
    this.taskQueue.clear();
    this.runningTasks.clear();
    this.completedTasks.clear();
    this.sharedContext.clear();
    this.messageBus.clear();
    this.eventEmitter.removeAllListeners();
  }

  /**
   * Subscribe to orchestrator events
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * Emit orchestrator events
   */
  private emit(event: string, data?: any): void {
    this.eventEmitter.emit(event, data);
  }

  /**
   * Get message bus for agent communication
   */
  getMessageBus(): AgentMessageBus {
    return this.messageBus;
  }
}

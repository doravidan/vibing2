/**
 * Agent Registry - Loads, indexes, and manages all available agents
 * Provides fast lookup and intelligent agent selection
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ParsedAgent, parseAgentFile, AgentMetadata } from './agent-parser';

export class AgentRegistry {
  private agents: Map<string, ParsedAgent> = new Map();
  private agentsByCategory: Map<string, ParsedAgent[]> = new Map();
  private agentsByModel: Map<string, ParsedAgent[]> = new Map();
  private initialized = false;

  /**
   * Load all agents from the .claude/agents directory
   */
  async loadAgents(agentsDir: string = '.claude/agents'): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadAgentsFromDirectory(agentsDir);
      this.buildIndexes();
      this.initialized = true;
      console.log(`✅ Loaded ${this.agents.size} agents`);
    } catch (error) {
      console.error('Failed to load agents:', error);
      throw error;
    }
  }

  /**
   * Recursively load agents from directory
   */
  private async loadAgentsFromDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively load subdirectories
          await this.loadAgentsFromDirectory(fullPath);
        } else if (entry.name.endsWith('.md')) {
          // Parse and store agent
          const content = await fs.readFile(fullPath, 'utf-8');
          const agent = parseAgentFile(content, fullPath);
          this.agents.set(agent.metadata.name, agent);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      console.warn(`Could not read directory: ${dir}`);
    }
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    // Clear existing indexes
    this.agentsByCategory.clear();
    this.agentsByModel.clear();

    // Build category index
    for (const agent of this.agents.values()) {
      const category = agent.metadata.category || 'agents';
      if (!this.agentsByCategory.has(category)) {
        this.agentsByCategory.set(category, []);
      }
      this.agentsByCategory.get(category)!.push(agent);

      // Build model index
      const model = agent.metadata.model || 'sonnet';
      if (!this.agentsByModel.has(model)) {
        this.agentsByModel.set(model, []);
      }
      this.agentsByModel.get(model)!.push(agent);
    }
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): ParsedAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get all agents
   */
  getAllAgents(): ParsedAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by category
   */
  getAgentsByCategory(category: string): ParsedAgent[] {
    return this.agentsByCategory.get(category) || [];
  }

  /**
   * Get agents by model tier
   */
  getAgentsByModel(model: 'haiku' | 'sonnet' | 'opus'): ParsedAgent[] {
    return this.agentsByModel.get(model) || [];
  }

  /**
   * Search agents by keyword
   */
  searchAgents(query: string): ParsedAgent[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.agents.values()).filter(agent => {
      return (
        agent.metadata.name.toLowerCase().includes(lowerQuery) ||
        agent.metadata.description.toLowerCase().includes(lowerQuery) ||
        agent.systemPrompt.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      total: this.agents.size,
      byCategory: Object.fromEntries(
        Array.from(this.agentsByCategory.entries()).map(([k, v]) => [k, v.length])
      ),
      byModel: Object.fromEntries(
        Array.from(this.agentsByModel.entries()).map(([k, v]) => [k, v.length])
      ),
    };
  }
}

// Singleton instance
let registryInstance: AgentRegistry | null = null;

/**
 * Get the global agent registry instance
 */
export async function getAgentRegistry(): Promise<AgentRegistry> {
  if (!registryInstance) {
    registryInstance = new AgentRegistry();
    await registryInstance.loadAgents();
  }
  return registryInstance;
}

/**
 * Reset the registry (useful for testing)
 */
export function resetAgentRegistry(): void {
  registryInstance = null;
}

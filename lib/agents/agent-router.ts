/**
 * Agent Router - Intelligently selects the best agent(s) for a given task
 * Implements context-based activation and explicit agent selection
 */

import { ParsedAgent } from './agent-parser';
import { getAgentRegistry } from './agent-registry';

export interface AgentSelectionResult {
  primaryAgent: ParsedAgent;
  supportingAgents: ParsedAgent[];
  confidence: number;
  reasoning: string;
}

/**
 * Keyword-based agent mapping for context detection
 */
const AGENT_KEYWORDS: Record<string, string[]> = {
  // Architecture
  'backend-architect': ['api', 'backend', 'microservice', 'rest', 'graphql', 'architecture', 'design system'],
  'frontend-developer': ['react', 'ui', 'component', 'frontend', 'interface', 'responsive'],
  'cloud-architect': ['aws', 'azure', 'gcp', 'cloud', 'infrastructure', 'scalability'],

  // Security
  'security-auditor': ['security', 'vulnerability', 'audit', 'owasp', 'penetration', 'threat'],
  'backend-security-coder': ['auth', 'jwt', 'oauth', 'session', 'encryption', 'sql injection'],
  'frontend-security-coder': ['xss', 'csrf', 'sanitize', 'content security policy'],

  // Testing & Quality
  'test-automator': ['test', 'testing', 'unit test', 'integration test', 'e2e', 'coverage'],
  'tdd-orchestrator': ['tdd', 'test-driven', 'red-green-refactor'],
  'debugger': ['bug', 'error', 'debug', 'issue', 'fix', 'troubleshoot'],

  // Performance
  'performance-engineer': ['performance', 'optimization', 'slow', 'bottleneck', 'profiling'],
  'database-optimizer': ['query', 'index', 'database performance', 'sql optimization'],

  // DevOps & Deployment
  'deployment-engineer': ['deploy', 'ci/cd', 'pipeline', 'docker', 'kubernetes'],
  'devops-troubleshooter': ['production issue', 'outage', 'monitoring', 'logs'],

  // Data & ML
  'data-scientist': ['data analysis', 'statistics', 'insights', 'metrics'],
  'ml-engineer': ['machine learning', 'model', 'training', 'neural network'],
  'ai-engineer': ['llm', 'gpt', 'rag', 'prompt', 'embeddings'],

  // Documentation
  'docs-architect': ['documentation', 'readme', 'guide', 'tutorial'],
  'api-documenter': ['api docs', 'swagger', 'openapi', 'api reference'],
};

/**
 * Project type to agent mapping
 */
const PROJECT_TYPE_AGENTS: Record<string, string[]> = {
  'website': ['frontend-developer', 'ui-ux-designer', 'seo-meta-optimizer'],
  'mobile-app': ['mobile-developer', 'ios-developer', 'mobile-security-coder'],
  'game': ['unity-developer', 'game-developer', 'performance-engineer'],
  'api': ['backend-architect', 'api-documenter', 'security-auditor'],
  'dashboard': ['frontend-developer', 'data-scientist', 'ui-ux-designer'],
};

/**
 * Select agent based on explicit name mention
 */
function selectByExplicitMention(prompt: string, agents: ParsedAgent[]): ParsedAgent | null {
  const lowerPrompt = prompt.toLowerCase();

  // Check for explicit agent mentions like "use backend-architect" or "have security-auditor"
  const explicitPatterns = [
    /use\s+([a-z-]+)/gi,
    /have\s+([a-z-]+)\s+(scan|review|check|analyze|build|create)/gi,
    /with\s+([a-z-]+)\s+agent/gi,
    /([a-z-]+)\s+agent/gi,
  ];

  for (const pattern of explicitPatterns) {
    const matches = [...lowerPrompt.matchAll(pattern)];
    for (const match of matches) {
      const agentName = match[1];
      const agent = agents.find(a => a.metadata.name.toLowerCase() === agentName);
      if (agent) {
        return agent;
      }
    }
  }

  return null;
}

/**
 * Calculate keyword match score for an agent
 */
function calculateKeywordScore(prompt: string, agentName: string): number {
  const keywords = AGENT_KEYWORDS[agentName] || [];
  if (keywords.length === 0) return 0;

  const lowerPrompt = prompt.toLowerCase();
  let matches = 0;

  for (const keyword of keywords) {
    if (lowerPrompt.includes(keyword.toLowerCase())) {
      matches++;
    }
  }

  return matches / keywords.length;
}

/**
 * Select agent based on project type
 */
function selectByProjectType(projectType: string, agents: ParsedAgent[]): ParsedAgent[] {
  const suggestedAgentNames = PROJECT_TYPE_AGENTS[projectType] || [];
  return agents.filter(a => suggestedAgentNames.includes(a.metadata.name));
}

/**
 * Select agent based on context and keywords
 */
async function selectByContext(
  prompt: string,
  projectType?: string
): Promise<AgentSelectionResult | null> {
  const registry = await getAgentRegistry();
  const allAgents = registry.getAllAgents();

  // 1. Check for explicit agent mention
  const explicitAgent = selectByExplicitMention(prompt, allAgents);
  if (explicitAgent) {
    return {
      primaryAgent: explicitAgent,
      supportingAgents: [],
      confidence: 1.0,
      reasoning: `Explicit agent selection: "${explicitAgent.metadata.name}"`,
    };
  }

  // 2. Calculate keyword scores
  const scores: Array<{ agent: ParsedAgent; score: number }> = [];

  for (const agent of allAgents) {
    // Skip workflows and tools for primary agent selection
    if (agent.metadata.type !== 'agent') continue;

    const score = calculateKeywordScore(prompt, agent.metadata.name);
    if (score > 0) {
      scores.push({ agent, score });
    }
  }

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  // 3. Get project type suggestions
  let projectTypeAgents: ParsedAgent[] = [];
  if (projectType) {
    projectTypeAgents = selectByProjectType(projectType, allAgents);
  }

  // 4. Combine results
  if (scores.length > 0) {
    const primaryAgent = scores[0].agent;
    const supportingAgents = scores.slice(1, 3).map(s => s.agent);

    // Add project type agents if not already included
    for (const ptAgent of projectTypeAgents) {
      if (ptAgent.metadata.name !== primaryAgent.metadata.name &&
          !supportingAgents.find(a => a.metadata.name === ptAgent.metadata.name)) {
        supportingAgents.push(ptAgent);
      }
    }

    return {
      primaryAgent,
      supportingAgents: supportingAgents.slice(0, 3), // Max 3 supporting agents
      confidence: scores[0].score,
      reasoning: `Keyword match (${(scores[0].score * 100).toFixed(0)}% confidence)`,
    };
  }

  // 5. Fallback to project type only
  if (projectTypeAgents.length > 0) {
    return {
      primaryAgent: projectTypeAgents[0],
      supportingAgents: projectTypeAgents.slice(1, 3),
      confidence: 0.5,
      reasoning: `Project type suggestion for "${projectType}"`,
    };
  }

  return null;
}

/**
 * Main agent selection function
 */
export async function selectAgent(
  prompt: string,
  projectType?: string,
  explicitAgentName?: string
): Promise<AgentSelectionResult | null> {
  const registry = await getAgentRegistry();

  // 1. Explicit agent selection
  if (explicitAgentName) {
    const agent = registry.getAgent(explicitAgentName);
    if (agent) {
      return {
        primaryAgent: agent,
        supportingAgents: [],
        confidence: 1.0,
        reasoning: `User-specified agent: "${explicitAgentName}"`,
      };
    }
  }

  // 2. Context-based selection
  return await selectByContext(prompt, projectType);
}

/**
 * Get suggested agents for a project type
 */
export async function getSuggestedAgents(projectType: string): Promise<ParsedAgent[]> {
  const registry = await getAgentRegistry();
  const allAgents = registry.getAllAgents();
  return selectByProjectType(projectType, allAgents);
}

/**
 * Search agents by name or description
 */
export async function searchAgents(query: string): Promise<ParsedAgent[]> {
  const registry = await getAgentRegistry();
  return registry.searchAgents(query);
}

/**
 * Automatic Agent Selector
 * Intelligently selects the best agents based on prompt analysis and project context
 */

import { selectAgent } from './agent-router';

export interface ProjectContext {
  projectType: string;
  existingFiles?: string[];
  currentCode?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface AutoSelectionResult {
  agents: string[];
  reasoning: string;
  confidence: number;
  primaryAgent?: string;
}

/**
 * Enhanced keyword analysis with context awareness
 */
const INTENT_PATTERNS = {
  // UI/Frontend intents
  ui_creation: {
    keywords: ['create', 'build', 'make', 'design', 'ui', 'interface', 'page', 'component', 'button', 'form', 'layout'],
    agents: ['frontend-developer', 'ui-ux-designer'],
    weight: 1.5
  },
  ui_styling: {
    keywords: ['style', 'css', 'color', 'font', 'spacing', 'responsive', 'mobile', 'theme', 'design'],
    agents: ['frontend-developer', 'css-expert'],
    weight: 1.3
  },

  // Backend/API intents
  api_creation: {
    keywords: ['api', 'endpoint', 'route', 'backend', 'server', 'database', 'crud', 'rest', 'graphql'],
    agents: ['backend-architect', 'api-developer'],
    weight: 1.5
  },
  database: {
    keywords: ['database', 'schema', 'table', 'query', 'sql', 'mongodb', 'prisma', 'migration'],
    agents: ['database-optimizer', 'backend-architect'],
    weight: 1.4
  },

  // Security intents
  authentication: {
    keywords: ['auth', 'login', 'signup', 'register', 'session', 'jwt', 'oauth', 'security', 'password'],
    agents: ['backend-security-coder', 'auth-specialist'],
    weight: 1.6
  },
  security_review: {
    keywords: ['secure', 'vulnerability', 'xss', 'csrf', 'injection', 'audit', 'protect'],
    agents: ['security-auditor', 'frontend-security-coder', 'backend-security-coder'],
    weight: 1.5
  },

  // Testing intents
  testing: {
    keywords: ['test', 'testing', 'unit test', 'integration', 'e2e', 'coverage', 'spec', 'jest', 'cypress'],
    agents: ['test-automator', 'tdd-orchestrator'],
    weight: 1.3
  },

  // Performance intents
  optimization: {
    keywords: ['optimize', 'performance', 'speed', 'fast', 'slow', 'lag', 'bottleneck', 'cache'],
    agents: ['performance-engineer', 'database-optimizer'],
    weight: 1.4
  },

  // Bug fixing intents
  debugging: {
    keywords: ['fix', 'bug', 'error', 'issue', 'problem', 'crash', 'broken', 'not working', 'debug'],
    agents: ['debugger', 'code-reviewer'],
    weight: 1.6
  },

  // Feature addition intents
  feature_addition: {
    keywords: ['add', 'implement', 'create feature', 'new functionality', 'integrate', 'include'],
    agents: ['fullstack-developer', 'feature-engineer'],
    weight: 1.2
  },

  // Code quality intents
  refactoring: {
    keywords: ['refactor', 'clean', 'improve', 'restructure', 'organize', 'simplify', 'readable'],
    agents: ['code-reviewer', 'refactoring-specialist'],
    weight: 1.3
  },

  // Documentation intents
  documentation: {
    keywords: ['document', 'docs', 'readme', 'comment', 'explain', 'guide', 'tutorial'],
    agents: ['docs-architect', 'technical-writer'],
    weight: 1.1
  },

  // Deployment intents
  deployment: {
    keywords: ['deploy', 'deployment', 'ci/cd', 'docker', 'kubernetes', 'production', 'hosting'],
    agents: ['deployment-engineer', 'devops-engineer'],
    weight: 1.3
  },

  // Data/AI intents
  data_processing: {
    keywords: ['data', 'analytics', 'chart', 'graph', 'visualization', 'report', 'dashboard'],
    agents: ['data-scientist', 'frontend-developer'],
    weight: 1.2
  },
  ai_integration: {
    keywords: ['ai', 'ml', 'machine learning', 'llm', 'gpt', 'openai', 'chatbot', 'intelligent'],
    agents: ['ai-engineer', 'ml-engineer'],
    weight: 1.4
  }
};

/**
 * Analyze prompt for intent and keywords
 */
function analyzePromptIntent(prompt: string): { intent: string; confidence: number; matchedKeywords: string[] }[] {
  const lowerPrompt = prompt.toLowerCase();
  const results: { intent: string; confidence: number; matchedKeywords: string[] }[] = [];

  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of config.keywords) {
      if (lowerPrompt.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        score += config.weight;
      }
    }

    if (matchedKeywords.length > 0) {
      const confidence = (matchedKeywords.length / config.keywords.length) * config.weight;
      results.push({ intent, confidence, matchedKeywords });
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

/**
 * Analyze project context to determine relevant agents
 */
function analyzeProjectContext(context: ProjectContext): string[] {
  const contextAgents: string[] = [];

  // Analyze existing files
  if (context.existingFiles && context.existingFiles.length > 0) {
    const hasBackend = context.existingFiles.some(f =>
      f.includes('api/') || f.includes('server') || f.includes('backend')
    );
    const hasFrontend = context.existingFiles.some(f =>
      f.includes('components/') || f.includes('pages/') || f.endsWith('.tsx') || f.endsWith('.jsx')
    );
    const hasDatabase = context.existingFiles.some(f =>
      f.includes('prisma/') || f.includes('schema') || f.includes('migration')
    );
    const hasTests = context.existingFiles.some(f =>
      f.includes('test') || f.includes('spec') || f.includes('__tests__')
    );

    if (hasFrontend) contextAgents.push('frontend-developer');
    if (hasBackend) contextAgents.push('backend-architect');
    if (hasDatabase) contextAgents.push('database-optimizer');
    if (hasTests) contextAgents.push('test-automator');
  }

  // Analyze current code
  if (context.currentCode) {
    const hasReact = context.currentCode.includes('React') || context.currentCode.includes('useState');
    const hasAPI = context.currentCode.includes('fetch') || context.currentCode.includes('axios');
    const hasAuth = context.currentCode.includes('auth') || context.currentCode.includes('login');

    if (hasReact) contextAgents.push('frontend-developer');
    if (hasAPI) contextAgents.push('backend-architect');
    if (hasAuth) contextAgents.push('backend-security-coder');
  }

  // Consider conversation history (recent context)
  if (context.conversationHistory && context.conversationHistory.length > 0) {
    const recentMessages = context.conversationHistory.slice(-3);
    const recentTopics = recentMessages.map(m => m.content.toLowerCase()).join(' ');

    if (recentTopics.includes('error') || recentTopics.includes('fix')) {
      contextAgents.push('debugger');
    }
    if (recentTopics.includes('test')) {
      contextAgents.push('test-automator');
    }
    if (recentTopics.includes('security')) {
      contextAgents.push('security-auditor');
    }
  }

  return [...new Set(contextAgents)]; // Remove duplicates
}

/**
 * Automatically select the best agents for a prompt
 */
export async function autoSelectAgents(
  prompt: string,
  context: ProjectContext
): Promise<AutoSelectionResult> {
  // 1. Analyze prompt intent
  const intentAnalysis = analyzePromptIntent(prompt);

  // 2. Analyze project context
  const contextAgents = analyzeProjectContext(context);

  // 3. Use agent router for keyword-based selection
  let routerSelection;
  try {
    routerSelection = await selectAgent(prompt, context.projectType);
  } catch (error) {
    console.warn('Agent router selection failed, using fallback');
  }

  // 4. Combine all sources
  const agentScores = new Map<string, number>();

  // Add agents from intent analysis (highest weight)
  for (let i = 0; i < Math.min(3, intentAnalysis.length); i++) {
    const intent = intentAnalysis[i];
    const agents = (INTENT_PATTERNS as any)[intent.intent]?.agents || [];
    const weight = 3 - i; // First intent gets highest weight

    for (const agent of agents) {
      agentScores.set(agent, (agentScores.get(agent) || 0) + intent.confidence * weight);
    }
  }

  // Add agents from context analysis (medium weight)
  for (const agent of contextAgents) {
    agentScores.set(agent, (agentScores.get(agent) || 0) + 1.5);
  }

  // Add agents from router selection (medium-high weight)
  if (routerSelection) {
    if (routerSelection.primaryAgent) {
      const agentName = routerSelection.primaryAgent.metadata.name;
      agentScores.set(agentName, (agentScores.get(agentName) || 0) + 2.5);
    }
    for (const supportingAgent of routerSelection.supportingAgents || []) {
      const agentName = supportingAgent.metadata.name;
      agentScores.set(agentName, (agentScores.get(agentName) || 0) + 1.0);
    }
  }

  // 5. Sort and select top agents
  const sortedAgents = Array.from(agentScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([agent]) => agent);

  // Select top 3-5 agents based on scores
  const selectedAgents = sortedAgents.slice(0, Math.min(5, sortedAgents.length));

  // 6. Build reasoning
  const topIntents = intentAnalysis.slice(0, 2).map(i => i.intent.replace(/_/g, ' '));
  const reasoning = [
    `Detected intents: ${topIntents.join(', ')}`,
    contextAgents.length > 0 ? `Project context suggests: ${contextAgents.slice(0, 2).join(', ')}` : null,
    `Selected ${selectedAgents.length} specialized agents for this task`
  ].filter(Boolean).join('. ');

  // 7. Calculate overall confidence
  const maxPossibleScore = 10;
  const topScore = agentScores.get(selectedAgents[0]) || 0;
  const confidence = Math.min(1, topScore / maxPossibleScore);

  return {
    agents: selectedAgents,
    reasoning,
    confidence,
    primaryAgent: selectedAgents[0]
  };
}

/**
 * Get suggested agents for display (optional, if you want to show users what was selected)
 */
export function explainAgentSelection(result: AutoSelectionResult): string {
  const agentList = result.agents.map(a => a.replace(/-/g, ' ')).join(', ');
  return `🤖 Auto-selected agents: ${agentList}\n💡 ${result.reasoning}\n📊 Confidence: ${(result.confidence * 100).toFixed(0)}%`;
}

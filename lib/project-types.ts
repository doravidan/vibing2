export type ProjectType = 'website' | 'mobile-app' | 'game' | 'api' | 'dashboard';

export interface Agent {
  name: string;
  promptFile: string;
  description: string;
}

export interface ProjectTypeConfig {
  id: ProjectType;
  name: string;
  icon: string;
  description: string;
  baseAgents: string[];
  keywords: string[];
}

export const PROJECT_TYPES: ProjectTypeConfig[] = [
  {
    id: 'website',
    name: 'Website / Web App',
    icon: '🌐',
    description: 'Landing pages, portfolios, business websites',
    baseAgents: ['frontend-developer', 'ui-ux-designer', 'code-reviewer'],
    keywords: ['responsive', 'seo', 'landing', 'portfolio', 'business']
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    icon: '📱',
    description: 'iOS, Android, or cross-platform apps',
    baseAgents: ['mobile-developer', 'ui-ux-designer', 'performance-engineer'],
    keywords: ['ios', 'android', 'mobile', 'app', 'native', 'flutter', 'react-native']
  },
  {
    id: 'game',
    name: 'Game',
    icon: '🎮',
    description: 'Browser games, Unity games, interactive experiences',
    baseAgents: ['unity-developer', 'ui-ux-designer', 'performance-engineer'],
    keywords: ['game', 'unity', 'phaser', '2d', '3d', 'interactive', 'canvas']
  },
  {
    id: 'api',
    name: 'API / Backend',
    icon: '⚙️',
    description: 'REST APIs, GraphQL, microservices',
    baseAgents: ['backend-architect', 'security-auditor', 'test-automator'],
    keywords: ['api', 'backend', 'rest', 'graphql', 'microservice', 'server']
  },
  {
    id: 'dashboard',
    name: 'Dashboard / Admin',
    icon: '📊',
    description: 'Data visualizations, admin panels, analytics',
    baseAgents: ['frontend-developer', 'data-engineer', 'ui-ux-designer'],
    keywords: ['dashboard', 'admin', 'analytics', 'chart', 'data', 'visualization']
  }
];

// Agent selection based on project description
export function selectAdditionalAgents(description: string, baseAgents: string[]): string[] {
  const additional: string[] = [];
  const lowerDesc = description.toLowerCase();

  // Security-related
  if (lowerDesc.match(/auth|login|payment|secure|encrypt/)) {
    additional.push('security-auditor');
  }

  // Performance-critical
  if (lowerDesc.match(/fast|performance|optimiz|speed|realtime/)) {
    additional.push('performance-engineer');
  }

  // Testing requirements
  if (lowerDesc.match(/test|quality|reliable|tdd/)) {
    additional.push('test-automator');
  }

  // Database needs
  if (lowerDesc.match(/database|db|sql|mongo|data storage/)) {
    additional.push('database-optimizer');
  }

  // Animation/interactive
  if (lowerDesc.match(/animat|transition|interact|motion/)) {
    additional.push('frontend-developer');
  }

  // Deployment
  if (lowerDesc.match(/deploy|production|cloud|host/)) {
    additional.push('deployment-engineer');
  }

  // Remove duplicates
  return [...new Set([...baseAgents, ...additional])];
}

export function getProjectTypeConfig(typeId: ProjectType): ProjectTypeConfig | undefined {
  return PROJECT_TYPES.find(pt => pt.id === typeId);
}

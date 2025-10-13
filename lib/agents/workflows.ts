/**
 * Workflow Templates - Pre-configured multi-agent workflows
 *
 * Provides reusable workflow templates for common development tasks:
 * - Full-stack development (frontend + backend + database)
 * - Security audit (multiple security checks)
 * - Testing workflow (unit + integration + e2e)
 * - Performance optimization
 * - Code review and quality assurance
 * - DevOps and deployment
 */

import { AgentTask } from './orchestrator';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'security' | 'testing' | 'performance' | 'devops' | 'quality';
  tags: string[];
  estimatedDuration: number; // in seconds
  complexity: 'simple' | 'moderate' | 'complex';
  buildTasks: (params: Record<string, any>) => AgentTask[];
}

/**
 * Full-Stack Development Workflow
 * Coordinates frontend, backend, and database agents
 */
export const fullStackWorkflow: WorkflowTemplate = {
  id: 'fullstack-dev',
  name: 'Full-Stack Development',
  description: 'Comprehensive full-stack application development with frontend, backend, and database',
  category: 'development',
  tags: ['fullstack', 'frontend', 'backend', 'database'],
  estimatedDuration: 300,
  complexity: 'complex',
  buildTasks: (params) => {
    const { projectType = 'web app', features = [], techStack = {} } = params;

    return [
      // Task 1: Backend Architecture Design
      {
        id: 'backend-architecture',
        agentName: 'backend-architect',
        description: 'Design backend architecture and API structure',
        prompt: `Design a scalable backend architecture for a ${projectType} with the following features: ${features.join(', ')}.

Tech stack: ${JSON.stringify(techStack)}

Requirements:
- RESTful API design
- Database schema
- Authentication strategy
- Error handling patterns
- Scalability considerations`,
        priority: 10,
        maxTokens: 16000,
      },

      // Task 2: Database Schema Design (depends on backend architecture)
      {
        id: 'database-schema',
        agentName: 'database-optimizer',
        description: 'Design optimized database schema',
        prompt: `Based on the backend architecture, design an optimized database schema.

Requirements:
- Normalized schema design
- Index strategy
- Query optimization
- Data integrity constraints
- Migration strategy`,
        dependencies: ['backend-architecture'],
        priority: 9,
        maxTokens: 12000,
      },

      // Task 3: Frontend Architecture (parallel with database)
      {
        id: 'frontend-architecture',
        agentName: 'frontend-developer',
        description: 'Design frontend architecture and component structure',
        prompt: `Design a modern frontend architecture for a ${projectType}.

Features needed: ${features.join(', ')}

Requirements:
- Component hierarchy
- State management strategy
- Routing structure
- API integration patterns
- Responsive design approach`,
        dependencies: ['backend-architecture'],
        priority: 9,
        maxTokens: 16000,
      },

      // Task 4: API Implementation
      {
        id: 'api-implementation',
        agentName: 'backend-architect',
        description: 'Implement backend API endpoints',
        prompt: `Implement the backend API based on the architecture and database schema.

Requirements:
- RESTful endpoints
- Input validation
- Error handling
- Authentication/authorization
- API documentation`,
        dependencies: ['backend-architecture', 'database-schema'],
        priority: 8,
        maxTokens: 20000,
      },

      // Task 5: UI Component Implementation
      {
        id: 'ui-implementation',
        agentName: 'frontend-developer',
        description: 'Implement frontend UI components',
        prompt: `Implement the frontend UI components based on the architecture.

Requirements:
- Reusable components
- Responsive design
- Accessibility (WCAG 2.1)
- Performance optimization
- Clean component API`,
        dependencies: ['frontend-architecture'],
        priority: 8,
        maxTokens: 20000,
      },

      // Task 6: Integration & Testing
      {
        id: 'integration',
        agentName: 'test-automator',
        description: 'Create integration tests for frontend-backend communication',
        prompt: `Create comprehensive integration tests for the full-stack application.

Requirements:
- API integration tests
- End-to-end user flows
- Error scenario testing
- Performance benchmarks
- Test data generation`,
        dependencies: ['api-implementation', 'ui-implementation'],
        priority: 7,
        maxTokens: 16000,
      },
    ];
  },
};

/**
 * Security Audit Workflow
 * Comprehensive security analysis with multiple specialized agents
 */
export const securityAuditWorkflow: WorkflowTemplate = {
  id: 'security-audit',
  name: 'Security Audit',
  description: 'Comprehensive security audit with OWASP Top 10 checks and vulnerability scanning',
  category: 'security',
  tags: ['security', 'audit', 'owasp', 'vulnerability'],
  estimatedDuration: 240,
  complexity: 'complex',
  buildTasks: (params) => {
    const { codebasePath = '.', scope = 'full' } = params;

    return [
      // Task 1: Security Overview
      {
        id: 'security-overview',
        agentName: 'security-auditor',
        description: 'Perform initial security assessment and threat modeling',
        prompt: `Perform a comprehensive security assessment of the codebase at: ${codebasePath}

Scope: ${scope}

Requirements:
- Threat modeling
- Attack surface analysis
- Security architecture review
- Compliance check (OWASP Top 10)
- Risk prioritization`,
        priority: 10,
        maxTokens: 16000,
      },

      // Task 2: Frontend Security (parallel)
      {
        id: 'frontend-security',
        agentName: 'frontend-security-coder',
        description: 'Audit frontend security (XSS, CSRF, CSP)',
        prompt: `Audit frontend code for security vulnerabilities.

Focus areas:
- XSS prevention
- CSRF protection
- Content Security Policy
- Input sanitization
- Secure storage (localStorage, cookies)
- Third-party script security`,
        dependencies: ['security-overview'],
        priority: 9,
        maxTokens: 12000,
      },

      // Task 3: Backend Security (parallel)
      {
        id: 'backend-security',
        agentName: 'backend-security-coder',
        description: 'Audit backend security (SQL injection, auth, encryption)',
        prompt: `Audit backend code for security vulnerabilities.

Focus areas:
- SQL injection prevention
- Authentication/authorization
- JWT security
- Password hashing
- API rate limiting
- Encryption at rest and in transit
- Secrets management`,
        dependencies: ['security-overview'],
        priority: 9,
        maxTokens: 12000,
      },

      // Task 4: Dependency Audit
      {
        id: 'dependency-security',
        agentName: 'security-auditor',
        description: 'Audit third-party dependencies for vulnerabilities',
        prompt: `Audit all third-party dependencies for known vulnerabilities.

Requirements:
- CVE database check
- License compliance
- Outdated package detection
- Supply chain risk assessment
- Remediation recommendations`,
        dependencies: ['security-overview'],
        priority: 8,
        maxTokens: 10000,
      },

      // Task 5: Infrastructure Security
      {
        id: 'infrastructure-security',
        agentName: 'cloud-architect',
        description: 'Review infrastructure and deployment security',
        prompt: `Review infrastructure configuration and deployment security.

Focus areas:
- Environment variable security
- Network security (firewalls, VPCs)
- Container security
- CI/CD pipeline security
- Monitoring and alerting
- Backup and disaster recovery`,
        dependencies: ['security-overview'],
        priority: 8,
        maxTokens: 10000,
      },

      // Task 6: Security Report Compilation
      {
        id: 'security-report',
        agentName: 'security-auditor',
        description: 'Compile comprehensive security audit report',
        prompt: `Compile a comprehensive security audit report based on all findings.

Requirements:
- Executive summary
- Detailed findings by category
- Risk assessment matrix
- Remediation priorities
- Implementation timeline
- Compliance status`,
        dependencies: ['frontend-security', 'backend-security', 'dependency-security', 'infrastructure-security'],
        priority: 7,
        maxTokens: 16000,
      },
    ];
  },
};

/**
 * Testing Workflow
 * Comprehensive testing strategy with unit, integration, and e2e tests
 */
export const testingWorkflow: WorkflowTemplate = {
  id: 'testing-suite',
  name: 'Comprehensive Testing',
  description: 'Full testing suite with unit, integration, and end-to-end tests',
  category: 'testing',
  tags: ['testing', 'tdd', 'unit', 'integration', 'e2e'],
  estimatedDuration: 180,
  complexity: 'moderate',
  buildTasks: (params) => {
    const { testScope = 'full', framework = 'jest', coverage = 80 } = params;

    return [
      // Task 1: Test Strategy
      {
        id: 'test-strategy',
        agentName: 'test-automator',
        description: 'Define comprehensive test strategy',
        prompt: `Define a comprehensive test strategy for the application.

Scope: ${testScope}
Framework: ${framework}
Target coverage: ${coverage}%

Requirements:
- Test pyramid approach
- Testing levels (unit, integration, e2e)
- Test data strategy
- CI/CD integration
- Coverage goals`,
        priority: 10,
        maxTokens: 12000,
      },

      // Task 2: Unit Tests (parallel tasks)
      {
        id: 'unit-tests-backend',
        agentName: 'test-automator',
        description: 'Create backend unit tests',
        prompt: `Create comprehensive unit tests for backend code.

Requirements:
- Business logic coverage
- Edge case testing
- Mocking strategy
- Test fixtures
- Assertion patterns`,
        dependencies: ['test-strategy'],
        priority: 9,
        maxTokens: 16000,
      },

      {
        id: 'unit-tests-frontend',
        agentName: 'test-automator',
        description: 'Create frontend unit tests',
        prompt: `Create comprehensive unit tests for frontend components.

Requirements:
- Component testing
- Hook testing
- Utility function testing
- Snapshot testing
- Accessibility testing`,
        dependencies: ['test-strategy'],
        priority: 9,
        maxTokens: 16000,
      },

      // Task 3: Integration Tests
      {
        id: 'integration-tests',
        agentName: 'test-automator',
        description: 'Create integration tests',
        prompt: `Create integration tests for API and database interactions.

Requirements:
- API endpoint testing
- Database integration
- Authentication flows
- Error handling
- Performance assertions`,
        dependencies: ['test-strategy', 'unit-tests-backend'],
        priority: 8,
        maxTokens: 16000,
      },

      // Task 4: E2E Tests
      {
        id: 'e2e-tests',
        agentName: 'test-automator',
        description: 'Create end-to-end tests',
        prompt: `Create end-to-end tests for critical user journeys.

Requirements:
- User flow testing
- Cross-browser testing
- Mobile responsiveness
- Performance testing
- Accessibility validation`,
        dependencies: ['test-strategy', 'unit-tests-frontend'],
        priority: 8,
        maxTokens: 16000,
      },

      // Task 5: Test Report
      {
        id: 'test-report',
        agentName: 'test-automator',
        description: 'Generate test coverage report',
        prompt: `Generate a comprehensive test coverage and quality report.

Requirements:
- Coverage metrics by module
- Test quality assessment
- Missing test identification
- Performance benchmarks
- Recommendations for improvement`,
        dependencies: ['unit-tests-backend', 'unit-tests-frontend', 'integration-tests', 'e2e-tests'],
        priority: 7,
        maxTokens: 12000,
      },
    ];
  },
};

/**
 * Performance Optimization Workflow
 * Comprehensive performance analysis and optimization
 */
export const performanceWorkflow: WorkflowTemplate = {
  id: 'performance-optimization',
  name: 'Performance Optimization',
  description: 'Comprehensive performance analysis and optimization for frontend, backend, and database',
  category: 'performance',
  tags: ['performance', 'optimization', 'profiling', 'scaling'],
  estimatedDuration: 200,
  complexity: 'complex',
  buildTasks: (params) => {
    const { targetMetrics = {}, currentBaseline = {} } = params;

    return [
      // Task 1: Performance Baseline
      {
        id: 'performance-baseline',
        agentName: 'performance-engineer',
        description: 'Establish performance baseline and targets',
        prompt: `Establish performance baseline and optimization targets.

Current metrics: ${JSON.stringify(currentBaseline)}
Target metrics: ${JSON.stringify(targetMetrics)}

Requirements:
- Performance profiling strategy
- Key metrics identification
- Bottleneck hypothesis
- Optimization priorities
- Success criteria`,
        priority: 10,
        maxTokens: 12000,
      },

      // Task 2: Frontend Performance (parallel)
      {
        id: 'frontend-performance',
        agentName: 'performance-engineer',
        description: 'Optimize frontend performance',
        prompt: `Analyze and optimize frontend performance.

Focus areas:
- Bundle size reduction
- Code splitting
- Lazy loading
- Image optimization
- Caching strategy
- Web Vitals optimization (LCP, FID, CLS)`,
        dependencies: ['performance-baseline'],
        priority: 9,
        maxTokens: 16000,
      },

      // Task 3: Backend Performance (parallel)
      {
        id: 'backend-performance',
        agentName: 'performance-engineer',
        description: 'Optimize backend performance',
        prompt: `Analyze and optimize backend performance.

Focus areas:
- API response times
- Resource utilization
- Concurrency handling
- Caching implementation
- Connection pooling
- Memory management`,
        dependencies: ['performance-baseline'],
        priority: 9,
        maxTokens: 16000,
      },

      // Task 4: Database Optimization
      {
        id: 'database-optimization',
        agentName: 'database-optimizer',
        description: 'Optimize database queries and schema',
        prompt: `Optimize database performance.

Focus areas:
- Query optimization
- Index strategy
- N+1 query elimination
- Connection pooling
- Denormalization opportunities
- Caching layer`,
        dependencies: ['performance-baseline'],
        priority: 9,
        maxTokens: 16000,
      },

      // Task 5: Load Testing
      {
        id: 'load-testing',
        agentName: 'test-automator',
        description: 'Perform load testing and stress testing',
        prompt: `Create and execute load testing scenarios.

Requirements:
- Load test scenarios
- Stress testing
- Spike testing
- Endurance testing
- Performance benchmarks`,
        dependencies: ['frontend-performance', 'backend-performance', 'database-optimization'],
        priority: 8,
        maxTokens: 12000,
      },

      // Task 6: Performance Report
      {
        id: 'performance-report',
        agentName: 'performance-engineer',
        description: 'Compile performance optimization report',
        prompt: `Compile comprehensive performance optimization report.

Requirements:
- Before/after metrics
- Optimization impact analysis
- Remaining bottlenecks
- Scalability assessment
- Future recommendations`,
        dependencies: ['load-testing'],
        priority: 7,
        maxTokens: 12000,
      },
    ];
  },
};

/**
 * Code Review Workflow
 * Comprehensive code review with quality, security, and performance checks
 */
export const codeReviewWorkflow: WorkflowTemplate = {
  id: 'code-review',
  name: 'Code Review',
  description: 'Comprehensive code review covering quality, security, performance, and best practices',
  category: 'quality',
  tags: ['code-review', 'quality', 'best-practices'],
  estimatedDuration: 150,
  complexity: 'moderate',
  buildTasks: (params) => {
    const { prUrl, changedFiles = [], reviewDepth = 'thorough' } = params;

    return [
      // Task 1: Code Quality Review
      {
        id: 'quality-review',
        agentName: 'code-reviewer',
        description: 'Review code quality and best practices',
        prompt: `Review code quality for PR: ${prUrl}

Changed files: ${changedFiles.join(', ')}
Review depth: ${reviewDepth}

Focus areas:
- Code clarity and maintainability
- Design patterns
- SOLID principles
- Code duplication
- Naming conventions`,
        priority: 10,
        maxTokens: 16000,
      },

      // Task 2: Security Review (parallel)
      {
        id: 'security-review',
        agentName: 'security-auditor',
        description: 'Review security implications',
        prompt: `Review security implications of code changes.

Focus areas:
- Vulnerability introduction
- Authentication/authorization changes
- Input validation
- Data exposure risks
- Secure coding practices`,
        dependencies: ['quality-review'],
        priority: 9,
        maxTokens: 12000,
      },

      // Task 3: Performance Review (parallel)
      {
        id: 'performance-review',
        agentName: 'performance-engineer',
        description: 'Review performance impact',
        prompt: `Review performance impact of code changes.

Focus areas:
- Algorithmic complexity
- Database query efficiency
- Memory usage
- Network requests
- Caching opportunities`,
        dependencies: ['quality-review'],
        priority: 9,
        maxTokens: 12000,
      },

      // Task 4: Test Coverage Review
      {
        id: 'test-review',
        agentName: 'test-automator',
        description: 'Review test coverage and quality',
        prompt: `Review test coverage for code changes.

Focus areas:
- Test completeness
- Edge case coverage
- Test quality
- Integration test needs
- Test maintainability`,
        dependencies: ['quality-review'],
        priority: 8,
        maxTokens: 12000,
      },

      // Task 5: Documentation Review
      {
        id: 'documentation-review',
        agentName: 'docs-architect',
        description: 'Review documentation completeness',
        prompt: `Review documentation for code changes.

Focus areas:
- Code comments
- API documentation
- README updates
- Migration guides
- Breaking change documentation`,
        dependencies: ['quality-review'],
        priority: 7,
        maxTokens: 10000,
      },

      // Task 6: Review Summary
      {
        id: 'review-summary',
        agentName: 'code-reviewer',
        description: 'Compile comprehensive review summary',
        prompt: `Compile comprehensive code review summary.

Requirements:
- Overall assessment
- Critical issues
- Suggestions for improvement
- Approval recommendation
- Follow-up items`,
        dependencies: ['security-review', 'performance-review', 'test-review', 'documentation-review'],
        priority: 6,
        maxTokens: 12000,
      },
    ];
  },
};

/**
 * DevOps Workflow
 * Deployment preparation, CI/CD setup, and infrastructure
 */
export const devopsWorkflow: WorkflowTemplate = {
  id: 'devops-setup',
  name: 'DevOps Setup',
  description: 'Complete DevOps setup with CI/CD, monitoring, and deployment automation',
  category: 'devops',
  tags: ['devops', 'ci-cd', 'deployment', 'monitoring'],
  estimatedDuration: 240,
  complexity: 'complex',
  buildTasks: (params) => {
    const { platform = 'aws', cicd = 'github-actions', monitoring = true } = params;

    return [
      // Task 1: Infrastructure Design
      {
        id: 'infrastructure-design',
        agentName: 'cloud-architect',
        description: 'Design cloud infrastructure',
        prompt: `Design cloud infrastructure for deployment.

Platform: ${platform}

Requirements:
- Architecture diagram
- Resource specifications
- Networking setup
- Security groups
- Scaling strategy
- Cost optimization`,
        priority: 10,
        maxTokens: 16000,
      },

      // Task 2: CI/CD Pipeline
      {
        id: 'cicd-setup',
        agentName: 'deployment-engineer',
        description: 'Setup CI/CD pipeline',
        prompt: `Setup CI/CD pipeline using ${cicd}.

Requirements:
- Build automation
- Test integration
- Deployment stages
- Environment management
- Rollback strategy
- Security scanning`,
        dependencies: ['infrastructure-design'],
        priority: 9,
        maxTokens: 16000,
      },

      // Task 3: Monitoring Setup (parallel)
      {
        id: 'monitoring-setup',
        agentName: 'devops-troubleshooter',
        description: 'Setup monitoring and alerting',
        prompt: `Setup comprehensive monitoring and alerting.

Requirements:
- Application monitoring
- Infrastructure monitoring
- Log aggregation
- Alert configuration
- Dashboard creation
- On-call setup`,
        dependencies: ['infrastructure-design'],
        priority: 9,
        maxTokens: 12000,
        context: { enabled: monitoring },
      },

      // Task 4: Database Migration
      {
        id: 'database-migration',
        agentName: 'database-optimizer',
        description: 'Setup database migration strategy',
        prompt: `Setup database migration and backup strategy.

Requirements:
- Migration scripts
- Backup automation
- Disaster recovery
- Data seeding
- Version control
- Rollback procedures`,
        dependencies: ['infrastructure-design'],
        priority: 8,
        maxTokens: 12000,
      },

      // Task 5: Security Hardening
      {
        id: 'security-hardening',
        agentName: 'security-auditor',
        description: 'Implement security hardening',
        prompt: `Implement security hardening for production.

Requirements:
- Secrets management
- Network security
- SSL/TLS configuration
- WAF setup
- DDoS protection
- Compliance checks`,
        dependencies: ['infrastructure-design'],
        priority: 8,
        maxTokens: 12000,
      },

      // Task 6: Deployment Runbook
      {
        id: 'deployment-runbook',
        agentName: 'deployment-engineer',
        description: 'Create deployment runbook',
        prompt: `Create comprehensive deployment runbook.

Requirements:
- Deployment steps
- Verification checklist
- Rollback procedures
- Troubleshooting guide
- Contact information
- Post-deployment tasks`,
        dependencies: ['cicd-setup', 'monitoring-setup', 'database-migration', 'security-hardening'],
        priority: 7,
        maxTokens: 12000,
      },
    ];
  },
};

/**
 * Workflow Registry
 */
export const workflowRegistry = new Map<string, WorkflowTemplate>([
  [fullStackWorkflow.id, fullStackWorkflow],
  [securityAuditWorkflow.id, securityAuditWorkflow],
  [testingWorkflow.id, testingWorkflow],
  [performanceWorkflow.id, performanceWorkflow],
  [codeReviewWorkflow.id, codeReviewWorkflow],
  [devopsWorkflow.id, devopsWorkflow],
]);

/**
 * Get workflow by ID
 */
export function getWorkflow(id: string): WorkflowTemplate | undefined {
  return workflowRegistry.get(id);
}

/**
 * Get all workflows
 */
export function getAllWorkflows(): WorkflowTemplate[] {
  return Array.from(workflowRegistry.values());
}

/**
 * Get workflows by category
 */
export function getWorkflowsByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return getAllWorkflows().filter(w => w.category === category);
}

/**
 * Search workflows by tags
 */
export function searchWorkflows(tags: string[]): WorkflowTemplate[] {
  return getAllWorkflows().filter(w =>
    tags.some(tag => w.tags.includes(tag))
  );
}

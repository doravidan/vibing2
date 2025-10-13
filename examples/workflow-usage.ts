/**
 * Workflow Usage Examples
 *
 * Practical examples of using the multi-agent orchestration system
 */

import { AgentOrchestrator, AgentTask } from '@/lib/agents/orchestrator';
import { getWorkflow, fullStackWorkflow } from '@/lib/agents/workflows';
import {
  executeWorkflow,
  formatWorkflowReport,
  visualizeDependencyGraph,
  buildTask,
  estimateWorkflowCost,
  extractCodeFromResults,
} from '@/lib/agents/workflow-helpers';

/**
 * Example 1: Execute a pre-defined workflow
 */
export async function example1_PreDefinedWorkflow() {
  console.log('Example 1: Full-Stack Development Workflow\n');

  const workflow = getWorkflow('fullstack-dev')!;

  // Build parameters
  const parameters = {
    projectType: 'e-commerce platform',
    features: [
      'product catalog with search and filters',
      'shopping cart with real-time updates',
      'secure checkout with payment integration',
      'order management and tracking',
      'user authentication and profiles',
    ],
    techStack: {
      frontend: 'Next.js 15 + TypeScript + Tailwind CSS',
      backend: 'Node.js + Express + Prisma',
      database: 'PostgreSQL',
      auth: 'NextAuth.js v5',
      payments: 'Stripe',
    },
  };

  // Execute with progress tracking
  const results = await executeWorkflow(workflow, parameters, {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    maxParallelAgents: 3,
    onProgress: (event) => {
      if (event.type === 'task:start') {
        console.log(`⏳ Starting: ${event.task.description}`);
      } else if (event.type === 'task:complete') {
        console.log(`✅ Completed: ${event.result.agentName} (${event.result.duration}ms)`);
      } else if (event.type === 'task:error') {
        console.error(`❌ Error: ${event.error.message}`);
      }
    },
  });

  // Generate report
  const report = formatWorkflowReport(workflow, results);
  console.log('\n' + report);

  // Extract generated code
  const codeFiles = extractCodeFromResults(results);
  console.log(`\nGenerated ${codeFiles.length} code files`);

  return results;
}

/**
 * Example 2: Create and execute a custom workflow
 */
export async function example2_CustomWorkflow() {
  console.log('Example 2: Custom API Development Workflow\n');

  const tasks: AgentTask[] = [
    buildTask(
      'design-api',
      'backend-architect',
      'Design RESTful API architecture',
      `Design a comprehensive RESTful API for a task management system.

Requirements:
- CRUD operations for tasks, projects, and users
- Real-time notifications via WebSockets
- File attachments support
- Advanced filtering and search
- Role-based access control

Deliverables:
- API specification (OpenAPI 3.0)
- Authentication strategy
- Database schema
- Error handling patterns`,
      { priority: 10, maxTokens: 16000 }
    ),

    buildTask(
      'implement-endpoints',
      'backend-architect',
      'Implement API endpoints',
      `Implement the API endpoints using Express.js and TypeScript.

Include:
- Route handlers
- Input validation (Zod)
- Error handling middleware
- Authentication middleware
- Rate limiting`,
      { dependencies: ['design-api'], priority: 9, maxTokens: 20000 }
    ),

    buildTask(
      'add-database',
      'database-optimizer',
      'Implement database layer',
      `Implement the database layer using Prisma.

Include:
- Prisma schema
- Migrations
- Seed data
- Query optimization
- Connection pooling`,
      { dependencies: ['design-api'], priority: 9, maxTokens: 16000 }
    ),

    buildTask(
      'add-tests',
      'test-automator',
      'Create comprehensive tests',
      `Create comprehensive tests for the API.

Include:
- Unit tests for business logic
- Integration tests for endpoints
- E2E tests for user flows
- Performance tests
- Test fixtures and factories`,
      { dependencies: ['implement-endpoints', 'add-database'], priority: 8, maxTokens: 16000 }
    ),

    buildTask(
      'add-docs',
      'docs-architect',
      'Generate API documentation',
      `Generate comprehensive API documentation.

Include:
- API reference from OpenAPI spec
- Getting started guide
- Authentication guide
- Code examples in multiple languages
- Postman collection`,
      { dependencies: ['implement-endpoints'], priority: 7, maxTokens: 12000 }
    ),
  ];

  // Visualize dependency graph
  console.log(visualizeDependencyGraph(tasks));
  console.log('');

  // Estimate cost
  const estimatedCost = estimateWorkflowCost(tasks);
  console.log(`Estimated cost: $${estimatedCost.toFixed(4)}\n`);

  // Create orchestrator
  const orchestrator = new AgentOrchestrator({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    maxParallelAgents: 2,
    contextStrategy: 'shared',
    enableCommunication: true,
  });

  // Add tasks
  orchestrator.addTasks(tasks);

  // Subscribe to events
  orchestrator.on('wave:start', ({ taskIds }) => {
    console.log(`🌊 Wave starting with ${taskIds.length} tasks: ${taskIds.join(', ')}`);
  });

  orchestrator.on('task:complete', (result) => {
    console.log(`✅ ${result.agentName} completed in ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   Tokens: ${result.tokensUsed}, Success: ${result.success}`);
  });

  // Execute
  const results = await orchestrator.execute();

  console.log(`\n✨ Workflow complete! ${results.size} tasks executed.`);

  return results;
}

/**
 * Example 3: Security audit with parallel agents
 */
export async function example3_SecurityAudit() {
  console.log('Example 3: Comprehensive Security Audit\n');

  const workflow = getWorkflow('security-audit')!;

  const parameters = {
    codebasePath: './src',
    scope: 'full',
  };

  const results = await executeWorkflow(workflow, parameters, {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    maxParallelAgents: 4, // More parallel for security checks
    onProgress: (event) => {
      if (event.type === 'task:complete') {
        console.log(`✅ ${event.result.agentName}: ${event.result.outputPreview?.substring(0, 100)}...`);
      }
    },
  });

  // Extract security findings
  const findings: Array<{ severity: string; category: string; description: string }> = [];

  for (const result of results.values()) {
    if (result.success && result.output.includes('VULNERABILITY')) {
      // Parse security findings from output
      const lines = result.output.split('\n');
      for (const line of lines) {
        if (line.includes('CRITICAL') || line.includes('HIGH') || line.includes('MEDIUM')) {
          findings.push({
            severity: line.match(/(CRITICAL|HIGH|MEDIUM|LOW)/)?.[1] || 'UNKNOWN',
            category: result.agentName,
            description: line,
          });
        }
      }
    }
  }

  console.log(`\n🔒 Security Audit Complete`);
  console.log(`Total findings: ${findings.length}`);
  console.log(`Critical: ${findings.filter(f => f.severity === 'CRITICAL').length}`);
  console.log(`High: ${findings.filter(f => f.severity === 'HIGH').length}`);
  console.log(`Medium: ${findings.filter(f => f.severity === 'MEDIUM').length}`);

  return results;
}

/**
 * Example 4: Performance optimization workflow
 */
export async function example4_PerformanceOptimization() {
  console.log('Example 4: Performance Optimization Workflow\n');

  const workflow = getWorkflow('performance-optimization')!;

  const parameters = {
    currentBaseline: {
      lcp: 5.2, // Largest Contentful Paint
      fid: 250, // First Input Delay
      cls: 0.3, // Cumulative Layout Shift
      apiResponseTime: 800,
      bundleSize: 2500, // KB
    },
    targetMetrics: {
      lcp: 2.5,
      fid: 100,
      cls: 0.1,
      apiResponseTime: 200,
      bundleSize: 1000,
    },
  };

  const results = await executeWorkflow(workflow, parameters, {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    maxParallelAgents: 3,
    onProgress: (event) => {
      if (event.type === 'task:start') {
        console.log(`🔧 Optimizing: ${event.task.description}`);
      }
    },
  });

  // Extract performance improvements
  const improvements: Array<{ metric: string; before: number; after: number; improvement: string }> = [];

  console.log('\n📊 Performance Improvements:');
  console.log('━'.repeat(60));

  // This would be extracted from actual results
  // For demo purposes, showing structure
  improvements.push(
    { metric: 'LCP', before: 5.2, after: 2.3, improvement: '-55.8%' },
    { metric: 'FID', before: 250, after: 95, improvement: '-62.0%' },
    { metric: 'CLS', before: 0.3, after: 0.08, improvement: '-73.3%' },
    { metric: 'API Response', before: 800, after: 180, improvement: '-77.5%' },
    { metric: 'Bundle Size', before: 2500, after: 950, improvement: '-62.0%' }
  );

  for (const improvement of improvements) {
    console.log(`${improvement.metric.padEnd(20)} ${improvement.before.toString().padStart(8)} → ${improvement.after.toString().padStart(8)} (${improvement.improvement})`);
  }

  return results;
}

/**
 * Example 5: CI/CD Integration - Auto Code Review
 */
export async function example5_AutoCodeReview(prNumber: number, changedFiles: string[]) {
  console.log(`Example 5: Automated Code Review for PR #${prNumber}\n`);

  const workflow = getWorkflow('code-review')!;

  const parameters = {
    prUrl: `https://github.com/user/repo/pull/${prNumber}`,
    changedFiles,
    reviewDepth: 'thorough',
  };

  const results = await executeWorkflow(workflow, parameters, {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    maxParallelAgents: 5, // Parallel review aspects
  });

  // Format as GitHub comment
  const reviewSummary = formatWorkflowReport(workflow, results);

  console.log('\n📝 Review Summary (ready for GitHub comment):');
  console.log('━'.repeat(60));
  console.log(reviewSummary);

  return {
    results,
    prNumber,
    reviewSummary,
  };
}

/**
 * Example 6: Agent communication demonstration
 */
export async function example6_AgentCommunication() {
  console.log('Example 6: Agent-to-Agent Communication\n');

  const orchestrator = new AgentOrchestrator({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    maxParallelAgents: 2,
    enableCommunication: true, // Enable message bus
  });

  const messageBus = orchestrator.getMessageBus();

  // Subscribe to messages
  messageBus.subscribe('backend-architect', (message) => {
    console.log(`📨 Backend received message from ${message.from}:`, message.content);
  });

  messageBus.subscribe('frontend-developer', (message) => {
    console.log(`📨 Frontend received message from ${message.from}:`, message.content);
  });

  messageBus.on('broadcast', (message) => {
    console.log(`📢 Broadcast from ${message.from}:`, message.content);
  });

  const tasks: AgentTask[] = [
    buildTask(
      'backend-design',
      'backend-architect',
      'Design backend API',
      `Design a user authentication API.

When you have the API spec, use:
<AGENT_MESSAGE to="frontend-developer">
Here is the auth API spec: [spec details]
</AGENT_MESSAGE>`,
      { priority: 10 }
    ),

    buildTask(
      'frontend-design',
      'frontend-developer',
      'Design frontend components',
      `Design authentication UI components.

Wait for the API spec from backend-architect, then design accordingly.`,
      { dependencies: ['backend-design'], priority: 9 }
    ),
  ];

  orchestrator.addTasks(tasks);

  const results = await orchestrator.execute();

  console.log('\n✅ Communication workflow complete!');
  console.log(`Message history: ${messageBus.getHistory().length} messages`);

  return results;
}

/**
 * Example 7: Workflow chaining
 */
export async function example7_WorkflowChaining() {
  console.log('Example 7: Chained Workflows\n');

  // Step 1: Development
  console.log('Step 1: Full-Stack Development');
  const devResults = await executeWorkflow(
    fullStackWorkflow,
    {
      projectType: 'blog platform',
      features: ['markdown editor', 'comments', 'search'],
      techStack: { frontend: 'Next.js', backend: 'Node.js', database: 'PostgreSQL' },
    },
    { apiKey: process.env.ANTHROPIC_API_KEY! }
  );

  // Step 2: Testing (using dev results as context)
  console.log('\nStep 2: Testing Suite');
  const testingWorkflow = getWorkflow('testing-suite')!;
  const testResults = await executeWorkflow(
    testingWorkflow,
    {
      testScope: 'full',
      framework: 'jest',
      coverage: 80,
    },
    { apiKey: process.env.ANTHROPIC_API_KEY! }
  );

  // Step 3: Security Audit
  console.log('\nStep 3: Security Audit');
  const securityWorkflow = getWorkflow('security-audit')!;
  const securityResults = await executeWorkflow(
    securityWorkflow,
    { codebasePath: './src', scope: 'full' },
    { apiKey: process.env.ANTHROPIC_API_KEY! }
  );

  console.log('\n🎉 Complete development pipeline finished!');
  console.log(`Development tasks: ${devResults.size}`);
  console.log(`Testing tasks: ${testResults.size}`);
  console.log(`Security tasks: ${securityResults.size}`);

  return {
    development: devResults,
    testing: testResults,
    security: securityResults,
  };
}

/**
 * Main function to run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Multi-Agent Orchestration Examples\n');
  console.log('═'.repeat(60));

  try {
    // Example 1: Pre-defined workflow
    await example1_PreDefinedWorkflow();
    console.log('\n' + '═'.repeat(60) + '\n');

    // Example 2: Custom workflow
    await example2_CustomWorkflow();
    console.log('\n' + '═'.repeat(60) + '\n');

    // Example 3: Security audit
    await example3_SecurityAudit();
    console.log('\n' + '═'.repeat(60) + '\n');

    // Example 4: Performance optimization
    await example4_PerformanceOptimization();
    console.log('\n' + '═'.repeat(60) + '\n');

    // Example 5: Code review
    await example5_AutoCodeReview(123, ['src/auth.ts', 'src/api/users.ts']);
    console.log('\n' + '═'.repeat(60) + '\n');

    // Example 6: Agent communication
    await example6_AgentCommunication();
    console.log('\n' + '═'.repeat(60) + '\n');

    // Example 7: Workflow chaining
    await example7_WorkflowChaining();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runAllExamples();
}

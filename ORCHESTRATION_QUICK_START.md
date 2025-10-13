# Multi-Agent Orchestration - Quick Start Guide

Get started with the multi-agent orchestration system in 5 minutes.

## Installation

The orchestration system is already integrated into vibing2. No additional installation needed!

## Quick Examples

### 1. Execute a Pre-Defined Workflow (Browser)

```javascript
// Simple full-stack development workflow
const response = await fetch('/api/workflows/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workflowId: 'fullstack-dev',
    parameters: {
      projectType: 'todo app',
      features: ['create tasks', 'edit tasks', 'mark complete'],
      techStack: {
        frontend: 'React',
        backend: 'Express',
        database: 'SQLite'
      }
    }
  })
});

// Stream progress
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  console.log(text);
}
```

### 2. Create a Custom Workflow (Node.js)

```typescript
import { AgentOrchestrator, buildTask } from '@/lib/agents/orchestrator';

const orchestrator = new AgentOrchestrator({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxParallelAgents: 3,
});

// Add tasks
orchestrator.addTasks([
  buildTask('design', 'backend-architect', 'Design API', 'Design a REST API for users'),
  buildTask('implement', 'backend-architect', 'Implement API', 'Implement the API', {
    dependencies: ['design']
  }),
  buildTask('test', 'test-automator', 'Test API', 'Create tests', {
    dependencies: ['implement']
  })
]);

// Execute
const results = await orchestrator.execute();
console.log(`Done! ${results.size} tasks completed`);
```

### 3. Run a Security Audit

```bash
curl -X POST http://localhost:3000/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "security-audit",
    "parameters": {
      "codebasePath": "./src",
      "scope": "full"
    }
  }'
```

## Available Workflows

| ID | Name | Duration | Best For |
|----|------|----------|----------|
| `fullstack-dev` | Full-Stack Development | 5 min | Building complete apps |
| `security-audit` | Security Audit | 4 min | Security scanning |
| `testing-suite` | Testing Suite | 3 min | Creating tests |
| `performance-optimization` | Performance Optimization | 3.5 min | Speed improvements |
| `code-review` | Code Review | 2.5 min | PR reviews |
| `devops-setup` | DevOps Setup | 4 min | Infrastructure setup |

## List All Workflows

```bash
curl http://localhost:3000/api/workflows/list
```

## Configuration Options

```typescript
{
  maxParallelAgents: 3,        // 1-10 concurrent agents
  contextStrategy: 'shared',   // 'shared' | 'isolated' | 'hierarchical'
  enableCommunication: true,   // Enable agent-to-agent messages
  globalTimeout: 300000,       // 5 minutes
  pruningThreshold: 150000     // Token threshold
}
```

## Event Types (SSE)

- `workflow:start` - Workflow begins
- `task:start` - Task begins
- `agent:invoke` - Agent called
- `task:complete` - Task done
- `task:error` - Task failed
- `workflow:complete` - Workflow done
- `workflow:results` - Full results

## Common Patterns

### Pattern 1: Progress Tracking

```typescript
orchestrator.on('task:start', (task) => {
  console.log(`Starting: ${task.description}`);
});

orchestrator.on('task:complete', (result) => {
  console.log(`✓ ${result.agentName} (${result.duration}ms)`);
});
```

### Pattern 2: Error Handling

```typescript
orchestrator.on('task:error', ({ task, error }) => {
  console.error(`Failed: ${task.id}`, error);
});

const results = await orchestrator.execute();
const failed = Array.from(results.values()).filter(r => !r.success);

if (failed.length > 0) {
  console.log(`${failed.length} tasks failed`);
}
```

### Pattern 3: Agent Communication

```typescript
const messageBus = orchestrator.getMessageBus();

messageBus.subscribe('backend-architect', (message) => {
  console.log('Backend received:', message.content);
});

messageBus.broadcast('all-agents', {
  alert: 'Important update'
});
```

## Helper Functions

### Execute Workflow

```typescript
import { executeWorkflow } from '@/lib/agents/workflow-helpers';

const results = await executeWorkflow(
  workflow,
  parameters,
  {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    onProgress: (event) => console.log(event)
  }
);
```

### Format Report

```typescript
import { formatWorkflowReport } from '@/lib/agents/workflow-helpers';

const markdown = formatWorkflowReport(workflow, results);
console.log(markdown);
```

### Visualize Dependencies

```typescript
import { visualizeDependencyGraph } from '@/lib/agents/workflow-helpers';

console.log(visualizeDependencyGraph(tasks));
```

### Estimate Cost

```typescript
import { estimateWorkflowCost } from '@/lib/agents/workflow-helpers';

const cost = estimateWorkflowCost(tasks);
console.log(`Estimated: $${cost.toFixed(4)}`);
```

## Troubleshooting

### Issue: Rate limit exceeded

**Solution:** Reduce concurrent agents

```typescript
config: { maxParallelAgents: 2 }
```

### Issue: Circular dependency

**Solution:** Check task dependencies

```typescript
// Bad:
A → B → C → A  ❌

// Good:
A → B → C     ✓
```

### Issue: Context overflow

**Solution:** Enable aggressive pruning

```typescript
config: {
  contextStrategy: 'isolated',
  pruningThreshold: 100000
}
```

## Best Practices

✅ **DO:**
- Use parallel execution for independent tasks
- Set realistic priorities
- Provide clear prompts
- Monitor token usage

❌ **DON'T:**
- Create circular dependencies
- Make tasks too granular
- Use Opus for all tasks
- Ignore error events

## Examples Directory

See `/Users/I347316/dev/vibing2/examples/workflow-usage.ts` for 7 complete examples:

1. Pre-defined workflow execution
2. Custom workflow creation
3. Security audit with parallel agents
4. Performance optimization workflow
5. Automated code review
6. Agent-to-agent communication
7. Workflow chaining

## Documentation

- **Full Documentation:** [MULTI_AGENT_ORCHESTRATION.md](./MULTI_AGENT_ORCHESTRATION.md)
- **Implementation Report:** [PHASE_2_IMPLEMENTATION_REPORT.md](./PHASE_2_IMPLEMENTATION_REPORT.md)
- **Examples:** [examples/workflow-usage.ts](./examples/workflow-usage.ts)

## Support

Need help? Check:
- Documentation (above links)
- GitHub Issues
- Example code

---

**Ready to orchestrate?** Start with a pre-defined workflow and customize from there!

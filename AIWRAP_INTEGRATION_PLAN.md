# QuickVibe 2.0 + AiWrap Terminal Integration Plan

## Executive Summary

This plan integrates **AiWrap Terminal** capabilities into QuickVibe 2.0's existing web-based collaborative AI platform. Instead of building a separate Tauri desktop app, we'll **embed terminal execution, planning, and approval flows directly into the web interface**, leveraging our existing:

- ✅ Next.js 15 + React 19 web app
- ✅ Real-time collaboration (Socket.io)
- ✅ Multi-user projects with roles
- ✅ PFC protocol for token efficiency
- ✅ Database (Prisma + SQLite)
- ✅ AI agent system (Anthropic Claude)

## Key Adaptations from Original AiWrap Spec

| Original AiWrap | QuickVibe 2.0 Adaptation |
|----------------|--------------------------|
| Tauri desktop app | **Web-based interface** in existing Next.js app |
| Separate service process | **Integrated API routes** + WebSocket handlers |
| Local-only, macOS-first | **Web-first, cross-platform** (runs in browser) |
| SQLite for sessions | **Existing Prisma DB** with new terminal tables |
| Plugin marketplace | **Built-in workflow templates** in project types |
| SSH execution | **Web-based terminal emulator** (xterm.js) |
| PTY via node-pty | **Server-side command execution** with streaming |

## Architecture Overview

```
QuickVibe 2.0 (Existing)          AiWrap Terminal (New)
├─ app/                           ├─ app/terminal/
│  ├─ chat/page.tsx              │  └─ page.tsx (new terminal UI)
│  ├─ projects/page.tsx          ├─ app/api/terminal/
│  └─ api/                       │  ├─ plan/route.ts
│     ├─ agent/stream/           │  ├─ execute/route.ts
│     └─ collab/                 │  ├─ approve/route.ts
├─ components/                    │  └─ session/route.ts
│  ├─ PFCMetrics.tsx            ├─ components/
│  ├─ PresenceIndicator.tsx     │  ├─ TerminalView.tsx
│  └─ InviteModal.tsx           │  ├─ CommandApproval.tsx
├─ lib/                          │  ├─ DiffViewer.tsx
│  ├─ pfc-tracker.ts            │  └─ RiskIndicator.tsx
│  ├─ db.ts                     ├─ lib/
│  └─ socket-server.ts          │  ├─ terminal-executor.ts
├─ prisma/schema.prisma         │  ├─ risk-validator.ts
└─ server.js (Socket.io)        │  ├─ diff-generator.ts
                                 │  └─ workflow-engine.ts
                                 └─ prisma/schema.prisma (extend)
```

## Phase 1: Core Terminal Infrastructure (Week 1)

### 1.1 Database Schema Extensions

**New Prisma Models:**

```prisma
model TerminalSession {
  id            String    @id @default(cuid())
  projectId     String
  project       Project   @relation(...)
  userId        String
  user          User      @relation(...)

  workingDir    String    @default(".")
  shellType     String    @default("zsh")
  isActive      Boolean   @default(true)

  createdAt     DateTime  @default(now())
  closedAt      DateTime?

  commands      TerminalCommand[]
  workflows     WorkflowExecution[]
}

model TerminalCommand {
  id            String    @id @default(cuid())
  sessionId     String
  session       TerminalSession @relation(...)

  instruction   String    // User's natural language request
  plan          String    // AI-generated plan JSON
  commands      String    // JSON array of shell commands
  diffs         String?   // JSON array of file diffs
  riskLevel     String    // low | medium | high

  status        String    // pending | approved | rejected | executed | failed
  approvedBy    String?
  approvedAt    DateTime?

  exitCode      Int?
  stdout        String?
  stderr        String?
  duration      Int?      // milliseconds

  createdAt     DateTime  @default(now())
  executedAt    DateTime?
}

model Workflow {
  id            String    @id @default(cuid())
  name          String
  description   String?
  category      String    // git | docker | deploy | setup | custom

  template      String    // YAML workflow definition
  parameters    String    // JSON schema for params

  isPublic      Boolean   @default(false)
  createdBy     String
  creator       User      @relation(...)

  executions    WorkflowExecution[]
}

model WorkflowExecution {
  id            String    @id @default(cuid())
  workflowId    String
  workflow      Workflow  @relation(...)
  sessionId     String
  session       TerminalSession @relation(...)

  params        String    // JSON actual parameters
  status        String    // running | completed | failed

  createdAt     DateTime  @default(now())
  completedAt   DateTime?
}
```

**Tasks:**
- [ ] T1.1.1: Add terminal models to schema.prisma (30min)
- [ ] T1.1.2: Run migration `prisma migrate dev --name add_terminal` (5min)
- [ ] T1.1.3: Update Prisma client types (5min)

### 1.2 Risk Validation System

**File: `lib/risk-validator.ts`**

```typescript
export interface RiskPolicy {
  id: string;
  pattern: RegExp;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  requiresDoubleConfirm: boolean;
}

const BUILTIN_POLICIES: RiskPolicy[] = [
  {
    id: 'rm-rf-root',
    pattern: /rm\s+-rf\s+\/(\*|$)/,
    riskLevel: 'critical',
    message: 'BLOCKED: Attempting to delete root filesystem',
    requiresDoubleConfirm: false, // Just block it
  },
  {
    id: 'curl-pipe-sh',
    pattern: /curl.*\|\s*(ba)?sh/,
    riskLevel: 'high',
    message: 'Executing remote script without verification',
    requiresDoubleConfirm: true,
  },
  // ... more policies
];

export function validateCommands(commands: string[]): {
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  violations: RiskPolicy[];
  requiresDoubleConfirm: boolean;
} {
  // Implementation
}
```

**Tasks:**
- [ ] T1.2.1: Create risk-validator.ts with 10+ policies (2h)
- [ ] T1.2.2: Add unit tests for risk validation (1h)
- [ ] T1.2.3: Create risk policy UI settings page (2h)

### 1.3 Terminal Executor Service

**File: `lib/terminal-executor.ts`**

```typescript
import { spawn } from 'child_process';
import * as pty from 'node-pty';

export class TerminalExecutor {
  async executePlan(plan: {
    commands: string[];
    workingDir: string;
    env?: Record<string, string>;
  }): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    duration: number;
  }> {
    // Use PTY for interactive shell
    const shell = pty.spawn('/bin/zsh', ['-l'], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: plan.workingDir,
      env: { ...process.env, ...plan.env },
    });

    // Stream output via WebSocket
    // Handle exit codes
    // Redact secrets in logs
  }
}
```

**Tasks:**
- [ ] T1.3.1: Install node-pty dependency (10min)
- [ ] T1.3.2: Implement TerminalExecutor class (3h)
- [ ] T1.3.3: Add secret redaction (1h)
- [ ] T1.3.4: WebSocket streaming integration (2h)

## Phase 2: AI Planning & Diff Generation (Week 2)

### 2.1 Terminal Planner Agent

**File: `lib/terminal-planner.ts`**

Extends existing agent system with terminal-specific prompts:

```typescript
export async function planTerminalAction(instruction: string, context: {
  workingDir: string;
  recentCommands: string[];
  gitStatus?: string;
  fileTree?: string[];
}): Promise<{
  summary: string;
  rationale: string;
  steps: Array<{ title: string; details: string }>;
  commands: string[];
  diffs?: Array<{ file: string; diff: string }>;
  estimatedRisk: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
}> {
  // Call Claude with terminal planning system prompt
}
```

**System Prompt Template:**
```
You are a terminal automation planner for QuickVibe 2.0.

Given a user instruction, generate a safe, executable plan with:
1. Shell commands (zsh syntax)
2. File diffs (unified format) if file changes needed
3. Risk assessment
4. Step-by-step explanation

Current context:
- Working directory: {workingDir}
- Recent commands: {recentCommands}
- Git status: {gitStatus}

Output JSON only:
{
  "summary": "...",
  "rationale": "...",
  "steps": [...],
  "commands": [...],
  "diffs": [...],
  "estimatedRisk": "low",
  "requiresConfirmation": true
}
```

**Tasks:**
- [ ] T2.1.1: Create terminal planner with Claude integration (4h)
- [ ] T2.1.2: Add context gathering (git, fs, env) (2h)
- [ ] T2.1.3: Implement structured JSON parsing (1h)

### 2.2 Diff Generation & Application

**File: `lib/diff-generator.ts`**

```typescript
export function generateUnifiedDiff(
  filePath: string,
  original: string,
  modified: string
): string {
  // Generate unified diff format
}

export async function applyDiff(
  filePath: string,
  diff: string
): Promise<{ success: boolean; error?: string }> {
  // Apply patch to file
  // Validate syntax after changes
}
```

**Tasks:**
- [ ] T2.2.1: Implement diff generation (2h)
- [ ] T2.2.2: Add diff application with rollback (2h)
- [ ] T2.2.3: Syntax validation post-patch (1h)

## Phase 3: Web UI Components (Week 3)

### 3.1 Terminal Page

**File: `app/terminal/page.tsx`**

```tsx
'use client';

export default function TerminalPage() {
  const [instruction, setInstruction] = useState('');
  const [currentPlan, setCurrentPlan] = useState(null);
  const [executionLog, setExecutionLog] = useState([]);

  return (
    <div className="terminal-layout">
      <InstructionInput
        value={instruction}
        onSubmit={handleGeneratePlan}
      />

      {currentPlan && (
        <CommandApproval
          plan={currentPlan}
          onApprove={handleExecute}
          onReject={handleReject}
        />
      )}

      <TerminalView
        log={executionLog}
        isRunning={isExecuting}
      />

      <WorkflowSidebar />
    </div>
  );
}
```

**Tasks:**
- [ ] T3.1.1: Create terminal page layout (3h)
- [ ] T3.1.2: Integrate xterm.js for terminal display (2h)
- [ ] T3.1.3: Add keyboard shortcuts (⌘K for command palette) (2h)

### 3.2 Command Approval UI

**File: `components/CommandApproval.tsx`**

```tsx
export default function CommandApproval({ plan, onApprove, onReject }) {
  return (
    <div className="approval-card">
      <RiskIndicator level={plan.estimatedRisk} />

      <div className="plan-summary">
        <h3>{plan.summary}</h3>
        <p>{plan.rationale}</p>
      </div>

      <div className="steps">
        {plan.steps.map(step => (
          <StepCard key={step.title} {...step} />
        ))}
      </div>

      <div className="commands-preview">
        {plan.commands.map((cmd, i) => (
          <CodeBlock key={i} language="bash">{cmd}</CodeBlock>
        ))}
      </div>

      {plan.diffs && (
        <DiffViewer diffs={plan.diffs} />
      )}

      <div className="actions">
        <button onClick={onReject}>Reject</button>
        <button onClick={onApprove}>Approve & Execute</button>
      </div>
    </div>
  );
}
```

**Tasks:**
- [ ] T3.2.1: Build CommandApproval component (3h)
- [ ] T3.2.2: Create RiskIndicator with color coding (1h)
- [ ] T3.2.3: Add Monaco Editor for diff viewing (2h)

### 3.3 Workflow Templates

**File: `components/WorkflowSidebar.tsx`**

Pre-built workflows for common tasks:

```typescript
const BUILTIN_WORKFLOWS = [
  {
    name: 'Git: Initialize Repository',
    category: 'git',
    template: `
      - git init
      - git add .
      - git commit -m "Initial commit"
    `,
  },
  {
    name: 'Docker: Containerize App',
    category: 'docker',
    template: `
      - Create Dockerfile
      - Create docker-compose.yml
      - docker build -t {{appName}}:latest .
    `,
  },
  // ... more templates
];
```

**Tasks:**
- [ ] T3.3.1: Create WorkflowSidebar (2h)
- [ ] T3.3.2: Add 10 built-in workflows (3h)
- [ ] T3.3.3: Workflow parameter input UI (2h)

## Phase 4: API Routes & Real-time Integration (Week 4)

### 4.1 Terminal API Endpoints

**Files:**
- `app/api/terminal/plan/route.ts` - Generate execution plan
- `app/api/terminal/execute/route.ts` - Execute approved commands
- `app/api/terminal/approve/route.ts` - Approve/reject plan
- `app/api/terminal/session/route.ts` - Session management

**Tasks:**
- [ ] T4.1.1: Create plan API (2h)
- [ ] T4.1.2: Create execute API with streaming (3h)
- [ ] T4.1.3: Add session CRUD APIs (2h)
- [ ] T4.1.4: Integrate with existing auth (1h)

### 4.2 WebSocket Terminal Streaming

**Extend `server.js`:**

```javascript
// Add terminal namespace
io.of('/terminal').on('connection', (socket) => {
  socket.on('execute-command', async ({ sessionId, commandId }) => {
    const executor = new TerminalExecutor();

    const stream = executor.execute(command);
    stream.on('data', (chunk) => {
      socket.emit('terminal-output', {
        sessionId,
        commandId,
        data: chunk
      });
    });
  });
});
```

**Tasks:**
- [ ] T4.2.1: Add terminal WebSocket namespace (2h)
- [ ] T4.2.2: Stream stdout/stderr in real-time (2h)
- [ ] T4.2.3: Handle terminal resize events (1h)

## Phase 5: Collaboration Features (Week 5)

### 5.1 Multi-User Terminal Sessions

Enable collaborators to:
- Watch terminal execution in real-time
- Approve/reject commands (based on role)
- View execution history

**Tasks:**
- [ ] T5.1.1: Add terminal permissions to ProjectCollaborator (1h)
- [ ] T5.1.2: Broadcast terminal output to all project members (2h)
- [ ] T5.1.3: Show "User X is executing command" presence (1h)

### 5.2 Session Export/Import

**File: `lib/session-exporter.ts`**

```typescript
export function exportSession(sessionId: string): {
  version: '1.0';
  session: TerminalSession;
  commands: TerminalCommand[];
  metadata: {
    exportedAt: string;
    exportedBy: string;
  };
} {
  // Export to .aiwrap.json
}

export async function importSession(data: any): Promise<string> {
  // Import and replay
}
```

**Tasks:**
- [ ] T5.2.1: Implement session export (2h)
- [ ] T5.2.2: Add replay with variable substitution (3h)
- [ ] T5.2.3: Create import UI (2h)

## Phase 6: Testing & QA (Week 6)

### 6.1 Unit Tests

**Files:**
- `lib/__tests__/risk-validator.test.ts`
- `lib/__tests__/terminal-executor.test.ts`
- `lib/__tests__/diff-generator.test.ts`

**Tasks:**
- [ ] T6.1.1: Write 20+ risk validation tests (3h)
- [ ] T6.1.2: Mock terminal execution tests (2h)
- [ ] T6.1.3: Diff generation/application tests (2h)

### 6.2 E2E Tests (Playwright)

**Acceptance Tests from AiWrap Spec:**

1. ✅ Create Vite React app via natural language
2. ✅ Dockerize Node.js app with generated Dockerfile
3. ✅ Block `rm -rf /*` with error message
4. ✅ Export & replay session with env vars
5. ✅ Run workflow with parameters

**Tasks:**
- [ ] T6.2.1: Set up Playwright (1h)
- [ ] T6.2.2: Write 5 acceptance tests (4h)
- [ ] T6.2.3: Add CI workflow (1h)

## Phase 7: Integration & Polish (Week 7)

### 7.1 Platform Integration

**Tasks:**
- [ ] T7.1.1: Add "Terminal" tab to project page (2h)
- [ ] T7.1.2: Feature flag `terminal_enable` by plan (1h)
- [ ] T7.1.3: Add terminal usage to billing tracker (2h)
- [ ] T7.1.4: Settings page for risk policies (2h)

### 7.2 Documentation

**Files:**
- `TERMINAL_GUIDE.md` - User guide
- Update `COLLABORATION_GUIDE.md` - Add terminal collab
- Update `README.md` - Feature list

**Tasks:**
- [ ] T7.2.1: Write terminal user guide (3h)
- [ ] T7.2.2: Create video demo (2h)
- [ ] T7.2.3: Update all docs (1h)

## Rollout Strategy

### Internal Beta (Week 8)
- Enable for FREE plan users (1K token limit)
- Restrict to safe commands only
- Collect feedback

### Private Preview (Week 9-10)
- Enable for PRO plan (full features)
- Add SSH execution
- Workflow marketplace

### Public GA (Week 11-12)
- Full launch with docs
- Blog post announcement
- Feature demos

## Success Metrics

- [ ] ≥ 80% test coverage
- [ ] ≥ 5 Playwright tests passing
- [ ] Zero critical risk policy bypasses
- [ ] Terminal response time < 2s
- [ ] Session export/import working
- [ ] 10+ built-in workflows

## Dependencies & Prerequisites

**New npm packages:**
```json
{
  "node-pty": "^1.0.0",
  "xterm": "^5.3.0",
  "xterm-addon-fit": "^0.8.0",
  "diff": "^5.1.0",
  "monaco-editor": "^0.44.0"
}
```

**Environment:**
- macOS Monterey+ (for local dev)
- Node.js 20+
- zsh shell
- Git installed

## Risk Mitigation

1. **Security**: All commands validated before execution
2. **Rollback**: Feature flag can disable instantly
3. **Testing**: Comprehensive E2E coverage
4. **Monitoring**: Log all executions for audit
5. **User Safety**: Double confirmation for high-risk actions

## Open Questions

1. Should we support Windows/Linux shells? (Defer to v2)
2. Plugin marketplace vs built-in workflows? (Start with built-in)
3. Local file access restrictions? (Sandbox to project root)
4. Rate limiting terminal executions? (Yes, 10/min for FREE)

---

**Ready to proceed? Reply with "APPROVED" to start Phase 1.**

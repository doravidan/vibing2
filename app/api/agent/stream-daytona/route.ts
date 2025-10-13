import Anthropic from '@anthropic-ai/sdk';
import { createSandbox, writeFileToSandbox, deleteSandbox } from '@/lib/daytona-client';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { auth } from '@/auth';
import { checkRateLimit, aiRateLimiter } from '@/lib/rate-limit';
import { logger, logAIGeneration, logError } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  const startTime = Date.now();
  const encoder = new TextEncoder();
  let sandbox: any = null;

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Apply rate limiting
  const rateLimitResult = await checkRateLimit(req, aiRateLimiter, session.user.id);
  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded', {
      userId: session.user.id,
      endpoint: '/api/agent/stream-daytona',
    });
    return rateLimitResult.response!;
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { messages, projectType, agents, projectName } = await req.json();

        // Check if API keys are configured
        if (!process.env.ANTHROPIC_API_KEY) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                data: { message: 'Anthropic API key not configured' },
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        if (!process.env.DAYTONA_API_KEY) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                data: { message: 'Daytona API key not configured' },
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        // Progress: Creating sandbox
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              data: {
                status: 'creating',
                message: '🏗️ Creating secure sandbox environment...',
              },
            })}\n\n`
          )
        );

        // Create Daytona sandbox
        sandbox = await createSandbox({
          language: 'javascript',
          autoStopInterval: 3600, // 1 hour
        });

        const sandboxId = sandbox.id;

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              data: {
                status: 'initializing',
                message: `✅ Sandbox created: ${sandboxId}`,
                sandboxId,
              },
            })}\n\n`
          )
        );

        // Progress: Generating code
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              data: {
                status: 'generating',
                message: '🤖 Generating code with Claude AI...',
              },
            })}\n\n`
          )
        );

        // Initialize Anthropic client
        const client = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Build agent context
        const agentContext =
          agents && agents.length > 0
            ? `\n🤖 Active Specialist Agents: ${agents.join(', ')}`
            : '';

        const projectContext = projectType
          ? `\n📋 Project Type: ${projectType}`
          : '';

        // Transform messages to Anthropic format
        const anthropicMessages = messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));

        // Load PFC super meta prompt
        const pfcSuperMetaPath = join(process.cwd(), '.claude', 'pfc_adp_super_meta.md');
        let pfcMetaPrompt = '';
        try {
          pfcMetaPrompt = `# ADAPTIVE EFFICIENCY PROTOCOL

You operate on three core principles that scale from simple to complex tasks:

## 1. LAZY LOADING
Read the minimum needed to be useful. For code tasks:
- Start with file trees, signatures, and error messages
- Read implementations only when essential
- Prefer targeted searches over full-file dumps
- Ask "can I solve this without reading X?" before reading X

## 2. PROGRESSIVE DISCLOSURE  
Reveal complexity gradually:
- State what you're checking and why (~estimate if substantial)
- Show your reasoning before detailed solutions
- Mark uncertainties explicitly; validate with tests
- Build on evidence, not assumptions

## 3. ADAPTIVE STRUCTURE
Match response format to task complexity:

**Simple tasks** → Direct answer
**Moderate tasks** → Brief analysis + solution + validation
**Complex tasks** → Structured breakdown with clear sections

---

## TASK PATTERNS (Choose What Fits)

### Bug Fixes
1. Locate error/failing test (minimal context)
2. Read only error site + relevant test
3. Implement targeted fix
4. Verify with test/validation plan

### New Features  
1. Identify integration points (signatures/interfaces)
2. Read minimal examples of existing patterns
3. Implement following project conventions
4. Suggest tests for edge cases

### Refactoring
1. Map structure (tree/module organization)
2. Read signatures to understand contracts
3. Propose changes with clear before/after
4. Flag breaking changes and migration needs

### Analysis/Research
1. Gather relevant pointers (files, docs, specs)
2. Extract key information (summarize, don't dump)
3. Synthesize findings with citations
4. Identify gaps and recommend next steps

---

## SAFETY & QUALITY GATES

**For all tasks:**
- Evidence-based claims (cite specific files/lines/sources)
- Mark assumptions and uncertainties clearly
- Test-driven validation when applicable

**For risky actions** (deletions, deployments, external calls):
- Explicit user confirmation required
- Provide dry-run previews
- Document rollback procedures

**When context grows large:**
- Acknowledge constraint naturally
- Prioritize remaining scope
- Suggest checkpoints if needed

---

## OUTPUT PRINCIPLES

### ✅ Do:
- Use natural language for flow
- Bold key terms for scannability
- Structure scales with complexity
- Show reasoning concisely
- Provide actionable next steps

### ❌ Avoid:
- Verbose boilerplate every response
- Token counting theater
- Rigid section formats for simple tasks
- Reading entire files into chat
- Fake function calls or pseudo-code

---

## EFFICIENCY MINDSET

**Measure success by:**
- Correctness and usefulness
- Time to resolution
- Clarity of communication
- *Appropriate* context usage (not minimized at all costs)

**Remember:**
- A 100-token efficient answer that's wrong is worse than a 500-token correct one
- Context is precious but not scarce - use what you need
- Efficiency is a means to speed and clarity, not an end in itself

---

## ACTIVATION

When starting a task, briefly:
1. Classify type and complexity
2. State your approach (what you'll check/read)
3. Proceed naturally without ceremony

**Example:**
> "This looks like a pagination bug. I'll check the error message, scan the orders API for pagination logic, and examine any failing tests - should be under 200 tokens of context to diagnose."

Then just do it. No emoji headers, no 10-agent theatrical performance.

---

## SPECIAL CONTEXTS

### For Claude Code CLI
- You have bash/grep/sed access - use them surgically
- File operations are real - be precise
- Git operations possible - verify before destructive changes

### For Web/Chat Interface  
- No direct file access - work with provided code
- Web search available for current info
- Focus on analysis and generation over file manipulation

### For API/Programmatic Use
- Structured outputs when specified
- Tool use as configured
- Respect provided schemas and constraints

---

## SELF-CHECK (Internal)

Before each response, ask:
- Am I reading more than needed?
- Is my format appropriate for this complexity?
- Did I cite evidence for non-trivial claims?
- Are safety considerations addressed?
- Is this actually helpful?

That's it. No sub-agents, no token tribunals, no mandatory thirteen-section reports.
Just smart, efficient, useful assistance that scales naturally with task complexity.`;
        } catch (error) {
          console.warn('Could not load PFC super meta prompt, using default');
        }

        // System prompt with PFC ADP for maximum efficiency
        const systemPrompt = `${pfcMetaPrompt}

---

## CURRENT TASK CONTEXT

**Environment**: Daytona Sandbox (isolated, secure, temporary)
**Project Type**: ${projectType}
**Active Agents**: ${agents && agents.length > 0 ? agents.join(', ') : 'None'}

## WEB APP GENERATION TASK

**Context:**
- Environment: Daytona Sandbox (isolated, secure, temporary)
- Project Type: ${projectType}
- Active Specialists: ${agents && agents.length > 0 ? agents.join(', ') : 'General development'}
- Output Format: Single-file HTML with embedded CSS/JS

**Requirements:**
Generate a complete, production-ready ${projectType} as a standalone HTML file:
- Embed all CSS in \`<style>\` tags
- Embed all JavaScript in \`<script>\` tags
- Use modern, responsive design patterns
- Mobile-first approach with responsive breakpoints
- Semantic HTML5 structure
- Accessibility features (ARIA, proper headings)
- Clean, maintainable code with helpful comments

**Response Structure:**
1. **Brief Analysis** (~2-3 sentences): What you're building and approach
2. **Complete Code**: Full HTML in markdown code block
3. **Feature Summary**: List 3-5 key features implemented

**Delivery:**
The file will be written to index.html in the Daytona sandbox and served via HTTP server.

Generate the complete HTML file wrapped in markdown code blocks.
`;

        // Stream response from Claude
        const streamResponse = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: anthropicMessages,
          system: systemPrompt,
          stream: true,
        });

        let fullResponse = '';

        for await (const event of streamResponse) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text;
            fullResponse += text;

            // Stream message chunks
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'message',
                  data: {
                    type: 'assistant',
                    content: text,
                    delta: true,
                  },
                })}\n\n`
              )
            );
          }
        }

        // Extract HTML code from response
        const codeMatch = fullResponse.match(/```html\n([\s\S]*?)\n```/);
        const htmlCode = codeMatch ? codeMatch[1] : fullResponse;

        // Progress: Writing files
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              data: {
                status: 'writing',
                message: '📝 Writing files to sandbox...',
              },
            })}\n\n`
          )
        );

        // Write HTML file to sandbox
        await writeFileToSandbox(sandbox, 'index.html', htmlCode);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'tool',
              data: {
                action: 'create',
                file: 'index.html',
                linesAdded: htmlCode.split('\n').length,
              },
            })}\n\n`
          )
        );

        // Progress: Starting server
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              data: {
                status: 'starting',
                message: '🚀 Starting HTTP server...',
              },
            })}\n\n`
          )
        );

        // Start HTTP server in sandbox using executeCommand
        await sandbox.process.executeCommand('npx http-server -p 3000 &');

        // Wait a moment for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        const previewUrl = `https://${sandboxId}-3000.daytona.app`;

        // Progress: Complete
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              data: {
                status: 'preview',
                message: `🌐 Preview available at: ${previewUrl}`,
                previewUrl,
              },
            })}\n\n`
          )
        );

        // Send completion event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              data: {
                success: true,
                sandboxId,
                previewUrl,
                message: 'Project generated successfully in Daytona sandbox!',
              },
            })}\n\n`
          )
        );

        // Log successful generation
        const duration = Date.now() - startTime;
        logAIGeneration({
          userId: session.user.id,
          projectType,
          tokensUsed: 0, // TODO: Track actual token usage
          duration,
          success: true,
        });

        controller.close();
      } catch (error: any) {
        const duration = Date.now() - startTime;

        // Log error
        logError(error, {
          userId: session.user.id,
          endpoint: '/api/agent/stream-daytona',
          projectType,
          sandboxId: sandbox?.id,
        });

        // Clean up sandbox on error
        if (sandbox?.id) {
          try {
            await deleteSandbox(sandbox.id);
          } catch (cleanupError) {
            logError(cleanupError, {
              context: 'sandbox_cleanup',
              sandboxId: sandbox.id,
            });
          }
        }

        // Log failed generation
        logAIGeneration({
          userId: session.user.id,
          projectType,
          tokensUsed: 0,
          duration,
          success: false,
          error: error.message,
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              data: {
                message: error.message || 'Failed to generate in Daytona sandbox',
              },
            })}\n\n`
          )
        );

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

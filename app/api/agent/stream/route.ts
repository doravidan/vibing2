import Anthropic from '@anthropic-ai/sdk';
import { calculateContextPercentage, calculatePFCSavings } from '@/lib/pfc-tracker';
import { extractFileOperations } from '@/lib/pfc-system-prompt';
import { AIGenerationSchema, validateRequest } from '@/lib/validations';
import { aiRateLimiter, checkRateLimit } from '@/lib/rate-limit';
import { auth } from '@/auth';

export const runtime = 'nodejs'; // Required for file system access to load agents

export async function POST(req: Request) {
  try {
    // Get session for rate limiting
    const session = await auth();

    // Apply rate limiting (3 AI requests per minute)
    const rateLimitResult = await checkRateLimit(req, aiRateLimiter, session?.user?.id);
    if (!rateLimitResult.success) {
      return rateLimitResult.response!;
    }

    const body = await req.json();

    // Validate request body
    const validation = validateRequest(AIGenerationSchema, body);
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error);
      console.error('❌ Request body:', JSON.stringify(body, null, 2));
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages, projectType, agents, specializedAgent } = validation.data;

    // Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'your_api_key_here' || apiKey.includes('demo-key') || apiKey.includes('change-this')) {
      console.error('❌ Anthropic API key not properly configured');
      return new Response(
        JSON.stringify({
          error: 'Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your environment variables.'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const client = new Anthropic({
      apiKey: apiKey,
    });

    // Transform messages to Anthropic format
    // Handle both text-only and messages with embedded images
    const anthropicMessages = messages.map((msg: { role: string; content: string }) => {
      const role = msg.role === 'user' ? 'user' : 'assistant';

      // Check if message contains base64 images
      const imageRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
      const images: Array<{ source: { type: 'base64'; media_type: string; data: string } }> = [];
      let textContent = msg.content;

      // Extract images
      let match;
      while ((match = imageRegex.exec(msg.content)) !== null) {
        const dataUrl = match[2];
        const [mediaInfo, base64Data] = dataUrl.split(',');
        const mediaType = mediaInfo.match(/data:(image\/[^;]+)/)?.[1] || 'image/png';

        images.push({
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data
          }
        });

        // Replace image markdown with a placeholder in text
        textContent = textContent.replace(match[0], `[Image ${images.length}: ${match[1] || 'attached'}]`);
      }

      // If images found, use content blocks format
      if (images.length > 0) {
        const contentBlocks: any[] = [
          { type: 'text', text: textContent }
        ];

        // Add image blocks
        images.forEach(img => {
          contentBlocks.push({
            type: 'image',
            source: img.source
          });
        });

        return { role, content: contentBlocks };
      }

      // No images, use simple string format
      return { role, content: msg.content };
    });

    // Load PFC super meta prompt for context-aware generation
    let pfcMetaPrompt = '';
    try {
      // Note: Edge runtime doesn't support fs, so we'll use a fallback
      // In production, this should be loaded at build time or use environment variable
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
    } catch {
      console.warn('Using default PFC prompt');
    }

    // Load specialized agent prompt if specified
    let specializedAgentPrompt = '';
    if (specializedAgent) {
      try {
        // Dynamically import the agent registry (Edge runtime compatible)
        const { getAgentRegistry } = await import('@/lib/agents/agent-registry');
        const registry = await getAgentRegistry();
        const agent = registry.getAgent(specializedAgent);

        if (agent) {
          specializedAgentPrompt = `\n\n---\n\n## SPECIALIZED AGENT: ${agent.metadata.name.toUpperCase()}\n\n${agent.systemPrompt}\n\n---\n\n`;
          console.log(`✨ Using specialized agent: ${agent.metadata.name} (${agent.metadata.model} tier)`);
        } else {
          console.warn(`⚠️  Agent "${specializedAgent}" not found, using default prompt`);
        }
      } catch (error) {
        console.error('Failed to load specialized agent:', error);
      }
    }

    const systemPrompt = `${pfcMetaPrompt}${specializedAgentPrompt}

---

## WEB APP GENERATION TASK

**Context:**
- Project Type: ${projectType}
- Active Specialists: ${specializedAgent || (agents && agents.length > 0 ? agents.join(', ') : 'General web development')}
- Output Format: Single-file HTML with embedded CSS/JS

**Requirements:**
Generate a complete, production-ready ${projectType} as a standalone HTML file:
- Embed all CSS in \`<style>\` tags
- Embed all JavaScript in \`<script>\` tags  
- Use modern, responsive design patterns
- Ensure mobile-first approach
- Include semantic HTML5
- Add accessibility features (ARIA labels, proper heading hierarchy)
- Use clean, maintainable code with comments

**Response Structure:**
Provide your response in a clean, professional format:

1. Start with a concise overview (1-2 sentences) explaining what you're building
2. Present the complete implementation in a code block
3. End with key highlights (3-5 bullet points) covering important features or patterns

Use natural, conversational language. Avoid rigid section headers or overly formatted markdown. Keep it polished and easy to read.

**Quality Gates:**
- Test responsiveness mentally (mobile, tablet, desktop)
- Validate HTML structure completeness
- Ensure all resources are inline (no external CDN dependencies if possible)

Focus on ${agents.length > 0 ? agents.join(' and ') : 'core functionality and user experience'}.
`;

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 64000, // Maximum output tokens for Claude Sonnet 4 (64K) - allows for very long file generation
      messages: anthropicMessages,
      system: systemPrompt,
      stream: true,
    });

    // Create ReadableStream with abort handling
    const encoder = new TextEncoder();
    let totalTokensUsed = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const startTime = Date.now();
    let abortController = new AbortController();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress update (Claude Code style)
          const progressStart = JSON.stringify({
            type: 'progress',
            status: 'starting',
            message: '🤖 Initializing Claude Agent...'
          });
          controller.enqueue(encoder.encode(`__PROGRESS__${progressStart}__END__\n`));

          let contentStarted = false;
          let fullResponse = '';
          const codeChanges: any[] = [];

          for await (const chunk of stream) {
            // Check if aborted
            if (abortController.signal.aborted) {
              console.log('⚠️  Stream aborted by client');
              break;
            }
            // Track usage
            if (chunk.type === 'message_start') {
              inputTokens = chunk.message.usage?.input_tokens || 0;

              // Send thinking progress
              const progressThinking = JSON.stringify({
                type: 'progress',
                status: 'thinking',
                message: '💭 Processing your request...'
              });
              controller.enqueue(encoder.encode(`__PROGRESS__${progressThinking}__END__\n`));
            }

            // Stream content
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              fullResponse += text;

              // Send "generating" progress on first content
              if (!contentStarted) {
                const progressGenerating = JSON.stringify({
                  type: 'progress',
                  status: 'generating',
                  message: '✍️ Generating response...'
                });
                controller.enqueue(encoder.encode(`__PROGRESS__${progressGenerating}__END__\n`));
                contentStarted = true;

                // Simulate tool use - analyzing code
                const toolAnalyze = JSON.stringify({
                  type: 'tool',
                  action: 'read',
                  file: 'Analyzing project structure...',
                  timestamp: new Date().toISOString()
                });
                controller.enqueue(encoder.encode(`__TOOL__${toolAnalyze}__END__\n`));
              }

              controller.enqueue(encoder.encode(text));

              // Detect code blocks and emit tool events
              const codeBlockMatch = fullResponse.match(/```(\w+)\n([\s\S]*?)```/);
              if (codeBlockMatch && codeChanges.length === 0) {
                const language = codeBlockMatch[1];
                const code = codeBlockMatch[2];

                // Send tool event for code generation
                const toolWrite = JSON.stringify({
                  type: 'tool',
                  action: 'create',
                  file: `index.${language}`,
                  language,
                  linesAdded: code.split('\n').length,
                  timestamp: new Date().toISOString()
                });
                controller.enqueue(encoder.encode(`__TOOL__${toolWrite}__END__\n`));

                // Track code change
                codeChanges.push({
                  type: 'create',
                  file: `index.${language}`,
                  language,
                  content: code,
                  linesAdded: code.split('\n').length,
                  linesRemoved: 0,
                  timestamp: new Date().toISOString()
                });
              }
            }

            // Get final usage
            if (chunk.type === 'message_delta') {
              outputTokens = chunk.usage?.output_tokens || 0;
            }
          }

          // Extract file operations from the response
          const fileOps = extractFileOperations(fullResponse);

          // Send file operations if any
          if (fileOps.creates.length > 0 || fileOps.updates.length > 0 || fileOps.deletes.length > 0) {
            const fileOpsData = JSON.stringify({
              type: 'file_operations',
              operations: {
                creates: fileOps.creates,
                updates: fileOps.updates,
                deletes: fileOps.deletes
              }
            });
            controller.enqueue(encoder.encode(`__FILE_OPS__${fileOpsData}__END__\n`));
          }

          // Send code changes if any (backward compatibility)
          if (codeChanges.length > 0) {
            const changesData = JSON.stringify({
              type: 'code_changes',
              changes: codeChanges
            });
            controller.enqueue(encoder.encode(`__CHANGES__${changesData}__END__\n`));
          }

          // Calculate total tokens and PFC metrics
          totalTokensUsed = inputTokens + outputTokens;
          const contextPercentage = calculateContextPercentage(totalTokensUsed);
          const pfcSaved = calculatePFCSavings(totalTokensUsed);
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);

          console.log('📊 Sending PFC metrics:', { totalTokensUsed, inputTokens, outputTokens, contextPercentage, pfcSaved, duration });

          // Send completion progress
          const progressComplete = JSON.stringify({
            type: 'progress',
            status: 'completing',
            message: '✅ Finalizing response...'
          });
          controller.enqueue(encoder.encode(`\n\n__PROGRESS__${progressComplete}__END__\n`));

          // Send metrics as final chunk (Claude Code style summary)
          const metricsData = JSON.stringify({
            type: 'metrics',
            tokensUsed: totalTokensUsed,
            inputTokens,
            outputTokens,
            contextPercentage,
            pfcSaved,
            duration: parseFloat(duration),
            timestamp: new Date().toISOString()
          });
          controller.enqueue(encoder.encode(`__METRICS__${metricsData}__END__\n`));

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        // Handle client disconnect
        console.log('🔌 Client disconnected, aborting stream');
        abortController.abort();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error('Agent streaming error:', error);

    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to process request'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

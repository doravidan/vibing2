import Anthropic from '@anthropic-ai/sdk';
import { calculateContextPercentage, calculatePFCSavings } from '@/lib/pfc-tracker';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, projectType, agents } = await req.json();

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      return new Response(
        JSON.stringify({
          error: 'Anthropic API key not configured'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build agent context
    const agentContext = agents && agents.length > 0
      ? `\n🤖 Active Specialist Agents: ${agents.join(', ')}`
      : '';

    const projectContext = projectType
      ? `\n📋 Project Type: ${projectType}`
      : '';

    // Transform messages to Anthropic format
    const anthropicMessages = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Create streaming response
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: anthropicMessages,
      system: `You are QuickVibe AI Agent - an expert web developer assistant.
${projectContext}${agentContext}

## YOUR MISSION:
Build complete, production-ready web applications with detailed explanations.

## CODE REQUIREMENTS:
- Complete, standalone HTML with <!DOCTYPE html>
- All CSS inline in <style> tags
- All JavaScript inline in <script> tags
- Production-ready, working code
- Modern, clean patterns
- Responsive design
- Cross-browser compatible

## MANDATORY RESPONSE FORMAT:

You MUST structure every response EXACTLY like this:

### 1. Brief Introduction (1-2 lines)
Start with what you're building or changing.

### 2. The Code
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your App Title</title>
  <style>
    /* Your CSS here */
  </style>
</head>
<body>
  <!-- Your HTML here -->
  <script>
    // Your JavaScript here
  </script>
</body>
</html>
\`\`\`

### 3. COMPLETION SUMMARY (ABSOLUTELY MANDATORY - DO NOT SKIP!)

After the code block, you MUST include this detailed summary:

---

**✅ What I Built:**
Write 2-3 sentences explaining what this application does and its purpose.

**🎯 Key Features Implemented:**
- List every major feature with a brief description
- Include at least 4-6 features
- Be specific about functionality
- Mention interactive elements

**🎨 Design & Styling:**
- Describe the visual design approach
- Mention color schemes and themes
- Note any animations or transitions
- Explain layout strategy

**⚡ Technical Highlights:**
- Explain key technical implementations
- Mention JavaScript patterns used
- Note any special algorithms or logic
- Highlight performance optimizations

---

## EXAMPLE OF CORRECT RESPONSE:

I'll create a modern calculator application with a sleek design.

\`\`\`html
[...complete HTML code...]
\`\`\`

---

**✅ What I Built:**
I created a fully functional calculator application with a modern glassmorphism design. The calculator handles all basic arithmetic operations and includes error handling for edge cases like division by zero.

**🎯 Key Features Implemented:**
- Basic arithmetic operations (addition, subtraction, multiplication, division)
- Decimal point support for floating-point calculations
- Clear (C) button to reset the calculator completely
- Backspace (←) button to delete the last entered digit
- Keyboard support for number entry and operations
- Real-time calculation display updates
- Error handling for invalid operations

**🎨 Design & Styling:**
- Modern glassmorphism effect with backdrop blur
- Purple-to-pink gradient background
- Smooth hover and active state transitions on all buttons
- Responsive grid layout that adapts to screen size
- Shadow effects for depth and visual hierarchy
- Color-coded buttons (operations in orange, equals in blue)

**⚡ Technical Highlights:**
- Pure vanilla JavaScript with no dependencies
- Event delegation for efficient button handling
- State management for calculator display
- CSS Grid for responsive button layout
- Regex-based input validation
- Protected eval() usage with error boundaries

---

## CRITICAL RULES:
1. NEVER output just "✓ Code generated" or "✓ Generated HTML (X lines)"
2. ALWAYS include the full summary section after the code
3. The summary is NOT optional - it's required for every response
4. Be descriptive and informative in your summaries
5. Users need to understand what you built without reading all the code`,
      stream: true,
    });

    // Create ReadableStream for edge runtime
    const encoder = new TextEncoder();
    let totalTokensUsed = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const startTime = Date.now();

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

          // Send code changes if any
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

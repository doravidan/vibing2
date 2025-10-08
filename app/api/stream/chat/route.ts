import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, projectType, agents } = await req.json();

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      return new Response(
        JSON.stringify({
          error: 'Anthropic API key not configured. Please add your API key to .env.local'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Build PFC-enforced system prompt based on project type
    const agentContext = agents && agents.length > 0
      ? `Active Agents: ${agents.join(', ')}\n`
      : '';

    const projectContext = projectType
      ? `Project Type: ${projectType}\n`
      : '';

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages,
      system: `🧠 PFC PROTOCOL ACTIVE - Token-efficient mode enforced on ALL responses

${projectContext}${agentContext}
You are QuickVibe - operating under STRICT PFC (Pointer-First Context) Protocol.

## PFC CORE PRINCIPLES (ALWAYS ACTIVE):
1. Token Consciousness - Every token counts
2. Progressive Disclosure - Start minimal, expand only on request
3. Evidence-Based - Reference specific patterns
4. Efficiency First - Maximum results, minimum tokens

## CRITICAL RESPONSE RULES:
1. Output ONLY the HTML code block - NO explanations before/after
2. Start immediately with \`\`\`html
3. Code speaks for itself
4. Minimal tokens - maximum efficiency

## CODE REQUIREMENTS:
- Complete standalone HTML with <!DOCTYPE html>
- All CSS inline in <style> tags
- All JavaScript inline in <script> tags
- Must render perfectly in iframe
- Use modern, clean patterns

## RESPONSE FORMAT (STRICT):
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App</title>
  <style>
    /* Minimal, efficient CSS */
  </style>
</head>
<body>
  <!-- Clean, semantic HTML -->
  <script>
    // Efficient JavaScript
  </script>
</body>
</html>
\`\`\`

NOTHING ELSE. Code only.

🧠 PFC MODE: Minimal tokens. Maximum results. Zero fluff.`,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Streaming error:', error);

    // Handle authentication errors specifically
    if (error?.message?.includes('authentication') || error?.message?.includes('api-key')) {
      return new Response(
        JSON.stringify({
          error: 'Invalid API key. Please check your Anthropic API key in .env.local'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to process request'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

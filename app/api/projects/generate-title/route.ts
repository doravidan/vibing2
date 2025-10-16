import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { prompt, projectType } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Generate a creative title using Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Based on this project description: "${prompt}"

Generate a creative, catchy, and fun project title. The title should:
- Be 2-5 words maximum
- Use wordplay, puns, or creative twists on the main concept
- Be memorable and unique
- Reflect the essence of what they want to build
- Add a fun suffix like: "Pro", "Quest", "Mania", "Zone", "Hub", "Verse", "Lab", "Studio", "Forge", "Maker", "Builder", or similar

Examples:
- "Space invader game" → "Invader Blaster Pro"
- "Coffee shop landing page" → "Bean Scene Hub"
- "Workout tracking app" → "Sweat Quest Tracker"
- "Todo list app" → "Task Master Zone"
- "Recipe website" → "Flavor Forge Studio"

Return ONLY the title, nothing else. No quotes, no explanation.`,
        },
      ],
    });

    const title = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : 'Untitled Project';

    return NextResponse.json({ success: true, title });
  } catch (error: any) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title', details: error.message },
      { status: 500 }
    );
  }
}

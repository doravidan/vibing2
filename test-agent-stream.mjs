#!/usr/bin/env node
/**
 * Test script for /api/agent/stream endpoint
 * Tests the Anthropic API integration
 */

const BASE_URL = 'http://localhost:3000';

async function testAgentStream() {
  console.log('🧪 Testing /api/agent/stream endpoint...\n');

  const payload = {
    messages: [
      {
        id: 'test-msg-1',
        role: 'user',
        content: 'Create a simple hello world HTML page with a centered h1 tag that says "Hello World" in blue.'
      }
    ],
    projectType: 'web-app',
    agents: ['frontend']
  };

  try {
    console.log('📤 Sending request...');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${BASE_URL}/api/agent/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('\n📊 Response Status:', response.status, response.statusText);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ Error Response:');
      console.error(errorText);
      process.exit(1);
    }

    console.log('\n✅ Stream started successfully!');
    console.log('📥 Streaming response:\n');

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('\n\n✅ Stream completed successfully!');
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process special markers
      if (buffer.includes('__PROGRESS__')) {
        const match = buffer.match(/__PROGRESS__(.+?)__END__/);
        if (match) {
          const progress = JSON.parse(match[1]);
          console.log(`\n🔄 ${progress.message}`);
          buffer = buffer.replace(match[0], '');
        }
      }

      if (buffer.includes('__TOOL__')) {
        const match = buffer.match(/__TOOL__(.+?)__END__/);
        if (match) {
          const tool = JSON.parse(match[1]);
          console.log(`\n🔧 Tool: ${tool.action} - ${tool.file}`);
          buffer = buffer.replace(match[0], '');
        }
      }

      if (buffer.includes('__METRICS__')) {
        const match = buffer.match(/__METRICS__(.+?)__END__/);
        if (match) {
          const metrics = JSON.parse(match[1]);
          console.log('\n\n📊 Final Metrics:');
          console.log(`   - Tokens Used: ${metrics.tokensUsed}`);
          console.log(`   - Input Tokens: ${metrics.inputTokens}`);
          console.log(`   - Output Tokens: ${metrics.outputTokens}`);
          console.log(`   - Context Used: ${metrics.contextPercentage}%`);
          console.log(`   - Duration: ${metrics.duration}s`);
          buffer = buffer.replace(match[0], '');
        }
      }

      // Print regular content (limited to avoid spam)
      const regularContent = buffer.replace(/__[A-Z_]+__.+?__END__/g, '');
      if (regularContent.length > 0) {
        process.stdout.write(regularContent);
        buffer = '';
      }
    }

    console.log('\n\n✅ Test passed! API is working correctly.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    process.exit(1);
  }
}

// Run the test
testAgentStream();

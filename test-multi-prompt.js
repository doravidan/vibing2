const http = require('http');

// Test configuration
const TEST_PROMPTS = [
  'Create a simple landing page with a blue header that says "Welcome to My Site"',
  'Change the header color to red and add a subtitle that says "Powered by AI"',
  'Add a contact form with name and email fields below the header'
];

let currentProjectId = null;
let messageHistory = [];

// Function to send a prompt
async function sendPrompt(promptText, promptNumber) {
  console.log('\n' + '='.repeat(80));
  console.log(`PROMPT ${promptNumber}: "${promptText}"`);
  console.log('='.repeat(80));

  const userMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: promptText
  };

  messageHistory.push(userMessage);

  const postData = JSON.stringify({
    messages: messageHistory,
    projectType: 'website',
    agents: []
  });

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/agent/stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      console.log(`\n📡 Status: ${res.statusCode}`);

      let buffer = '';
      let assistantMessage = '';
      let codePreview = null;
      let metrics = null;

      res.on('data', (chunk) => {
        buffer += chunk.toString();

        // Parse SSE custom markers
        const markerRegex = /__(\w+)__(.*?)__END__/g;
        let match;

        while ((match = markerRegex.exec(buffer)) !== null) {
          const markerType = match[1].toLowerCase();
          const markerData = match[2];

          try {
            const parsed = JSON.parse(markerData);

            if (markerType === 'progress') {
              process.stdout.write(`\r⏳ ${parsed.message || 'Processing...'}                    `);
            } else if (markerType === 'changes' || parsed.type === 'code_changes') {
              console.log('\n✅ Code changes received');
              if (parsed.changes && parsed.changes[0]) {
                codePreview = parsed.changes[0].content;
                console.log(`   📄 Code length: ${codePreview.length} characters`);
              }
            } else if (markerType === 'metrics') {
              metrics = parsed;
              console.log(`\n📊 Metrics: ${parsed.tokensUsed} tokens (${parsed.contextPercentage?.toFixed(2)}% context)`);
            }
          } catch (e) {
            // Skip parsing errors
          }
        }

        // Extract text content between markers
        const textContent = buffer.replace(/__\w+__.*?__END__/g, '').trim();
        if (textContent && !assistantMessage.includes(textContent)) {
          assistantMessage += textContent;
        }
      });

      res.on('end', () => {
        console.log('\n✅ Stream completed\n');

        // Add assistant message to history
        if (assistantMessage) {
          messageHistory.push({
            id: Date.now().toString(),
            role: 'assistant',
            content: assistantMessage
          });
        }

        resolve({
          success: true,
          assistantMessage,
          codePreview,
          metrics,
          messageCount: messageHistory.length
        });
      });
    });

    req.on('error', (e) => {
      console.error(`\n❌ Request failed: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Main test function
async function runMultiPromptTest() {
  console.log('\n🚀 Starting Multi-Prompt Test\n');
  console.log('This will simulate a real user workflow:');
  console.log('1. Create initial page');
  console.log('2. Modify the page');
  console.log('3. Add more features\n');

  const results = [];

  for (let i = 0; i < TEST_PROMPTS.length; i++) {
    try {
      const result = await sendPrompt(TEST_PROMPTS[i], i + 1);
      results.push(result);

      // Wait a bit between prompts to simulate real usage
      if (i < TEST_PROMPTS.length - 1) {
        console.log('⏸️  Waiting 2 seconds before next prompt...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`\n❌ Prompt ${i + 1} failed:`, error.message);
      break;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total prompts sent: ${results.length}/${TEST_PROMPTS.length}`);
  console.log(`Total messages in history: ${messageHistory.length}`);
  console.log('\nResults per prompt:');
  results.forEach((result, i) => {
    console.log(`\nPrompt ${i + 1}:`);
    console.log(`  ✓ Success: ${result.success}`);
    console.log(`  ✓ Code preview: ${result.codePreview ? 'Yes' : 'No'} (${result.codePreview?.length || 0} chars)`);
    console.log(`  ✓ Metrics: ${result.metrics ? 'Yes' : 'No'} (${result.metrics?.tokensUsed || 0} tokens)`);
    console.log(`  ✓ Messages: ${result.messageCount} total`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Multi-prompt test completed!');
  console.log('='.repeat(80));

  // Verify code differences
  console.log('\n🔍 VERIFICATION:');
  if (results.length >= 2) {
    const firstCode = results[0].codePreview || '';
    const secondCode = results[1].codePreview || '';

    if (firstCode && secondCode) {
      if (firstCode !== secondCode) {
        console.log('✅ Code changed between prompts (GOOD)');
        console.log(`   First prompt code length: ${firstCode.length}`);
        console.log(`   Second prompt code length: ${secondCode.length}`);

        // Check for specific changes
        if (firstCode.includes('blue') && secondCode.includes('red')) {
          console.log('✅ Color change detected: blue → red (GOOD)');
        }
        if (!firstCode.includes('Powered by AI') && secondCode.includes('Powered by AI')) {
          console.log('✅ Subtitle added: "Powered by AI" (GOOD)');
        }
      } else {
        console.log('❌ Code did NOT change between prompts (BAD)');
      }
    } else {
      console.log('⚠️  Could not verify code changes (missing code preview)');
    }
  }

  if (results.length >= 3) {
    const thirdCode = results[2].codePreview || '';
    if (thirdCode && !results[1].codePreview?.includes('form') && thirdCode.includes('form')) {
      console.log('✅ Contact form added in third prompt (GOOD)');
    }
  }

  console.log('\n');
  process.exit(0);
}

// Run the test
runMultiPromptTest().catch(err => {
  console.error('\n💥 Test crashed:', err);
  process.exit(1);
});

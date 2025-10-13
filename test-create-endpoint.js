const https = require('http');

async function testCreateEndpoint() {
  console.log('Testing /api/agent/stream endpoint...\n');

  const postData = JSON.stringify({
    messages: [
      {
        role: 'user',
        content: 'Create a simple landing page for a coffee shop with a hero section and contact button'
      }
    ],
    projectType: 'landing page',
    agents: []
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/agent/stream',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`✓ Status: ${res.statusCode}`);
      console.log(`✓ Content-Type: ${res.headers['content-type']}`);

      let receivedEvents = [];
      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                receivedEvents.push(parsed.type || 'unknown');

                if (parsed.type === 'progress') {
                  console.log(`  → Progress: ${parsed.data?.message || ''}`);
                } else if (parsed.type === 'code_changes') {
                  console.log(`  → Code changes received (${parsed.data?.changes?.length || 0} files)`);
                } else if (parsed.type === 'metrics') {
                  console.log(`  → Metrics: ${parsed.data?.tokensUsed || 0} tokens used`);
                }
              } catch (e) {
                // Skip non-JSON lines
              }
            }
          }
        });
      });

      res.on('end', () => {
        console.log(`\n✓ Stream completed`);
        console.log(`✓ Events received: ${receivedEvents.join(', ')}`);

        const hasProgress = receivedEvents.includes('progress');
        const hasCodeChanges = receivedEvents.includes('code_changes') || receivedEvents.includes('changes');
        const hasMetrics = receivedEvents.includes('metrics');

        console.log('\nValidation:');
        console.log(`  ${hasProgress ? '✓' : '✗'} Progress events`);
        console.log(`  ${hasCodeChanges ? '✓' : '✗'} Code changes`);
        console.log(`  ${hasMetrics ? '✓' : '✗'} Metrics`);

        resolve({
          statusCode: res.statusCode,
          hasProgress,
          hasCodeChanges,
          hasMetrics,
          eventCount: receivedEvents.length
        });
      });
    });

    req.on('error', (e) => {
      console.error(`✗ Request failed: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Run test
testCreateEndpoint()
  .then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Status: ${result.statusCode === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`Events: ${result.eventCount}`);
    process.exit(result.statusCode === 200 && result.hasCodeChanges ? 0 : 1);
  })
  .catch(err => {
    console.error('\nTest failed:', err.message);
    process.exit(1);
  });

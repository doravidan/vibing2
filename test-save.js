/**
 * Test script for save project functionality
 * Tests the InstantDB save implementation
 */

const testData = {
  name: "Test Project - InstantDB",
  description: "Testing save functionality with InstantDB",
  projectType: "website",
  activeAgents: ["code-generation", "ui-design"],
  currentCode: `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
  <style>
    body { font-family: Arial; }
  </style>
</head>
<body>
  <h1>Hello InstantDB!</h1>
  <script>
    console.log('Test project loaded');
  </script>
</body>
</html>`,
  messages: [
    {
      role: "user",
      content: "Create a simple website",
      createdAt: Date.now() - 10000
    },
    {
      role: "assistant",
      content: "I'll create a simple website for you...",
      createdAt: Date.now()
    }
  ]
};

console.log('\n🧪 Testing Save Project Endpoint\n');
console.log('Test Data:', JSON.stringify(testData, null, 2));
console.log('\n📡 Sending POST request to http://localhost:3000/api/projects/save\n');
console.log('⚠️  Note: You must be logged in and have a valid session cookie for this to work!\n');
console.log('To test manually:');
console.log('1. Open http://localhost:3000 in your browser');
console.log('2. Log in to your account');
console.log('3. Open browser DevTools > Console');
console.log('4. Run this fetch command:\n');

const fetchCode = `
fetch('/api/projects/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${JSON.stringify(testData, null, 2)})
})
.then(res => res.json())
.then(data => {
  console.log('✅ Save Response:', data);
  if (data.success) {
    console.log('🎉 Project saved successfully!');
    console.log('📋 Project ID:', data.project.id);
  } else {
    console.error('❌ Save failed:', data.error);
  }
})
.catch(err => console.error('🔴 Error:', err));
`;

console.log(fetchCode);
console.log('\n📋 Expected Response (success):');
console.log(JSON.stringify({
  success: true,
  project: {
    id: "<generated-uuid>",
    name: "Test Project - InstantDB",
    userId: "<your-user-id>"
  }
}, null, 2));

console.log('\n🔍 Check server logs for:');
console.log('  🔵 Save route POST called (InstantDB)');
console.log('  ✅ Success messages');
console.log('  🔴 Any error messages\n');

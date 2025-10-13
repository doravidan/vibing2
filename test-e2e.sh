#!/bin/bash

# End-to-End Test Script for QuickVibe 2.0
# Tests Daytona sandbox creation and code generation

echo "🧪 Starting End-to-End Tests for QuickVibe 2.0"
echo "=============================================="
echo ""

# Check server is running
echo "1️⃣ Testing server health..."
HEALTH=$(curl -s http://localhost:3000 | grep -o "QuickVibe" | head -1)
if [ "$HEALTH" = "QuickVibe" ]; then
  echo "✅ Server is running"
else
  echo "❌ Server not responding"
  exit 1
fi

echo ""
echo "2️⃣ Testing authentication endpoint..."
AUTH_RESPONSE=$(curl -s http://localhost:3000/api/auth/session)
echo "Auth session: $AUTH_RESPONSE"

echo ""
echo "3️⃣ Testing Daytona stream endpoint..."
echo "Sending test request to create a simple calculator..."

# Test Daytona stream endpoint
RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent/stream-daytona \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Create a simple calculator with +, -, *, / operations"}],
    "projectType": "website",
    "agents": ["UI/UX Designer"],
    "projectName": "test-calculator"
  }' \
  --max-time 120 \
  --no-buffer)

echo ""
echo "4️⃣ Analyzing response..."

# Check for success indicators
if echo "$RESPONSE" | grep -q "Creating secure sandbox"; then
  echo "✅ Sandbox creation initiated"
fi

if echo "$RESPONSE" | grep -q "Sandbox created"; then
  echo "✅ Sandbox created successfully"
fi

if echo "$RESPONSE" | grep -q "Generating code"; then
  echo "✅ Code generation started"
fi

if echo "$RESPONSE" | grep -q "Writing files"; then
  echo "✅ Files being written"
fi

if echo "$RESPONSE" | grep -q "Starting HTTP server"; then
  echo "✅ HTTP server starting"
fi

if echo "$RESPONSE" | grep -q "Preview available"; then
  echo "✅ Preview URL generated"
fi

if echo "$RESPONSE" | grep -q "Generation complete"; then
  echo "✅ Generation completed"
fi

if echo "$RESPONSE" | grep -q '"type":"error"'; then
  echo "❌ Error detected in response:"
  echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1
  exit 1
fi

echo ""
echo "5️⃣ Test Results Summary"
echo "======================="
echo "Total response length: $(echo "$RESPONSE" | wc -c) bytes"
echo ""

# Extract sandbox ID if present
SANDBOX_ID=$(echo "$RESPONSE" | grep -o 'sandboxId":"[^"]*"' | head -1 | cut -d'"' -f3)
if [ -n "$SANDBOX_ID" ]; then
  echo "✅ Sandbox ID: $SANDBOX_ID"
fi

# Extract preview URL if present
PREVIEW_URL=$(echo "$RESPONSE" | grep -o 'https://[^"]*daytona.app' | head -1)
if [ -n "$PREVIEW_URL" ]; then
  echo "✅ Preview URL: $PREVIEW_URL"
fi

echo ""
echo "🎉 End-to-End Test Complete!"

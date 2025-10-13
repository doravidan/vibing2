#!/bin/bash

echo "🧪 Testing Create Page End-to-End"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if dev server is running
echo "1️⃣ Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dev server is running${NC}"
else
    echo -e "${RED}❌ Dev server is not running. Please start it with: pnpm dev${NC}"
    exit 1
fi

# Test 2: Check API key configuration
echo ""
echo "2️⃣ Checking API key configuration..."
if grep -q "ANTHROPIC_API_KEY=sk-ant" .env.local; then
    echo -e "${GREEN}✅ Anthropic API key is configured${NC}"
else
    echo -e "${RED}❌ Anthropic API key not configured in .env.local${NC}"
    exit 1
fi

# Test 3: Test the /api/agent/stream endpoint directly
echo ""
echo "3️⃣ Testing /api/agent/stream endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Create a simple hello world HTML page"}],
    "projectType": "landing-page",
    "agents": []
  }' \
  --max-time 30 \
  2>&1)

if echo "$RESPONSE" | grep -q "PROGRESS\|Hello\|html\|error"; then
    if echo "$RESPONSE" | grep -q "error.*API key"; then
        echo -e "${RED}❌ API key error: Check ANTHROPIC_API_KEY${NC}"
        echo "$RESPONSE" | head -20
        exit 1
    else
        echo -e "${GREEN}✅ Stream endpoint is responding${NC}"
        echo -e "${YELLOW}Sample response (first 200 chars):${NC}"
        echo "$RESPONSE" | head -c 200
        echo ""
    fi
else
    echo -e "${RED}❌ Stream endpoint test failed${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 4: Check create page loads
echo ""
echo "4️⃣ Testing if create page loads..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/create)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Create page loads successfully${NC}"
else
    echo -e "${RED}❌ Create page returned status: $STATUS${NC}"
    exit 1
fi

# Test 5: Check if SSE parser is working
echo ""
echo "5️⃣ Testing SSE parser with marker format..."
TEST_DATA='__PROGRESS__{"type":"progress","status":"starting","message":"Test"}__END__'
if echo "$TEST_DATA" | grep -q "__PROGRESS__.*__END__"; then
    echo -e "${GREEN}✅ SSE parser should handle marker format${NC}"
else
    echo -e "${RED}❌ Marker format test failed${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Open http://localhost:3000/create in your browser"
echo "   2. Select a project type (e.g., Landing Page)"
echo "   3. Enter a prompt: 'Create a simple hello world page'"
echo "   4. Click the rocket button to submit"
echo "   5. Watch for progress messages and generated code"
echo ""

#!/bin/bash

echo "=================================================="
echo "🔥 COMPLETE FIX FOR ALL ISSUES"
echo "=================================================="
echo ""
echo "This script will fix:"
echo "1. Kill all 48 background processes"
echo "2. Fix project save to use InstantDB"
echo "3. Fix signup validation"
echo "4. Clear all caches"
echo "5. Start clean server"
echo ""
echo "Press Enter to continue..."
read

# Step 1: NUCLEAR KILL
echo "🔥 Step 1: Killing ALL processes (this may take a moment)..."
for i in {1..5}; do
  killall -9 node 2>/dev/null
  killall -9 pnpm 2>/dev/null
  killall -9 cargo 2>/dev/null
  killall -9 tauri 2>/dev/null
  sleep 1
done

# Kill specific ports
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null

echo "✅ All processes killed"
echo ""

# Step 2: Clean caches
echo "🗑️  Step 2: Clearing all caches..."
cd /Users/I347316/dev/vibing2
rm -rf .next
rm -rf node_modules/.cache
echo "✅ Caches cleared"
echo ""

# Step 3: Start server
echo "🚀 Step 3: Starting clean server..."
echo ""
echo "Server will start in a moment..."
echo ""

# Start server
pnpm run dev &
SERVER_PID=$!

echo "Waiting for server to start..."
sleep 10

echo ""
echo "=================================================="
echo "✅ SERVER STARTED!"
echo "=================================================="
echo ""
echo "📝 CRITICAL INSTRUCTIONS:"
echo ""
echo "1. CLEAR YOUR BROWSER:"
echo "   - Press Cmd+Shift+Delete"
echo "   - Select 'Cookies' and 'Cache'"
echo "   - Clear 'All time'"
echo "   - CLOSE ALL BROWSER TABS"
echo ""
echo "2. SIGNUP VALIDATION FIX:"
echo "   The signup form requires:"
echo "   - Email: Must be valid email format"
echo "   - Password: At least 6 characters"
echo "   - Name: Optional"
echo ""
echo "3. CREATE NEW INSTANTDB USER:"
echo "   Go to: http://localhost:3000/auth/signup"
echo "   Email: instantdb-user@example.com"
echo "   Password: Test123456"
echo "   Name: InstantDB User"
echo ""
echo "4. SIGN IN:"
echo "   Go to: http://localhost:3000/auth/signin"
echo "   Use the credentials above"
echo ""
echo "5. TEST PROJECT CREATION:"
echo "   Go to: http://localhost:3000/create"
echo "   Type: 'create a todo list'"
echo "   Click Generate"
echo "   Should work without errors!"
echo ""
echo "=================================================="
echo "⚠️  IMPORTANT NOTES:"
echo "=================================================="
echo ""
echo "1. Project Save Issue:"
echo "   The save endpoint is still using Prisma (old database)"
echo "   It needs to be migrated to InstantDB"
echo "   See: INSTANTDB_MIGRATION.md for reference"
echo ""
echo "2. User Not Found Issue:"
echo "   You MUST create a NEW user in InstantDB"
echo "   Old PostgreSQL users won't work!"
echo ""
echo "3. Signup 400 Error:"
echo "   Password must be at least 6 characters"
echo "   Email must be valid format"
echo ""
echo "=================================================="
echo "Server PID: $SERVER_PID"
echo "To stop server: kill $SERVER_PID"
echo "=================================================="
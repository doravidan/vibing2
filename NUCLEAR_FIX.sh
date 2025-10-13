#!/bin/bash

echo "🔥 NUCLEAR CLEANUP - Killing ALL processes..."

# Kill all Node.js processes
killall -9 node 2>/dev/null

# Kill all pnpm processes
killall -9 pnpm 2>/dev/null

# Kill all cargo processes
killall -9 cargo 2>/dev/null

# Kill all tauri processes
killall -9 tauri 2>/dev/null

# Kill processes on ports
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null

sleep 5

echo "✅ All processes killed"
echo ""
echo "🗑️  Cleaning build cache..."

cd /Users/I347316/dev/vibing2
rm -rf .next
rm -rf node_modules/.cache

echo "✅ Cache cleared"
echo ""
echo "🚀 Starting CLEAN server..."
echo ""

pnpm run dev

echo ""
echo "=================================================="
echo "✅ Server is starting!"
echo "=================================================="
echo ""
echo "🎯 CRITICAL NEXT STEPS:"
echo ""
echo "1. CLEAR YOUR BROWSER:"
echo "   - Press Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)"
echo "   - Select 'Cookies' and 'Cached data'"
echo "   - Clear data for LAST HOUR"
echo "   - CLOSE ALL localhost:3000 tabs"
echo ""
echo "2. CREATE NEW USER:"
echo "   - Go to: http://localhost:3000/auth/signup"
echo "   - Email: newuser@example.com"
echo "   - Password: NewPassword123"
echo "   - Name: New User"
echo ""
echo "3. SIGN IN WITH NEW USER:"
echo "   - Go to: http://localhost:3000/auth/signin"
echo "   - Use the NEW credentials above"
echo ""
echo "4. TEST:"
echo "   - Go to: http://localhost:3000/create"
echo "   - Create a project"
echo "   - Auto-save should work!"
echo ""
echo "=================================================="
echo "⚠️  DO NOT use your old account - it's in PostgreSQL"
echo "✅  ONLY use the NEW account - it's in InstantDB"
echo "=================================================="

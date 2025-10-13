#!/bin/bash

echo "🔥 KILLING ALL PROCESSES - NUCLEAR OPTION"
echo "==========================================="

# Get list of all processes
echo ""
echo "Current Node/pnpm processes:"
ps aux | grep -E "(node|pnpm|next|cargo|tauri)" | grep -v grep

# Kill all Node processes
echo ""
echo "Killing all Node processes..."
killall -9 node 2>/dev/null
echo "✅ Node processes killed"

# Kill all pnpm processes
echo "Killing all pnpm processes..."
killall -9 pnpm 2>/dev/null
echo "✅ pnpm processes killed"

# Kill all Next.js processes
echo "Killing all Next.js processes..."
ps aux | grep next | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
echo "✅ Next.js processes killed"

# Kill all Cargo processes
echo "Killing all Cargo processes..."
killall -9 cargo 2>/dev/null
echo "✅ Cargo processes killed"

# Kill all Tauri processes
echo "Killing all Tauri processes..."
killall -9 tauri 2>/dev/null
ps aux | grep tauri | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
echo "✅ Tauri processes killed"

# Kill vibing2-desktop processes
echo "Killing vibing2-desktop processes..."
ps aux | grep vibing2-desktop | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
echo "✅ vibing2-desktop processes killed"

# Wait for processes to die
echo ""
echo "Waiting 3 seconds for processes to terminate..."
sleep 3

# Verify all killed
echo ""
echo "==========================================="
echo "VERIFICATION - Remaining processes:"
echo "==========================================="
REMAINING=$(ps aux | grep -E "(node|pnpm|next|cargo|tauri)" | grep -v grep | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo "✅ SUCCESS! All processes killed!"
    echo "   No Node/pnpm/next/cargo/tauri processes remaining"
else
    echo "⚠️  WARNING: $REMAINING processes still running:"
    ps aux | grep -E "(node|pnpm|next|cargo|tauri)" | grep -v grep
    echo ""
    echo "Attempting second kill wave..."
    ps aux | grep -E "(node|pnpm|next|cargo|tauri)" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
    sleep 2
    STILL_REMAINING=$(ps aux | grep -E "(node|pnpm|next|cargo|tauri)" | grep -v grep | wc -l)
    if [ "$STILL_REMAINING" -eq 0 ]; then
        echo "✅ SUCCESS! Second wave killed all remaining processes!"
    else
        echo "❌ FAILED: $STILL_REMAINING processes still alive"
        ps aux | grep -E "(node|pnpm|next|cargo|tauri)" | grep -v grep
    fi
fi

echo ""
echo "==========================================="
echo "🧹 CLEANUP COMPLETE"
echo "==========================================="
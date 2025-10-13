#!/bin/bash

# Desktop Build Script for Tauri Integration
# This script builds the Next.js app for static export and prepares it for Tauri

set -e  # Exit on any error

echo "🏗️  Building Next.js app for Tauri desktop..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Clean previous builds
echo ""
echo "${YELLOW}Step 1: Cleaning previous builds${NC}"
rm -rf out
rm -rf vibing2-desktop/public/*
rm -rf .next
echo "${GREEN}✓ Cleaned previous builds${NC}"

# Step 2: Set environment variables
echo ""
echo "${YELLOW}Step 2: Setting environment variables${NC}"
export BUILD_MODE=desktop
export NEXT_PUBLIC_APP_MODE=desktop
export NEXT_PUBLIC_IS_DESKTOP=true
echo "${GREEN}✓ Environment variables set${NC}"

# Step 3: Run Next.js build with static export
echo ""
echo "${YELLOW}Step 3: Building Next.js static export${NC}"
pnpm run build

# Check if build was successful
if [ ! -d "out" ]; then
  echo "${RED}✗ Static export failed - 'out' directory not found${NC}"
  exit 1
fi

echo "${GREEN}✓ Next.js static export completed${NC}"

# Step 4: Verify output structure
echo ""
echo "${YELLOW}Step 4: Verifying output structure${NC}"
if [ ! -f "out/index.html" ]; then
  echo "${RED}✗ index.html not found in output${NC}"
  exit 1
fi

echo "Output files:"
ls -la out/ | head -20

echo "${GREEN}✓ Output structure verified${NC}"

# Step 5: Copy assets to Tauri public directory
echo ""
echo "${YELLOW}Step 5: Copying assets to Tauri${NC}"
node vibing2-desktop/scripts/copy-assets.js

# Check if copy was successful
if [ ! -f "vibing2-desktop/public/index.html" ]; then
  echo "${RED}✗ Assets not copied successfully${NC}"
  exit 1
fi

echo "${GREEN}✓ Assets copied to Tauri public directory${NC}"

# Step 6: Final verification
echo ""
echo "${YELLOW}Step 6: Final verification${NC}"
echo "Checking Tauri public directory:"
ls -la vibing2-desktop/public/ | head -20

echo ""
echo "${GREEN}========================================${NC}"
echo "${GREEN}✅ Desktop build completed successfully!${NC}"
echo "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. cd vibing2-desktop"
echo "  2. npm run tauri dev    # Test in development"
echo "  3. npm run tauri build  # Create production build"
echo ""

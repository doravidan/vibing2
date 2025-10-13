#!/bin/bash
# Build script for standalone Vibing2 desktop application

set -e

echo "🚀 Building Vibing2 Standalone Desktop Application"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from vibing2 root directory${NC}"
    exit 1
fi

echo "📦 Step 1: Building Next.js application in static mode..."

# Set environment for static export
export BUILD_MODE=desktop
export NEXT_PUBLIC_BUILD_MODE=desktop

# Clean previous builds
rm -rf out
rm -rf vibing2-desktop/static

# Build Next.js application
echo "   Building Next.js..."
pnpm run build

# Check if build succeeded
if [ ! -d "out" ]; then
    echo -e "${RED}Error: Next.js build failed. 'out' directory not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Next.js build complete${NC}"

echo "📂 Step 2: Copying static files to desktop app..."

# Create static directory in desktop app
mkdir -p vibing2-desktop/static

# Copy built files to desktop app
cp -r out/* vibing2-desktop/static/

echo -e "${GREEN}✓ Static files copied${NC}"

echo "🦀 Step 3: Building Rust application..."

cd vibing2-desktop/src-tauri

# Build Rust application
cargo build --release

echo -e "${GREEN}✓ Rust build complete${NC}"

echo "🎯 Step 4: Creating Tauri bundle..."

# Build Tauri bundle
cargo tauri build

echo -e "${GREEN}✓ Tauri bundle created${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}✅ Build Complete!${NC}"
echo "========================================="
echo ""
echo "📍 Output locations:"
echo "   - macOS: vibing2-desktop/src-tauri/target/release/bundle/macos/"
echo "   - Windows: vibing2-desktop/src-tauri/target/release/bundle/windows/"
echo "   - Linux: vibing2-desktop/src-tauri/target/release/bundle/"
echo ""
echo "🚀 To test the application:"
echo "   macOS: open vibing2-desktop/src-tauri/target/release/bundle/macos/Vibing2.app"
echo "   Windows: vibing2-desktop\\src-tauri\\target\\release\\bundle\\windows\\Vibing2.exe"
echo ""
echo "📊 Bundle size analysis:"

# Show bundle sizes
if [ -f "vibing2-desktop/src-tauri/target/release/bundle/macos/Vibing2.app" ]; then
    SIZE=$(du -sh vibing2-desktop/src-tauri/target/release/bundle/macos/Vibing2.app | cut -f1)
    echo "   macOS app size: $SIZE"
fi

echo ""
echo "✨ Done!"
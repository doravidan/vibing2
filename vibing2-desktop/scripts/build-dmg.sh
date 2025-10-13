#!/bin/bash
set -e

# Vibing2 DMG Builder
# Professional macOS installer build script with validation and optimization

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DESKTOP_DIR")"
TAURI_DIR="$DESKTOP_DIR/src-tauri"
DIST_DIR="$DESKTOP_DIR/dist"
BUILD_DIR="$TAURI_DIR/target/release"
BUNDLE_DIR="$BUILD_DIR/bundle/dmg"

# Load version from tauri.conf.json
VERSION=$(node -p "require('$TAURI_DIR/tauri.conf.json').version")
APP_NAME="Vibing2"
BUNDLE_ID="com.vibing2.desktop"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Vibing2 DMG Build System${NC}"
echo -e "${BLUE}  Version: $VERSION${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function: Print status
print_status() {
  echo -e "${GREEN}[BUILD]${NC} $1"
}

# Function: Print error
print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function: Print warning
print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Step 1: Validate environment
print_status "Validating build environment..."

if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  print_error "pnpm is not installed"
  exit 1
fi

if ! command -v cargo &> /dev/null; then
  print_error "Rust/Cargo is not installed"
  exit 1
fi

# Check for Tauri CLI
if ! command -v cargo-tauri &> /dev/null; then
  print_warning "Tauri CLI not found globally, installing..."
  cargo install tauri-cli
fi

# Step 2: Clean previous builds
print_status "Cleaning previous builds..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
rm -rf "$BUILD_DIR"

# Step 3: Install dependencies
print_status "Installing dependencies..."
cd "$PROJECT_ROOT"
pnpm install --frozen-lockfile

cd "$DESKTOP_DIR"
pnpm install --frozen-lockfile

# Step 4: Build Next.js application
print_status "Building Next.js application..."
cd "$PROJECT_ROOT"
BUILD_MODE=desktop pnpm run build

# Step 5: Copy assets to desktop public folder
print_status "Copying Next.js build to desktop..."
node "$DESKTOP_DIR/scripts/copy-assets.js"

# Step 6: Run pre-build checks
print_status "Running pre-build validation..."

# Check if icon files exist
ICON_DIR="$TAURI_DIR/icons"
if [ ! -f "$ICON_DIR/icon.icns" ]; then
  print_error "macOS icon file not found: $ICON_DIR/icon.icns"
  exit 1
fi

# Validate tauri.conf.json
if ! node -e "require('$TAURI_DIR/tauri.conf.json')" 2>/dev/null; then
  print_error "Invalid tauri.conf.json"
  exit 1
fi

# Step 7: Build Tauri application
print_status "Building Tauri application (this may take several minutes)..."
cd "$DESKTOP_DIR"

# Build with release profile
cargo tauri build --verbose

# Step 8: Verify build outputs
print_status "Verifying build outputs..."

APP_PATH="$BUILD_DIR/bundle/macos/$APP_NAME.app"
DMG_PATH="$BUNDLE_DIR/$APP_NAME-$VERSION.dmg"

if [ ! -d "$APP_PATH" ]; then
  print_error "Application bundle not found at: $APP_PATH"
  exit 1
fi

if [ ! -f "$DMG_PATH" ]; then
  print_error "DMG file not found at: $DMG_PATH"
  exit 1
fi

# Step 9: Calculate bundle size
print_status "Analyzing bundle size..."
APP_SIZE=$(du -sh "$APP_PATH" | cut -f1)
DMG_SIZE=$(du -sh "$DMG_PATH" | cut -f1)

echo ""
echo -e "${GREEN}Bundle Analysis:${NC}"
echo -e "  App Bundle:  $APP_SIZE"
echo -e "  DMG File:    $DMG_SIZE"
echo ""

# Step 10: Copy to dist directory
print_status "Copying build artifacts to dist..."
cp -R "$APP_PATH" "$DIST_DIR/"
cp "$DMG_PATH" "$DIST_DIR/"

# Create a universal DMG filename for easier distribution
UNIVERSAL_DMG="$DIST_DIR/$APP_NAME-macos.dmg"
cp "$DMG_PATH" "$UNIVERSAL_DMG"

# Step 11: Generate checksums
print_status "Generating checksums..."
cd "$DIST_DIR"

shasum -a 256 "$APP_NAME-$VERSION.dmg" > "$APP_NAME-$VERSION.dmg.sha256"
shasum -a 256 "$APP_NAME-macos.dmg" > "$APP_NAME-macos.dmg.sha256"

# Step 12: Create build manifest
print_status "Creating build manifest..."

cat > "$DIST_DIR/build-manifest.json" << EOF
{
  "version": "$VERSION",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platform": "darwin",
  "architecture": "$(uname -m)",
  "bundleId": "$BUNDLE_ID",
  "files": {
    "app": {
      "path": "$APP_NAME.app",
      "size": "$APP_SIZE"
    },
    "dmg": {
      "path": "$APP_NAME-$VERSION.dmg",
      "size": "$DMG_SIZE",
      "sha256": "$(cat "$APP_NAME-$VERSION.dmg.sha256" | cut -d' ' -f1)"
    },
    "dmgUniversal": {
      "path": "$APP_NAME-macos.dmg",
      "size": "$DMG_SIZE",
      "sha256": "$(cat "$APP_NAME-macos.dmg.sha256" | cut -d' ' -f1)"
    }
  },
  "nodejs": "$(node --version)",
  "pnpm": "$(pnpm --version)",
  "rustc": "$(rustc --version | cut -d' ' -f2)",
  "tauri": "$(cargo tauri --version | cut -d' ' -f2)"
}
EOF

# Step 13: Generate release notes
print_status "Generating release notes..."

RELEASE_NOTES="$DIST_DIR/RELEASE_NOTES.md"
cat > "$RELEASE_NOTES" << EOF
# Vibing2 v$VERSION - macOS Release

**Build Date:** $(date +"%B %d, %Y")
**Platform:** macOS 11.0+
**Architecture:** Universal (Intel + Apple Silicon)

## Installation

1. Download \`$APP_NAME-macos.dmg\`
2. Open the DMG file
3. Drag Vibing2 to your Applications folder
4. Launch from Applications

## What's New

See [CHANGELOG.md](https://github.com/vibing2/vibing2/blob/main/CHANGELOG.md) for detailed changes.

## Verification

Verify the download integrity:

\`\`\`bash
shasum -a 256 $APP_NAME-macos.dmg
# Should match: $(cat "$APP_NAME-macos.dmg.sha256" | cut -d' ' -f1)
\`\`\`

## Bundle Information

- **App Size:** $APP_SIZE
- **DMG Size:** $DMG_SIZE
- **Bundle ID:** $BUNDLE_ID
- **Minimum macOS:** 11.0 (Big Sur)

## System Requirements

- macOS 11.0 (Big Sur) or later
- 4GB RAM (8GB recommended)
- 500MB free disk space
- Internet connection for AI features

## Support

- Documentation: https://vibing2.com/docs
- Issues: https://github.com/vibing2/vibing2/issues
- Discord: https://discord.gg/vibing2

---

Built with Tauri, Next.js, and React
EOF

# Step 14: Print success summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "Output Directory: ${BLUE}$DIST_DIR${NC}\n"
echo -e "Build Artifacts:"
echo -e "  ${GREEN}✓${NC} $APP_NAME.app"
echo -e "  ${GREEN}✓${NC} $APP_NAME-$VERSION.dmg"
echo -e "  ${GREEN}✓${NC} $APP_NAME-macos.dmg"
echo -e "  ${GREEN}✓${NC} Checksums (SHA-256)"
echo -e "  ${GREEN}✓${NC} Build manifest"
echo -e "  ${GREEN}✓${NC} Release notes\n"
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Test the application: open '$DIST_DIR/$APP_NAME.app'"
echo -e "  2. Test the DMG installer: open '$UNIVERSAL_DMG'"
echo -e "  3. Code sign: ./scripts/sign-and-notarize.sh"
echo -e "  4. Upload to GitHub: gh release create v$VERSION '$UNIVERSAL_DMG'\n"

# Step 15: Optional - Open dist directory
if [ "$1" == "--open" ]; then
  print_status "Opening dist directory..."
  open "$DIST_DIR"
fi

exit 0

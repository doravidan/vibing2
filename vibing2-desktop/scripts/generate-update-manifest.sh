#!/bin/bash
set -e

# Vibing2 Update Manifest Generator
# Generates update manifest for Tauri updater

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$DESKTOP_DIR/dist"

# Load version
VERSION=$(node -p "require('$DESKTOP_DIR/src-tauri/tauri.conf.json').version")
REPO="vibing2/vibing2"

echo -e "${BLUE}Generating update manifest for v$VERSION${NC}"

# Create update manifest
cat > "$DIST_DIR/latest.json" << EOF
{
  "version": "$VERSION",
  "date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platforms": {
    "darwin-x86_64": {
      "url": "https://github.com/$REPO/releases/download/v$VERSION/Vibing2-x86_64-apple-darwin-$VERSION.dmg",
      "signature": ""
    },
    "darwin-aarch64": {
      "url": "https://github.com/$REPO/releases/download/v$VERSION/Vibing2-aarch64-apple-darwin-$VERSION.dmg",
      "signature": ""
    }
  },
  "notes": "See release notes at https://github.com/$REPO/releases/tag/v$VERSION"
}
EOF

echo -e "${GREEN}Update manifest created: $DIST_DIR/latest.json${NC}"
